import { db } from "@/db"
import { employees, metrics, tasks, metricConfigs } from "@/db/schema"
import { eq, sql, and, gte, lt, isNull, desc } from "drizzle-orm"
import type {
  DashboardSummary,
  TeamStatus,
  KpiItem,
  TeamEfficiencyPoint,
  HeatmapEntry,
  RecentTaskEntry,
} from "./dashboard-types"

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
      healthRate: total > 0 ? Math.round((active / total) * 100) : 0,
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
  const startTs = new Date(startEpoch * 1000)
  const endTs = new Date(endEpoch * 1000)

  const activityRows = await db
    .select({
      employeeId: tasks.employeeId,
      employeeName: employees.name,
      team: employees.team,
      date: sql<string>`date(${tasks.actualEndTime} / 1000, 'unixepoch')`,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(
      and(
        eq(tasks.status, "completed"),
        gte(tasks.actualEndTime, startTs),
        lt(tasks.actualEndTime, endTs)
      )
    )
    .groupBy(tasks.employeeId, sql`date(${tasks.actualEndTime} / 1000, 'unixepoch')`)

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
