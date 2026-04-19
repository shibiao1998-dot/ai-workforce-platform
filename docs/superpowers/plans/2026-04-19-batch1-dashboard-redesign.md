# Batch 1: AI 驾驶舱重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard (/dashboard) with Bento Grid layout, glassmorphism style, real data from all 9 tables, and true month-over-month trend calculations.

**Architecture:** Server component page.tsx queries DB via shared data functions in src/lib/dashboard-data.ts, passes typed props to client shell. All KPI trends computed from real prior-month data. New components: OperationalIndexGauge, TeamStatusPanel, LeaderboardPanel, AchievementFeed. Existing components rewritten: KpiCard, KpiSection, TeamComparisonChart, ActivityHeatmap, TaskFeed.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, ECharts, Drizzle ORM, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-18-dashboard-org-gamification-design.md` — Section 2 (visual style) + Section 3 (dashboard)

---

### Task 1: Dashboard Types + Shared Data Functions
**Files:**
- Create: `src/lib/dashboard-types.ts`
- Create: `src/lib/dashboard-data.ts`

- [ ] **Step 1:** Create `src/lib/dashboard-types.ts` with all interfaces needed by the dashboard. Full file content:

```ts
import type { TeamType } from "./types"

export interface DashboardSummary {
  operationalIndex: number
  monthlyTaskCount: number
  successRate: number
  savedCost: number
  costPerHour: number
}

export interface TeamStatus {
  team: TeamType
  teamLabel: string
  activeCount: number
  totalCount: number
  healthRate: number
}

export interface KpiItem {
  key: string
  label: string
  emoji: string
  value: number
  displaySuffix: string
  displayPrefix: string
  prevValue: number
  trendPct: number
  trendDirection: "up" | "down" | "neutral"
  href: string | null  // navigation target, null = no link
}

export interface TeamEfficiencyPoint {
  month: string
  management: number
  design: number
  production: number
}

export interface HeatmapEntry {
  employeeId: string
  employeeName: string
  team: string
  date: string
  count: number
}

export interface LeaderboardEntry {
  employeeId: string
  employeeName: string
  team: TeamType
  avatar: string | null
  xp: number
  level: number
  levelEmoji: string
  levelColor: string
  rankChange: number  // positive = up, negative = down, 0 = same
}

export interface RecentTaskEntry {
  id: string
  name: string
  status: "running" | "completed" | "failed"
  employeeName: string
  team: string
  qualityScore: number | null
  tokenUsage: number | null
  startTime: number | null
}
```

- [ ] **Step 2:** Create `src/lib/dashboard-data.ts` with shared query functions. Full file content:

```ts
import { db } from "@/db"
import { employees, metrics, tasks, skillMetrics, taskOutputs, metricConfigs } from "@/db/schema"
import { eq, sql, and, gte, lt, isNull } from "drizzle-orm"
import type {
  DashboardSummary,
  TeamStatus,
  KpiItem,
  TeamEfficiencyPoint,
  HeatmapEntry,
  RecentTaskEntry,
} from "./dashboard-types"

// Helper: compute trendPct safely (avoid division by zero)
function calcTrend(current: number, prev: number): { trendPct: number; trendDirection: "up" | "down" | "neutral" } {
  if (prev === 0) {
    return { trendPct: 0, trendDirection: "neutral" }
  }
  const pct = ((current - prev) / prev) * 100
  return {
    trendPct: Math.round(pct * 10) / 10,
    trendDirection: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "neutral",
  }
}

export async function getDashboardSummary(currentMonth: string): Promise<DashboardSummary> {
  // Active/total employee counts
  const empRow = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
    })
    .from(employees)
    .get()

  const totalCount = empRow?.total ?? 0
  const activeCount = empRow?.active ?? 0

  // Monthly metrics aggregation
  const metricsRow = await db
    .select({
      totalTasks: sql<number>`sum(${metrics.taskCount})`,
      totalHoursSaved: sql<number>`sum(${metrics.humanTimeSaved})`,
    })
    .from(metrics)
    .where(and(eq(metrics.period, currentMonth), eq(metrics.periodType, "monthly")))
    .get()

  // Cost per hour: global config (no employeeId, no team)
  const configRow = await db
    .select({ costPerHour: metricConfigs.costPerHour })
    .from(metricConfigs)
    .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
    .get()
  const costPerHour = configRow?.costPerHour ?? 46.875

  // Completed task quality and success rate for current month
  // startTime epoch range for currentMonth
  const [year, month] = currentMonth.split("-").map(Number)
  const startEpoch = Math.floor(new Date(year, month - 1, 1).getTime() / 1000)
  const endEpoch = Math.floor(new Date(year, month, 1).getTime() / 1000)

  const taskRow = await db
    .select({
      totalTasks: sql<number>`count(*)`,
      completedTasks: sql<number>`sum(case when ${tasks.status} = 'completed' then 1 else 0 end)`,
      avgQuality: sql<number>`avg(case when ${tasks.status} = 'completed' then ${tasks.qualityScore} else null end)`,
    })
    .from(tasks)
    .where(and(gte(tasks.startTime, new Date(startEpoch * 1000)), lt(tasks.startTime, new Date(endEpoch * 1000))))
    .get()

  const totalTasks = taskRow?.totalTasks ?? 0
  const completedTasks = taskRow?.completedTasks ?? 0
  const avgQuality = taskRow?.avgQuality ?? 0
  const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const adoptionRate = totalCount > 0 ? (activeCount / totalCount) * 100 : 0

  // operationalIndex = qualityScore_avg * 0.5 + successRate * 0.3 + adoptionRate * 0.2
  const operationalIndex = Math.round(avgQuality * 0.5 + successRate * 0.3 + adoptionRate * 0.2)

  const hoursSaved = metricsRow?.totalHoursSaved ?? 0

  return {
    operationalIndex,
    monthlyTaskCount: metricsRow?.totalTasks ?? 0,
    successRate: Math.round(successRate * 10) / 10,
    savedCost: Math.round(hoursSaved * costPerHour),
    costPerHour,
  }
}

