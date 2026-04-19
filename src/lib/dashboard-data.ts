import { db } from "@/db"
import { employees, metrics, tasks, metricConfigs, skills } from "@/db/schema"
import { calculateTaskXp, calculateStreakXp, calculateStreak, calculateTotalXp, calculateLevel, calculateAchievements } from "@/lib/gamification"
import { eq, sql, and, isNull, desc } from "drizzle-orm"
import type {
  DashboardSummary,
  TeamStatus,
  KpiItem,
  TeamEfficiencyPoint,
  HeatmapEntry,
  LeaderboardEntry,
  RecentTaskEntry,
} from "./dashboard-types"
import type { TeamType } from "@/lib/types"

function calcTrend(
  current: number,
  prev: number
): { trendPct: number; trendDirection: "up" | "down" | "neutral" } {
  if (prev === 0) {
    return { trendPct: 0, trendDirection: "neutral" }
  }
  const pct = Math.round(((current - prev) / prev) * 100)
  const trendDirection: "up" | "down" | "neutral" =
    pct > 0 ? "up" : pct < 0 ? "down" : "neutral"
  return { trendPct: Math.abs(pct), trendDirection }
}

export async function getDashboardSummary(currentMonth: string): Promise<DashboardSummary> {
  const [monthlyAgg, taskAgg, globalConfig] = await Promise.all([
    db
      .select({
        totalTasks: sql<number>`sum(${metrics.taskCount})`,
        avgAccuracy: sql<number>`avg(${metrics.accuracyRate})`,
        totalHoursSaved: sql<number>`sum(${metrics.humanTimeSaved})`,
        avgAdoption: sql<number>`avg(${metrics.adoptionRate})`,
      })
      .from(metrics)
      .where(and(eq(metrics.period, currentMonth), eq(metrics.periodType, "monthly")))
      .get(),
    db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when ${tasks.status} = 'completed' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${tasks.status} = 'failed' then 1 else 0 end)`,
      })
      .from(tasks)
      .get(),
    db
      .select({ costPerHour: metricConfigs.costPerHour })
      .from(metricConfigs)
      .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
      .get(),
  ])

  const hoursSaved = monthlyAgg?.totalHoursSaved ?? 0
  const costPerHour = globalConfig?.costPerHour ?? 46.875
  const savedCost = Math.round(hoursSaved * costPerHour)

  const totalTasks = taskAgg?.total ?? 0
  const completedTasks = taskAgg?.completed ?? 0
  const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const adoptionRate = monthlyAgg?.avgAdoption ?? 0
  const accuracyRate = monthlyAgg?.avgAccuracy ?? 0
  const operationalIndex = Math.round(((adoptionRate + accuracyRate) / 2) * 100)

  return {
    operationalIndex,
    monthlyTaskCount: monthlyAgg?.totalTasks ?? 0,
    successRate,
    savedCost,
    costPerHour,
  }
}

export async function getTeamStatus(): Promise<TeamStatus[]> {
  const rows = await db
    .select({
      team: employees.team,
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
    })
    .from(employees)
    .groupBy(employees.team)

  const TEAM_LABEL: Record<string, string> = {
    management: "管理团队",
    design: "设计师团队",
    production: "生产团队",
  }

  return rows.map((r) => {
    const total = r.total ?? 0
    const active = r.active ?? 0
    return {
      team: r.team as "management" | "design" | "production",
      teamLabel: TEAM_LABEL[r.team] ?? r.team,
      activeCount: active,
      totalCount: total,
      healthRate: total > 0 ? active / total : 0,
    }
  })
}

export async function getKpiData(
  currentMonth: string,
  prevMonth: string
): Promise<KpiItem[]> {
  const [curr, prev] = await Promise.all([
    db
      .select({
        totalTasks: sql<number>`sum(${metrics.taskCount})`,
        avgAdoption: sql<number>`avg(${metrics.adoptionRate})`,
        avgAccuracy: sql<number>`avg(${metrics.accuracyRate})`,
        totalHoursSaved: sql<number>`sum(${metrics.humanTimeSaved})`,
      })
      .from(metrics)
      .where(and(eq(metrics.period, currentMonth), eq(metrics.periodType, "monthly")))
      .get(),
    db
      .select({
        totalTasks: sql<number>`sum(${metrics.taskCount})`,
        avgAdoption: sql<number>`avg(${metrics.adoptionRate})`,
        avgAccuracy: sql<number>`avg(${metrics.accuracyRate})`,
        totalHoursSaved: sql<number>`sum(${metrics.humanTimeSaved})`,
      })
      .from(metrics)
      .where(and(eq(metrics.period, prevMonth), eq(metrics.periodType, "monthly")))
      .get(),
  ])

  const globalConfig = await db
    .select({ costPerHour: metricConfigs.costPerHour })
    .from(metricConfigs)
    .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
    .get()

  const costPerHour = globalConfig?.costPerHour ?? 46.875

  const currTasks = curr?.totalTasks ?? 0
  const prevTasks = prev?.totalTasks ?? 0
  const currAdoption = Math.round((curr?.avgAdoption ?? 0) * 100)
  const prevAdoption = Math.round((prev?.avgAdoption ?? 0) * 100)
  const currAccuracy = Math.round((curr?.avgAccuracy ?? 0) * 100)
  const prevAccuracy = Math.round((prev?.avgAccuracy ?? 0) * 100)
  const currHoursSaved = Math.round((curr?.totalHoursSaved ?? 0) * 10) / 10
  const prevHoursSaved = Math.round((prev?.totalHoursSaved ?? 0) * 10) / 10
  const currCostSaved = Math.round((curr?.totalHoursSaved ?? 0) * costPerHour)
  const prevCostSaved = Math.round((prev?.totalHoursSaved ?? 0) * costPerHour)

  const tasksTrend = calcTrend(currTasks, prevTasks)
  const adoptionTrend = calcTrend(currAdoption, prevAdoption)
  const accuracyTrend = calcTrend(currAccuracy, prevAccuracy)
  const hoursTrend = calcTrend(currHoursSaved, prevHoursSaved)
  const costTrend = calcTrend(currCostSaved, prevCostSaved)

  const items: KpiItem[] = [
    {
      key: "taskCount",
      label: "本月任务量",
      emoji: "📋",
      value: currTasks,
      displaySuffix: " 个",
      displayPrefix: "",
      prevValue: prevTasks,
      ...tasksTrend,
      href: "/production",
    },
    {
      key: "adoptionRate",
      label: "工具采用率",
      emoji: "🎯",
      value: currAdoption,
      displaySuffix: "%",
      displayPrefix: "",
      prevValue: prevAdoption,
      ...adoptionTrend,
      href: null,
    },
    {
      key: "accuracyRate",
      label: "任务准确率",
      emoji: "✅",
      value: currAccuracy,
      displaySuffix: "%",
      displayPrefix: "",
      prevValue: prevAccuracy,
      ...accuracyTrend,
      href: null,
    },
    {
      key: "hoursSaved",
      label: "节省人工时",
      emoji: "⏱️",
      value: currHoursSaved,
      displaySuffix: " h",
      displayPrefix: "",
      prevValue: prevHoursSaved,
      ...hoursTrend,
      href: null,
    },
    {
      key: "costSaved",
      label: "节省人力成本",
      emoji: "💰",
      value: currCostSaved,
      displaySuffix: " 元",
      displayPrefix: "¥",
      prevValue: prevCostSaved,
      ...costTrend,
      href: null,
    },
  ]

  return items
}

export async function getTeamEfficiencyTrend(months: string[]): Promise<TeamEfficiencyPoint[]> {
  if (months.length === 0) return []

  const result: TeamEfficiencyPoint[] = await Promise.all(
    months.map(async (month) => {
      const monthRows = await db
        .select({
          team: employees.team,
          totalTasks: sql<number>`sum(${metrics.taskCount})`,
        })
        .from(metrics)
        .innerJoin(employees, eq(metrics.employeeId, employees.id))
        .where(and(eq(metrics.period, month), eq(metrics.periodType, "monthly")))
        .groupBy(employees.team)

      const point: TeamEfficiencyPoint = { month, management: 0, design: 0, production: 0 }
      for (const row of monthRows) {
        if (row.team === "management") point.management = row.totalTasks ?? 0
        else if (row.team === "design") point.design = row.totalTasks ?? 0
        else if (row.team === "production") point.production = row.totalTasks ?? 0
      }
      return point
    })
  )

  return result
}

export async function getHeatmapData(startDate: string, endDate: string): Promise<HeatmapEntry[]> {
  const startEpoch = Math.floor(new Date(startDate + "T00:00:00Z").getTime() / 1000)
  const endEpoch = Math.floor(new Date(endDate + "T23:59:59Z").getTime() / 1000)

  const activityRows = await db
    .select({
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      team: employees.team,
      date: sql<string>`date(${tasks.actualEndTime}, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(
      and(
        eq(tasks.status, "completed"),
        sql`${tasks.actualEndTime} >= ${startEpoch} AND ${tasks.actualEndTime} <= ${endEpoch}`
      )
    )
    .groupBy(tasks.employeeId, sql`date(${tasks.actualEndTime}, 'unixepoch')`)

  return activityRows.map((r) => ({
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    team: r.team,
    date: r.date,
    count: r.count ?? 0,
  }))
}

export async function getRecentTasks(limit: number): Promise<RecentTaskEntry[]> {
  const rows = await db
    .select({
      id: tasks.id,
      name: tasks.name,
      status: tasks.status,
      employeeName: employees.name,
      team: tasks.team,
      qualityScore: tasks.qualityScore,
      tokenUsage: tasks.tokenUsage,
      startTime: tasks.startTime,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(desc(tasks.startTime))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status as "running" | "completed" | "failed",
    employeeName: r.employeeName,
    team: r.team,
    qualityScore: r.qualityScore ?? null,
    tokenUsage: r.tokenUsage ?? null,
    startTime: r.startTime ? Math.floor(r.startTime.getTime() / 1000) : null,
  }))
}

// ─── Gamification Queries ──────────────────────────────────────────────────

interface GamificationRawData {
  employees: { id: string; name: string; team: TeamType; avatar: string | null }[]
  tasksByEmployee: Map<string, { qualityScore: number | null; status: string; startTime: number | null; type: string }[]>
  skillCountByEmployee: Map<string, number>
  activeDaysByEmployee: Map<string, string[]>
}

export async function getGamificationData(): Promise<GamificationRawData> {
  const employeeRows = await db
    .select({ id: employees.id, name: employees.name, team: employees.team, avatar: employees.avatar })
    .from(employees)

  const allTasks = await db
    .select({ employeeId: tasks.employeeId, qualityScore: tasks.qualityScore, status: tasks.status, startTime: tasks.startTime, type: tasks.type })
    .from(tasks)

  const skillRows = await db
    .select({ employeeId: skills.employeeId })
    .from(skills)

  const tasksByEmployee = new Map<string, { qualityScore: number | null; status: string; startTime: number | null; type: string }[]>()
  const activeDaySets = new Map<string, Set<string>>()

  for (const t of allTasks) {
    if (!t.employeeId) continue
    if (!tasksByEmployee.has(t.employeeId)) tasksByEmployee.set(t.employeeId, [])
    const startTimeMs = t.startTime ? t.startTime.getTime() : null
    tasksByEmployee.get(t.employeeId)!.push({
      qualityScore: t.qualityScore,
      status: t.status,
      startTime: startTimeMs,
      type: t.type,
    })
    if (t.startTime) {
      const dayStr = t.startTime.toISOString().slice(0, 10)
      if (!activeDaySets.has(t.employeeId)) activeDaySets.set(t.employeeId, new Set())
      activeDaySets.get(t.employeeId)!.add(dayStr)
    }
  }

  const skillCountByEmployee = new Map<string, number>()
  for (const s of skillRows) {
    if (!s.employeeId) continue
    skillCountByEmployee.set(s.employeeId, (skillCountByEmployee.get(s.employeeId) ?? 0) + 1)
  }

  const activeDaysByEmployee = new Map<string, string[]>()
  for (const [empId, days] of activeDaySets) {
    activeDaysByEmployee.set(empId, [...days])
  }

  return {
    employees: employeeRows as { id: string; name: string; team: TeamType; avatar: string | null }[],
    tasksByEmployee,
    skillCountByEmployee,
    activeDaysByEmployee,
  }
}

export interface AchievementFeedEntry {
  employeeId: string
  employeeName: string
  team: TeamType
  achievementKey: string
  achievementName: string
  achievementEmoji: string
  earnedAt: string
}

export function computeLeaderboard(raw: GamificationRawData, _period: "week" | "month"): LeaderboardEntry[] {
  const xpMap = new Map<string, number>()
  for (const emp of raw.employees) {
    const empTasks = raw.tasksByEmployee.get(emp.id) ?? []
    const completedTasks = empTasks.filter((t) => t.status === "completed")
    const activeDays = raw.activeDaysByEmployee.get(emp.id) ?? []
    const streak = calculateStreak(activeDays)
    const taskXp = calculateTaskXp(completedTasks)
    const streakXp = calculateStreakXp(streak, activeDays.length)
    xpMap.set(emp.id, calculateTotalXp(taskXp, streakXp))
  }

  const entries: LeaderboardEntry[] = raw.employees.map((emp) => {
    const totalXp = xpMap.get(emp.id) ?? 0
    const levelInfo = calculateLevel(totalXp)
    return {
      employeeId: emp.id,
      employeeName: emp.name,
      team: emp.team,
      avatar: emp.avatar,
      xp: Math.round(totalXp),
      level: levelInfo.level,
      levelEmoji: levelInfo.emoji,
      levelColor: levelInfo.color,
      rankChange: 0,
    }
  })

  entries.sort((a, b) => b.xp - a.xp)
  return entries.slice(0, 5)
}

export function computeRecentAchievements(raw: GamificationRawData, limit: number): AchievementFeedEntry[] {
  const xpMap = new Map<string, number>()
  for (const emp of raw.employees) {
    const empTasks = raw.tasksByEmployee.get(emp.id) ?? []
    const completedTasks = empTasks.filter((t) => t.status === "completed")
    const activeDays = raw.activeDaysByEmployee.get(emp.id) ?? []
    const streak = calculateStreak(activeDays)
    const taskXp = calculateTaskXp(completedTasks)
    const streakXp = calculateStreakXp(streak, activeDays.length)
    xpMap.set(emp.id, calculateTotalXp(taskXp, streakXp))
  }
  const maxXp = Math.max(...xpMap.values(), 0)

  const allEarned: AchievementFeedEntry[] = []

  for (const emp of raw.employees) {
    const empTasks = raw.tasksByEmployee.get(emp.id) ?? []
    const activeDays = raw.activeDaysByEmployee.get(emp.id) ?? []
    const streak = calculateStreak(activeDays)
    const completedTasks = empTasks.filter((t) => t.status === "completed")
    const taskXp = calculateTaskXp(completedTasks)
    const streakXp = calculateStreakXp(streak, activeDays.length)
    const totalXp = calculateTotalXp(taskXp, streakXp)
    const levelInfo = calculateLevel(totalXp)
    const skillCount = raw.skillCountByEmployee.get(emp.id) ?? 0
    const isMvp = xpMap.get(emp.id) === maxXp && maxXp > 0

    const achievements = calculateAchievements({
      tasks: empTasks,
      skillCount,
      currentLevel: levelInfo.level,
      monthStartLevel: Math.max(1, levelInfo.level - 1),
      streak,
      isMvp,
    })

    for (const ach of achievements) {
      if (ach.earned && ach.earnedAt) {
        allEarned.push({
          employeeId: emp.id,
          employeeName: emp.name,
          team: emp.team,
          achievementKey: ach.key,
          achievementName: ach.name,
          achievementEmoji: ach.emoji,
          earnedAt: ach.earnedAt,
        })
      }
    }
  }

  allEarned.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
  return allEarned.slice(0, limit)
}