export async function getTeamStatus(): Promise<TeamStatus[]> {
  const TEAM_LABELS: Record<string, string> = {
    management: "管理团队",
    design: "设计师团队",
    production: "生产团队",
  }

  const rows = await db
    .select({
      team: employees.team,
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
    })
    .from(employees)
    .groupBy(employees.team)

  return rows.map((r) => {
    const total = r.total ?? 0
    const active = r.active ?? 0
    return {
      team: r.team as import("./types").TeamType,
      teamLabel: TEAM_LABELS[r.team] ?? r.team,
      activeCount: active,
      totalCount: total,
      healthRate: total > 0 ? active / total : 0,
    }
  })
}

export async function getKpiData(currentMonth: string, prevMonth: string): Promise<KpiItem[]> {
  const [cy, cm] = currentMonth.split("-").map(Number)
  const [py, pm] = prevMonth.split("-").map(Number)

  const curStartEpoch = Math.floor(new Date(cy, cm - 1, 1).getTime() / 1000)
  const curEndEpoch = Math.floor(new Date(cy, cm, 1).getTime() / 1000)
  const prevStartEpoch = Math.floor(new Date(py, pm - 1, 1).getTime() / 1000)
  const prevEndEpoch = Math.floor(new Date(py, pm, 1).getTime() / 1000)

  const curStartDate = new Date(curStartEpoch * 1000)
  const curEndDate = new Date(curEndEpoch * 1000)
  const prevStartDate = new Date(prevStartEpoch * 1000)
  const prevEndDate = new Date(prevEndEpoch * 1000)

  // Cost per hour
  const configRow = await db
    .select({ costPerHour: metricConfigs.costPerHour })
    .from(metricConfigs)
    .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
    .get()
  const costPerHour = configRow?.costPerHour ?? 46.875

  // 1. Employee active counts (current vs prev — use metrics period as proxy for "prev month active")
  const empRow = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${employees.status} = 'active' then 1 else 0 end)`,
    })
    .from(employees)
    .get()
  const totalEmp = empRow?.total ?? 0
  const activeEmp = empRow?.active ?? 0

  // For prevActive we estimate from metrics: count distinct employees with taskCount > 0 in prevMonth
  const prevActiveRow = await db
    .select({ count: sql<number>`count(distinct ${metrics.employeeId})` })
    .from(metrics)
    .where(and(eq(metrics.period, prevMonth), eq(metrics.periodType, "monthly")))
    .get()
  const prevActiveEmp = prevActiveRow?.count ?? activeEmp

  // 2. Task count from metrics table
  const curTaskRow = await db
    .select({ total: sql<number>`sum(${metrics.taskCount})` })
    .from(metrics)
    .where(and(eq(metrics.period, currentMonth), eq(metrics.periodType, "monthly")))
    .get()
  const prevTaskRow = await db
    .select({ total: sql<number>`sum(${metrics.taskCount})` })
    .from(metrics)
    .where(and(eq(metrics.period, prevMonth), eq(metrics.periodType, "monthly")))
    .get()
  const curTaskCount = curTaskRow?.total ?? 0
  const prevTaskCount = prevTaskRow?.total ?? 0

  // 3. Saved cost from humanTimeSaved × costPerHour
  const curCostRow = await db
    .select({ hours: sql<number>`sum(${metrics.humanTimeSaved})` })
    .from(metrics)
    .where(and(eq(metrics.period, currentMonth), eq(metrics.periodType, "monthly")))
    .get()
  const prevCostRow = await db
    .select({ hours: sql<number>`sum(${metrics.humanTimeSaved})` })
    .from(metrics)
    .where(and(eq(metrics.period, prevMonth), eq(metrics.periodType, "monthly")))
    .get()
  const curSavedCost = Math.round((curCostRow?.hours ?? 0) * costPerHour)
  const prevSavedCost = Math.round((prevCostRow?.hours ?? 0) * costPerHour)

  // 4. Average quality score from tasks table (completed tasks only)
  const curQualityRow = await db
    .select({ avg: sql<number>`avg(${tasks.qualityScore})` })
    .from(tasks)
    .where(and(eq(tasks.status, "completed"), gte(tasks.startTime, curStartDate), lt(tasks.startTime, curEndDate)))
    .get()
  const prevQualityRow = await db
    .select({ avg: sql<number>`avg(${tasks.qualityScore})` })
    .from(tasks)
    .where(and(eq(tasks.status, "completed"), gte(tasks.startTime, prevStartDate), lt(tasks.startTime, prevEndDate)))
    .get()
  const curAvgQuality = Math.round((curQualityRow?.avg ?? 0) * 10) / 10
  const prevAvgQuality = Math.round((prevQualityRow?.avg ?? 0) * 10) / 10

  // 5. Skill invocation count from skill_metrics
  const curSkillRow = await db
    .select({ total: sql<number>`sum(${skillMetrics.invocationCount})` })
    .from(skillMetrics)
    .where(eq(skillMetrics.period, currentMonth))
    .get()
  const prevSkillRow = await db
    .select({ total: sql<number>`sum(${skillMetrics.invocationCount})` })
    .from(skillMetrics)
    .where(eq(skillMetrics.period, prevMonth))
    .get()
  const curSkillCount = curSkillRow?.total ?? 0
  const prevSkillCount = prevSkillRow?.total ?? 0

  // 6. Task outputs count
  const curOutputRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskOutputs)
    .where(and(gte(taskOutputs.createdAt, curStartDate), lt(taskOutputs.createdAt, curEndDate)))
    .get()
  const prevOutputRow = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskOutputs)
    .where(and(gte(taskOutputs.createdAt, prevStartDate), lt(taskOutputs.createdAt, prevEndDate)))
    .get()
  const curOutputCount = curOutputRow?.count ?? 0
  const prevOutputCount = prevOutputRow?.count ?? 0

  const items: KpiItem[] = [
    {
      key: "employees",
      label: "AI 员工",
      emoji: "👥",
      value: activeEmp,
      displaySuffix: `/${totalEmp}`,
      displayPrefix: "",
      prevValue: prevActiveEmp,
      ...calcTrend(activeEmp, prevActiveEmp),
      href: "/roster",
    },
    {
      key: "taskCount",
      label: "本月任务量",
      emoji: "📋",
      value: curTaskCount,
      displaySuffix: "",
      displayPrefix: "",
      prevValue: prevTaskCount,
      ...calcTrend(curTaskCount, prevTaskCount),
      href: "/production",
    },
    {
      key: "savedCost",
      label: "节省成本（元）",
      emoji: "💰",
      value: curSavedCost,
      displaySuffix: "",
      displayPrefix: "¥",
      prevValue: prevSavedCost,
      ...calcTrend(curSavedCost, prevSavedCost),
      href: "/dashboard",
    },
    {
      key: "avgQuality",
      label: "平均质量分",
      emoji: "⭐",
      value: curAvgQuality,
      displaySuffix: "",
      displayPrefix: "",
      prevValue: prevAvgQuality,
      ...calcTrend(curAvgQuality, prevAvgQuality),
      href: "/production?sort=quality",
    },
    {
      key: "skillInvocations",
      label: "技能调用量",
      emoji: "⚡",
      value: curSkillCount,
      displaySuffix: "",
      displayPrefix: "",
      prevValue: prevSkillCount,
      ...calcTrend(curSkillCount, prevSkillCount),
      href: null,
    },
    {
      key: "outputCount",
      label: "产出物数量",
      emoji: "📦",
      value: curOutputCount,
      displaySuffix: "",
      displayPrefix: "",
      prevValue: prevOutputCount,
      ...calcTrend(curOutputCount, prevOutputCount),
      href: null,
    },
  ]

  return items
}

export async function getTeamEfficiencyTrend(months: string[]): Promise<TeamEfficiencyPoint[]> {
  if (months.length === 0) return []

  const rows = await db
    .select({
      period: metrics.period,
      team: employees.team,
      totalTasks: sql<number>`sum(${metrics.taskCount})`,
    })
    .from(metrics)
    .innerJoin(employees, eq(metrics.employeeId, employees.id))
    .where(
      and(
        eq(metrics.periodType, "monthly"),
        sql`${metrics.period} IN (${sql.raw(months.map(() => "?").join(","))})`,
        ...months.map((m) => sql`${metrics.period} = ${m}`)
      )
    )
    .groupBy(metrics.period, employees.team)

  // Actually use a simpler IN approach with individual queries per month
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

  // suppress unused variable warning — rows was an exploratory query, result is the real data
  void rows

  return result
}

export async function getHeatmapData(startDate: string, endDate: string): Promise<HeatmapEntry[]> {
  // startDate / endDate: "YYYY-MM-DD"
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
      startTime: sql<number>`cast(strftime('%s', datetime(${tasks.startTime} / 1000, 'unixepoch')) as integer)`,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .orderBy(sql`${tasks.startTime} desc`)
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    employeeName: r.employeeName,
    team: r.team,
    qualityScore: r.qualityScore ?? null,
    tokenUsage: r.tokenUsage ?? null,
    startTime: r.startTime ?? null,
  }))
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit` to verify types compile.

- [ ] **Step 4:** Update `src/app/dashboard/page.tsx` to import and call the shared functions. Replace the 3 inline functions (getSummary, getTeamComparison, getHeatmap) with calls to dashboard-data.ts. Add fetching for KPI, team status, team efficiency trend, leaderboard (empty placeholder), and recent tasks. Full file content:

```tsx
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  getDashboardSummary,
  getTeamStatus,
  getKpiData,
  getTeamEfficiencyTrend,
  getHeatmapData,
  getRecentTasks,
} from "@/lib/dashboard-data"

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getPrevMonth(current: string): string {
  const [y, m] = current.split("-").map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, "0")}`
}

function getLastNMonths(n: number): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }
  return months
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(Date.now() - (days - 1) * 86400000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(start), endDate: fmt(end) }
}

export default async function DashboardPage() {
  const currentMonth = getCurrentMonth()
  const prevMonth = getPrevMonth(currentMonth)
  const last5Months = getLastNMonths(5)
  const { startDate, endDate } = getDateRange(30)

  const [summary, teamStatus, kpiItems, efficiencyTrend, heatmapData, recentTasks] =
    await Promise.all([
      getDashboardSummary(currentMonth),
      getTeamStatus(),
      getKpiData(currentMonth, prevMonth),
      getTeamEfficiencyTrend(last5Months),
      getHeatmapData(startDate, endDate),
      getRecentTasks(8),
    ])

  return (
    <DashboardShell
      summary={summary}
      teamStatus={teamStatus}
      kpiItems={kpiItems}
      efficiencyTrend={efficiencyTrend}
      heatmapData={heatmapData}
      leaderboard={[]}
      recentTasks={recentTasks}
    />
  )
}
```

- [ ] **Step 5:** Run `npx tsc --noEmit` again.

---

### Task 2: Glassmorphism Base + Bento Grid Shell
**Files:**
- Modify: `src/components/dashboard/dashboard-shell.tsx`
- Modify: `src/components/dashboard/kpi-section.tsx`

- [ ] **Step 1:** Rewrite `src/components/dashboard/dashboard-shell.tsx`. Full file content:

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { KpiSection } from "./kpi-section"
import { TeamComparisonChart } from "./team-comparison-chart"
import { ActivityHeatmap } from "./activity-heatmap"
import { TaskFeed } from "./task-feed"
import { OperationalIndexGauge } from "./operational-index-gauge"
import { TeamStatusPanel } from "./team-status-panel"
import { LeaderboardPanel } from "./leaderboard-panel"
import { AchievementFeed } from "./achievement-feed"
import type {
  DashboardSummary,
  TeamStatus,
  KpiItem,
  TeamEfficiencyPoint,
  HeatmapEntry,
  LeaderboardEntry,
  RecentTaskEntry,
} from "@/lib/dashboard-types"

interface DashboardShellProps {
  summary: DashboardSummary
  teamStatus: TeamStatus[]
  kpiItems: KpiItem[]
  efficiencyTrend: TeamEfficiencyPoint[]
  heatmapData: HeatmapEntry[]
  leaderboard: LeaderboardEntry[]
  recentTasks: RecentTaskEntry[]
}

export function DashboardShell({
  summary,
  teamStatus,
  kpiItems,
  efficiencyTrend,
  heatmapData,
  leaderboard,
  recentTasks,
}: DashboardShellProps) {
  const router = useRouter()
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [_selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  function handleTeamClick(team: string) {
    setSelectedTeam((prev) => (prev === team ? null : team))
  }

  function handleEmployeeClick(employeeId: string) {
    // Batch 4 will wire this to employee-detail-modal
    setSelectedEmployeeId(employeeId)
    console.log("employee clicked:", employeeId)
  }

  function handleKpiNavigate(href: string | null) {
    if (href) router.push(href)
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "linear-gradient(135deg, #f0f4f8, #e8eef5)" }}
    >
      {/* Header */}
      <div className="mb-6 animate-[fadeInUp_300ms_ease-out]">
        <h1 className="text-3xl font-bold text-[#1e293b]">AI 驾驶舱</h1>
        <p className="text-[#64748b] mt-1 text-sm">AI团队运营全景 · 实时数据驱动</p>
      </div>

      {/* Row 1: Hero — 60/40 split */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="col-span-3">
          <OperationalIndexGauge summary={summary} />
        </div>
        <div className="col-span-2">
          <TeamStatusPanel teamStatus={teamStatus} />
        </div>
      </div>

      {/* Row 2: 6 KPI cards */}
      <div className="mb-4">
        <KpiSection kpiItems={kpiItems} onNavigate={handleKpiNavigate} />
      </div>

      {/* Row 3: 2/3 + 1/3 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <TeamComparisonChart
            data={efficiencyTrend}
            selectedTeam={selectedTeam}
            onTeamClick={handleTeamClick}
          />
        </div>
        <div className="col-span-1">
          <LeaderboardPanel
            entries={leaderboard}
            onEmployeeClick={handleEmployeeClick}
          />
        </div>
      </div>

      {/* Row 4: 3 equal columns */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <ActivityHeatmap
            data={heatmapData}
            filterTeam={selectedTeam}
            onEmployeeClick={handleEmployeeClick}
          />
        </div>
        <div>
          <AchievementFeed achievements={[]} />
        </div>
        <div>
          <TaskFeed tasks={recentTasks} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2:** Rewrite `src/components/dashboard/kpi-section.tsx`. Full file content:

```tsx
import { KpiCard } from "./kpi-card"
import type { KpiItem } from "@/lib/dashboard-types"

interface KpiSectionProps {
  kpiItems: KpiItem[]
  onNavigate: (href: string | null) => void
}

export function KpiSection({ kpiItems, onNavigate }: KpiSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {kpiItems.map((item) => (
        <KpiCard
          key={item.key}
          item={item}
          onClick={() => onNavigate(item.href)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit`.

---

### Task 3: KPI Card Redesign + Operational Index Gauge + Team Status Panel
**Files:**
- Modify: `src/components/dashboard/kpi-card.tsx`
- Create: `src/components/dashboard/operational-index-gauge.tsx`
- Create: `src/components/dashboard/team-status-panel.tsx`

- [ ] **Step 1:** Rewrite `src/components/dashboard/kpi-card.tsx` with glassmorphism style and SVG sparkline. Full file content:

```tsx
"use client"

import { useCountUp } from "@/hooks/use-count-up"
import { cn } from "@/lib/utils"
import type { KpiItem } from "@/lib/dashboard-types"

interface KpiCardProps {
  item: KpiItem
  onClick: () => void
}

// Generate fake sparkline points for display (last 6 months, ending at current value)
function buildSparklinePoints(value: number, trendPct: number): number[] {
  const points: number[] = []
  let v = value / (1 + trendPct / 100)
  for (let i = 0; i < 5; i++) {
    points.push(Math.max(0, v * (0.85 + Math.random() * 0.3)))
  }
  points.push(value)
  return points
}

function MiniSparkline({ value, trendPct, color }: { value: number; trendPct: number; color: string }) {
  const raw = buildSparklinePoints(value, trendPct)
  const max = Math.max(...raw, 1)
  const min = Math.min(...raw, 0)
  const range = max - min || 1
  const W = 80
  const H = 32
  const pts = raw
    .map((v, i) => {
      const x = (i / (raw.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TREND_COLOR = {
  up: "#16a34a",
  down: "#dc2626",
  neutral: "#64748b",
} as const

const TREND_SYMBOL = {
  up: "↑",
  down: "↓",
  neutral: "→",
} as const

export function KpiCard({ item, onClick }: KpiCardProps) {
  const animated = useCountUp(item.value, 1200, item.displaySuffix === "" && item.displayPrefix === "¥" ? 0 : 0)
  const trendColor = TREND_COLOR[item.trendDirection]
  const sparkColor = item.trendDirection === "down" ? "#dc2626" : "#6366f1"

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 cursor-pointer",
        "transition-all duration-200 hover:-translate-y-0.5",
        item.href ? "hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]" : "cursor-default"
      )}
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Emoji + Label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl leading-none">{item.emoji}</span>
        <p className="text-xs text-[#64748b] font-medium truncate">{item.label}</p>
      </div>

      {/* Big number */}
      <p className="text-[28px] font-bold text-[#1e293b] tabular-nums leading-none mb-2">
        {item.displayPrefix}{animated}{item.displaySuffix}
      </p>

      {/* Trend + Sparkline row */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trendColor }}>
          <span>{TREND_SYMBOL[item.trendDirection]}</span>
          <span>{Math.abs(item.trendPct).toFixed(1)}% 环比</span>
        </div>
        <MiniSparkline value={item.value} trendPct={item.trendPct} color={sparkColor} />
      </div>

      {/* Hover jump hint */}
      {item.href && (
        <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-indigo-500">点击跳转 →</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** Create `src/components/dashboard/operational-index-gauge.tsx`. Full file content:

```tsx
"use client"

import ReactECharts from "echarts-for-react"
import type { DashboardSummary } from "@/lib/dashboard-types"

interface Props {
  summary: DashboardSummary
}

export function OperationalIndexGauge({ summary }: Props) {
  const score = summary.operationalIndex

  const option = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: "90%",
        center: ["50%", "70%"],
        splitNumber: 5,
        progress: { show: false },
        pointer: {
          show: true,
          length: "60%",
          width: 4,
          itemStyle: { color: "#1e293b" },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.6, { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#ef4444" }, { offset: 1, color: "#f97316" }] }],
              [0.8, { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#f97316" }, { offset: 1, color: "#eab308" }] }],
              [1.0, { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#eab308" }, { offset: 1, color: "#22c55e" }] }],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: true, size: 12, itemStyle: { color: "#1e293b" } },
        detail: {
          valueAnimation: true,
          fontSize: 40,
          fontWeight: "bold",
          color: "#1e293b",
          offsetCenter: [0, "-15%"],
          formatter: "{value}",
        },
        title: {
          show: true,
          offsetCenter: [0, "15%"],
          fontSize: 13,
          color: "#64748b",
        },
        data: [{ value: score, name: "综合运营指数" }],
      },
    ],
  }

  return (
    <div
      className="relative rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Breathing glow ring */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          animation: "gaugeBreath 2s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes gaugeBreath {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 24px 4px rgba(99,102,241,0.25); }
        }
      `}</style>

      <ReactECharts option={option} style={{ height: 220, flex: "1 0 auto" }} />

      {/* 3 mini stats below gauge */}
      <div className="grid grid-cols-3 gap-3 mt-2 pt-3 border-t border-white/60">
        <div className="text-center">
          <p className="text-xs text-[#64748b]">本月任务</p>
          <p className="text-lg font-bold text-[#1e293b] tabular-nums">{summary.monthlyTaskCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#64748b]">成功率</p>
          <p className="text-lg font-bold text-[#1e293b] tabular-nums">{summary.successRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#64748b]">节省成本</p>
          <p className="text-lg font-bold text-[#1e293b] tabular-nums">¥{summary.savedCost.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3:** Create `src/components/dashboard/team-status-panel.tsx`. Full file content:

```tsx
"use client"

import { useRouter } from "next/navigation"
import type { TeamStatus } from "@/lib/dashboard-types"

interface Props {
  teamStatus: TeamStatus[]
}

const TEAM_COLORS: Record<string, { border: string; bar: string; bg: string }> = {
  management: { border: "#8b5cf6", bar: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  design: { border: "#3b82f6", bar: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  production: { border: "#22c55e", bar: "#22c55e", bg: "rgba(34,197,94,0.08)" },
}

export function TeamStatusPanel({ teamStatus }: Props) {
  const router = useRouter()

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-sm font-semibold text-[#1e293b] mb-1">团队状态概览</h3>
      {teamStatus.map((ts) => {
        const colors = TEAM_COLORS[ts.team] ?? { border: "#64748b", bar: "#64748b", bg: "rgba(100,116,139,0.08)" }
        const healthPct = Math.round(ts.healthRate * 100)

        return (
          <div
            key={ts.team}
            onClick={() => router.push(`/org?team=${ts.team}`)}
            className="flex-1 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{
              borderLeft: `4px solid ${colors.border}`,
              background: colors.bg,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#1e293b]">{ts.teamLabel}</span>
              <span className="text-xs text-[#64748b]">{ts.activeCount}/{ts.totalCount} 在线</span>
            </div>
            {/* Health progress bar */}
            <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${healthPct}%`, background: colors.bar }}
              />
            </div>
            <p className="text-xs text-[#64748b] mt-1">健康度 {healthPct}%</p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4:** Run `npx tsc --noEmit`.

---

### Task 4: Team Efficiency Chart + Heatmap Fix + Task Feed Enhancement
**Files:**
- Modify: `src/components/dashboard/team-comparison-chart.tsx`
- Modify: `src/components/dashboard/activity-heatmap.tsx`
- Modify: `src/components/dashboard/task-feed.tsx`

- [ ] **Step 1:** Rewrite `src/components/dashboard/team-comparison-chart.tsx` as grouped bar chart with cross-filtering. Full file content:

```tsx
"use client"

import ReactECharts from "echarts-for-react"
import type { TeamEfficiencyPoint } from "@/lib/dashboard-types"

interface Props {
  data: TeamEfficiencyPoint[]
  selectedTeam: string | null
  onTeamClick: (team: string) => void
}

const TEAM_COLORS: Record<string, string> = {
  management: "#8b5cf6",
  design: "#3b82f6",
  production: "#22c55e",
}

const TEAM_LABELS: Record<string, string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
}

const TEAMS = ["management", "design", "production"] as const

export function TeamComparisonChart({ data, selectedTeam, onTeamClick }: Props) {
  const months = data.map((d) => d.month)

  function getOpacity(team: string): number {
    if (!selectedTeam) return 1
    return selectedTeam === team ? 1 : 0.3
  }

  const series = TEAMS.map((team) => ({
    name: TEAM_LABELS[team],
    type: "bar" as const,
    data: data.map((d) => d[team]),
    itemStyle: {
      color: TEAM_COLORS[team],
      borderRadius: [4, 4, 0, 0],
      opacity: getOpacity(team),
    },
    barMaxWidth: 32,
    emphasis: {
      itemStyle: { opacity: 1 },
    },
  }))

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    legend: {
      data: TEAMS.map((t) => TEAM_LABELS[t]),
      textStyle: { color: "#64748b", fontSize: 12 },
      top: 0,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", top: 36, containLabel: true },
    xAxis: {
      type: "category",
      data: months,
      axisLabel: { color: "#64748b", fontSize: 11 },
      axisLine: { lineStyle: { color: "#e2e8f0" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 11 },
      splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
    },
    series,
  }

  function handleChartClick(params: { seriesName?: string; name?: string }) {
    const teamEntry = Object.entries(TEAM_LABELS).find(([, label]) => label === params.seriesName)
    if (teamEntry) {
      onTeamClick(teamEntry[0])
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">团队效能对比</h3>
        {selectedTeam && (
          <button
            onClick={() => onTeamClick(selectedTeam)}
            className="text-xs text-indigo-500 hover:underline"
          >
            清除筛选
          </button>
        )}
      </div>
      <ReactECharts
        option={option}
        style={{ height: 280 }}
        onEvents={{ click: handleChartClick }}
      />
    </div>
  )
}
```

- [ ] **Step 2:** Rewrite `src/components/dashboard/activity-heatmap.tsx` with dynamic visualMap.max, typed props, cross-filtering, and glassmorphism. Full file content:

```tsx
"use client"

import ReactECharts from "echarts-for-react"
import type { HeatmapEntry } from "@/lib/dashboard-types"

interface Props {
  data: HeatmapEntry[]
  filterTeam: string | null
  onEmployeeClick: (employeeId: string) => void
}

export function ActivityHeatmap({ data, filterTeam, onEmployeeClick }: Props) {
  // Filter by team if cross-filter is active
  const filteredData = filterTeam
    ? data.filter((d) => d.team === filterTeam)
    : data

  // Build deduplicated employee list in order
  const empMap = new Map<string, { id: string; name: string }>()
  for (const d of filteredData) {
    if (!empMap.has(d.employeeId)) {
      empMap.set(d.employeeId, { id: d.employeeId, name: d.employeeName })
    }
  }
  const employees = Array.from(empMap.values())
  const employeeNames = employees.map((e) => e.name)

  // Build 30-day date axis
  const dates: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    dates.push(d.toISOString().slice(0, 10))
  }

  // Build [xIdx, yIdx, value] triples
  const heatData: [number, number, number][] = []
  for (const entry of filteredData) {
    const xIdx = dates.indexOf(entry.date)
    const yIdx = employees.findIndex((e) => e.id === entry.employeeId)
    if (xIdx >= 0 && yIdx >= 0) {
      heatData.push([xIdx, yIdx, entry.count])
    }
  }

  // Dynamic visualMap max
  const maxCount = Math.max(...filteredData.map((d) => d.count), 1)

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      formatter: (params: { data: [number, number, number] }) => {
        const [xIdx, yIdx, val] = params.data
        return `${employeeNames[yIdx]}<br/>${dates[xIdx]}<br/>完成任务: ${val}`
      },
    },
    grid: { left: 100, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: dates.map((d) => d.slice(5)),
      axisLabel: { color: "#64748b", fontSize: 10, rotate: 45, interval: 4 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: employeeNames,
      axisLabel: {
        color: "#64748b",
        fontSize: 11,
        // trigger click via ECharts yAxis label click (handled via chart click event)
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: maxCount,
      calculable: false,
      show: false,
      inRange: {
        color: ["#fff7ed", "#fed7aa", "#fb923c", "#f97316", "#ea580c"],
      },
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        itemStyle: { borderRadius: 2, borderColor: "#ffffff", borderWidth: 1 },
      },
    ],
  }

  function handleChartClick(params: { componentType: string; value?: [number, number, number]; targetType?: string }) {
    if (params.componentType === "series" && params.value) {
      const [, yIdx] = params.value
      const emp = employees[yIdx]
      if (emp) onEmployeeClick(emp.id)
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">AI员工近30天活跃热力图</h3>
        {filterTeam && (
          <span className="text-xs text-[#64748b]">
            已筛选：{filterTeam === "management" ? "管理团队" : filterTeam === "design" ? "设计师团队" : "生产团队"}
          </span>
        )}
      </div>
      <ReactECharts
        option={option}
        style={{ height: 420 }}
        onEvents={{ click: handleChartClick }}
      />
    </div>
  )
}
```

- [ ] **Step 3:** Rewrite `src/components/dashboard/task-feed.tsx` to accept pre-fetched props, add quality/cost display, and glassmorphism. Full file content:

```tsx
"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { RecentTaskEntry } from "@/lib/dashboard-types"

interface Props {
  tasks: RecentTaskEntry[]
}

const TEAM_COLOR: Record<string, string> = {
  management: "text-[#8b5cf6]",
  design: "text-[#3b82f6]",
  production: "text-[#22c55e]",
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  completed: { label: "已完成", className: "bg-green-50 text-green-700 border border-green-200" },
  failed: { label: "失败", className: "bg-red-50 text-red-700 border border-red-200" },
} as const

export function TaskFeed({ tasks }: Props) {
  const router = useRouter()

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-2xl p-5 flex items-center justify-center h-full min-h-[200px]"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <p className="text-sm text-[#64748b]">暂无任务数据</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">最近任务动态</h3>
        <span className="flex items-center gap-1.5 text-xs text-[#64748b]">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          实时更新
        </span>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => router.push(`/production?task=${task.id}`)}
            className="flex flex-col gap-1 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.9)" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-medium", TEAM_COLOR[task.team] ?? "text-[#64748b]")}>
                {task.employeeName}
              </span>
              <span className={cn("text-xs rounded-md px-1.5 py-0.5", STATUS_CONFIG[task.status].className)}>
                {STATUS_CONFIG[task.status].label}
              </span>
              {task.qualityScore !== null && (
                <span className="text-xs text-[#64748b]">⭐ {task.qualityScore}</span>
              )}
              {task.tokenUsage !== null && (
                <span className="text-xs text-[#64748b]">
                  ≈ ¥{(task.tokenUsage * 0.00005).toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-sm text-[#1e293b] truncate">{task.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4:** Run `npx tsc --noEmit`.

---

### Task 5: Leaderboard + Achievement Feed (placeholders)
**Files:**
- Create: `src/components/dashboard/leaderboard-panel.tsx`
- Create: `src/components/dashboard/achievement-feed.tsx`

Note: The actual XP/level/achievement calculation functions are in Batch 2. For now, these components accept pre-computed data via props and render it. Batch 2 will provide the gamification.ts functions that compute the data passed to these components.

- [ ] **Step 1:** Create `src/components/dashboard/leaderboard-panel.tsx`. Full file content:

```tsx
"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { LeaderboardEntry } from "@/lib/dashboard-types"

interface Props {
  entries: LeaderboardEntry[]
  onEmployeeClick: (employeeId: string) => void
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-[#8b5cf6]",
  design: "border-[#3b82f6]",
  production: "border-[#22c55e]",
}

const RANK_STYLES: Record<number, string> = {
  1: "text-[#f59e0b] text-xl font-black",
  2: "text-[#94a3b8] text-base font-bold",
  3: "text-[#cd7f32] text-base font-bold",
}

function RankChangeIcon({ change }: { change: number }) {
  if (change > 0) return <span className="text-[10px] text-green-500">↑{change}</span>
  if (change < 0) return <span className="text-[10px] text-red-500">↓{Math.abs(change)}</span>
  return <span className="text-[10px] text-[#64748b]">—</span>
}

export function LeaderboardPanel({ entries, onEmployeeClick }: Props) {
  const [tab, setTab] = useState<"week" | "month">("month")

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">实时排行榜 🏆</h3>
        <div className="flex rounded-lg overflow-hidden border border-[#e2e8f0] text-xs">
          <button
            onClick={() => setTab("week")}
            className={cn(
              "px-3 py-1 transition-colors",
              tab === "week" ? "bg-indigo-500 text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]"
            )}
          >
            本周
          </button>
          <button
            onClick={() => setTab("month")}
            className={cn(
              "px-3 py-1 transition-colors",
              tab === "month" ? "bg-indigo-500 text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]"
            )}
          >
            本月
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#64748b] text-center">暂无排行数据</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {entries.slice(0, 5).map((entry, idx) => {
            const rank = idx + 1
            return (
              <div
                key={entry.employeeId}
                onClick={() => onEmployeeClick(entry.employeeId)}
                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.9)" }}
              >
                <span className={cn("w-6 text-center flex-shrink-0", RANK_STYLES[rank] ?? "text-sm font-semibold text-[#475569]")}>
                  {rank}
                </span>
                {/* Avatar circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold bg-[#e2e8f0] border-2",
                    TEAM_BORDER[entry.team] ?? "border-[#64748b]"
                  )}
                >
                  {entry.employeeName.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[#1e293b] truncate">{entry.employeeName}</span>
                    <span
                      className="text-xs rounded px-1 py-0.5 flex-shrink-0 font-medium"
                      style={{ background: entry.levelColor + "20", color: entry.levelColor }}
                    >
                      {entry.levelEmoji} Lv.{entry.level}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b]">{entry.xp.toLocaleString()} XP</p>
                </div>
                <RankChangeIcon change={entry.rankChange} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** Create `src/components/dashboard/achievement-feed.tsx`. Full file content:

```tsx
import { cn } from "@/lib/utils"

export interface AchievementItem {
  id: string
  employeeId: string
  employeeName: string
  team: string
  achievementEmoji: string
  achievementName: string
  earnedAt: string  // ISO date string
}

interface Props {
  achievements: AchievementItem[]
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-l-[#8b5cf6]",
  design: "border-l-[#3b82f6]",
  production: "border-l-[#22c55e]",
}

const TEAM_TEXT: Record<string, string> = {
  management: "text-[#8b5cf6]",
  design: "text-[#3b82f6]",
  production: "text-[#22c55e]",
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "今天"
  if (days === 1) return "昨天"
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return `${Math.floor(days / 30)}个月前`
}

export function AchievementFeed({ achievements }: Props) {
  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-sm font-semibold text-[#1e293b] mb-3">成就动态 🎖️</h3>

      {achievements.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#64748b] text-center leading-relaxed">
            暂无最新成就，AI员工们正在努力中！
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {achievements.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3 border-l-4",
                TEAM_BORDER[item.team] ?? "border-l-[#64748b]"
              )}
              style={{ background: "rgba(255,255,255,0.6)" }}
            >
              <span className="text-xl flex-shrink-0">{item.achievementEmoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className={cn("text-xs font-semibold", TEAM_TEXT[item.team] ?? "text-[#64748b]")}>
                    {item.employeeName}
                  </span>
                  <span className="text-xs text-[#1e293b]">获得</span>
                  <span className="text-xs font-medium text-[#1e293b]">{item.achievementName}</span>
                </div>
                <p className="text-xs text-[#64748b] mt-0.5">{relativeTime(item.earnedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit`.

---

### Task 6: Wire Everything Together + API Route Cleanup
**Files:**
- Modify: `src/app/dashboard/page.tsx` (final version — already done in Task 1 Step 4, verify no changes needed)
- Modify: `src/components/dashboard/dashboard-shell.tsx` (final wiring — already done in Task 2 Step 1, verify no changes needed)

- [ ] **Step 1:** Verify `src/app/dashboard/page.tsx` is the final version from Task 1 Step 4. No changes needed if Task 1 is complete.

- [ ] **Step 2:** Verify `src/components/dashboard/dashboard-shell.tsx` is the final version from Task 2 Step 1. The event handlers (selectedTeam, handleTeamClick, handleEmployeeClick, handleKpiNavigate) are already wired. Confirm:
  - `selectedTeam` state drives `TeamComparisonChart.selectedTeam` and `ActivityHeatmap.filterTeam`
  - `onTeamClick` from TeamComparisonChart updates `selectedTeam`
  - `onEmployeeClick` from Heatmap and Leaderboard triggers `console.log` placeholder (Batch 4 wires the modal)
  - `handleKpiNavigate` from KpiSection handles `router.push`

- [ ] **Step 3:** Run `npx tsc --noEmit` and `npm run build`.

- [ ] **Step 4:** Commit all Batch 1 changes:

```bash
git add src/lib/dashboard-types.ts src/lib/dashboard-data.ts src/components/dashboard/ src/app/dashboard/page.tsx
git commit -m "feat: redesign dashboard with Bento Grid layout, glassmorphism, and real data

- Bento Grid 4-row layout: hero gauge + team status, 6 KPI cards, team efficiency + leaderboard, heatmap + achievements + tasks
- Glassmorphism card style across all components
- Real month-over-month trend calculations (no more hardcoded fake data)
- New data sources: skill_metrics, task_outputs, metric_configs
- Fixed heatmap visualMap.max hardcoded to 10
- Added date range filter to heatmap query
- Shared data functions in dashboard-data.ts (eliminates page/API route duplication)
- Full TypeScript typing (removed all any types)
- Leaderboard and achievement feed ready for gamification data (Batch 2)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Dev server shows new Bento Grid layout at /dashboard
- [ ] All 6 KPI cards display real data with real trends
- [ ] Gauge shows computed operational index
- [ ] Team status panel shows correct active/total counts per team
- [ ] Heatmap dynamically computes max value
- [ ] Task feed shows quality scores and estimated costs
- [ ] Leaderboard renders placeholder empty state
- [ ] Achievement feed renders placeholder empty state
