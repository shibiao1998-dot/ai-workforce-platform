# Unified Metrics Engine & Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected metrics table with a unified computation layer that derives all indicators from the tasks table, and add hover tooltips to every metric display across the platform.

**Architecture:** A single `metric-engine.ts` module provides all metric computations from the `tasks` table. A `MetricTooltip` component wraps metric labels with descriptive hover text. Each page is updated to use the engine instead of the old metrics table queries.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, SQLite, @base-ui/react Tooltip, ECharts

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/metric-engine.ts` | All metric computations from tasks table |
| Create | `src/components/shared/metric-tooltip.tsx` | Reusable tooltip wrapper for metric labels |
| Modify | `src/app/layout.tsx` | Add TooltipProvider wrapper |
| Modify | `src/lib/dashboard-data.ts` | Remove metrics-table functions, keep tasks-based ones |
| Modify | `src/lib/dashboard-types.ts` | Update DashboardSummary to match engine output |
| Modify | `src/app/dashboard/page.tsx` | Use metric-engine instead of old data functions |
| Modify | `src/components/dashboard/kpi-card.tsx` | Add MetricTooltip to label |
| Modify | `src/components/dashboard/operational-index-gauge.tsx` | Use engine types + add tooltips |
| Modify | `src/components/dashboard/team-status-panel.tsx` | Add tooltip to health rate |
| Modify | `src/components/dashboard/task-feed.tsx` | Fix token cost rate + add tooltip |
| Modify | `src/components/dashboard/leaderboard-panel.tsx` | Add tooltip to XP/level |
| Modify | `src/app/api/production-stats/route.ts` | Use engine functions |
| Modify | `src/components/production/production-stats.tsx` | Add MetricTooltip to labels |
| Modify | `src/components/production/charts/quality-gauge.tsx` | Add MetricTooltip to title |
| Modify | `src/app/roster/page.tsx` | Use engine instead of metrics table |
| Modify | `src/components/roster/employee-card.tsx` | Add MetricTooltip to metric labels |
| Modify | `src/components/roster/tabs/metrics-tab.tsx` | Use engine data + add tooltips |
| Modify | `src/app/api/employees/[id]/route.ts` | Compute metrics from tasks instead of reading metrics table |
| Delete | `src/app/api/dashboard/summary/route.ts` | Dead code |
| Delete | `src/app/api/dashboard/heatmap/route.ts` | Dead code |
| Delete | `src/app/api/dashboard/team-comparison/route.ts` | Dead code |
| Delete | `src/app/api/dashboard/recent-tasks/route.ts` | Dead code |

---

### Phase 1: Core Engine + Tooltip Component

---

### Task 1: Create metric-engine.ts

**Files:**
- Create: `src/lib/metric-engine.ts`

- [ ] **Step 1: Create the metric definitions and types**

```ts
import { db } from "@/db"
import { tasks, employees, metricConfigs } from "@/db/schema"
import { eq, and, gte, lte, sql, isNull } from "drizzle-orm"
import type { TeamType } from "@/lib/types"

// ─── Metric Definitions ──────────────────────────────────────────────────

export interface MetricDef {
  key: string
  label: string
  description: string
  unit: string
  precision: number
}

export const METRIC_DEFS: Record<string, MetricDef> = {
  taskCount: {
    key: "taskCount",
    label: "任务总量",
    description: "所选时间范围内的任务总数",
    unit: "个",
    precision: 0,
  },
  completionRate: {
    key: "completionRate",
    label: "完成率",
    description: "已完成任务占已完成与失败任务之和的比率",
    unit: "%",
    precision: 1,
  },
  qualityScore: {
    key: "qualityScore",
    label: "平均质量分",
    description: "已完成任务的质量评分平均值（满分100）",
    unit: "分",
    precision: 0,
  },
  adoptionRate: {
    key: "adoptionRate",
    label: "采纳率",
    description: "已完成任务占全部任务（含执行中）的比率",
    unit: "%",
    precision: 1,
  },
  accuracyRate: {
    key: "accuracyRate",
    label: "准确率",
    description: "基于质量评分的任务准确程度（满分100%）",
    unit: "%",
    precision: 1,
  },
  hoursSaved: {
    key: "hoursSaved",
    label: "节省人工时",
    description: "按任务类型的人工基准耗时累计，AI完成所节省的工时",
    unit: "h",
    precision: 1,
  },
  costSaved: {
    key: "costSaved",
    label: "节省人力成本",
    description: "节省工时折算的人力成本（基于配置的时薪）",
    unit: "¥",
    precision: 0,
  },
  runningTasks: {
    key: "runningTasks",
    label: "执行中",
    description: "当前正在执行中的任务数量",
    unit: "",
    precision: 0,
  },
  tokenCost: {
    key: "tokenCost",
    label: "Token 消耗成本",
    description: "任务消耗的 Token 折算费用",
    unit: "¥",
    precision: 2,
  },
  operationalIndex: {
    key: "operationalIndex",
    label: "综合运营指数",
    description: "采纳率与准确率的综合评分，反映整体运营健康度",
    unit: "",
    precision: 0,
  },
  teamHealth: {
    key: "teamHealth",
    label: "团队健康度",
    description: "团队中在岗运行员工占全部员工的比率",
    unit: "%",
    precision: 0,
  },
  xp: {
    key: "xp",
    label: "经验值",
    description: "基于任务完成数量和质量累计的成长积分",
    unit: "XP",
    precision: 0,
  },
  level: {
    key: "level",
    label: "等级",
    description: "由经验值决定的成长阶段（新手→熟练→精英→大师→传奇）",
    unit: "",
    precision: 0,
  },
}

export const TOKEN_COST_RATE = 0.0001

// ─── Types ───────────────────────────────────────────────────────────────

export interface MetricValues {
  taskCount: number
  completedCount: number
  failedCount: number
  runningCount: number
  completionRate: number
  adoptionRate: number
  accuracyRate: number
  qualityScore: number
  hoursSaved: number
  costSaved: number
  tokenCost: number
  operationalIndex: number
}

export interface MetricScope {
  period?: string
  timeRange?: "today" | "7d" | "30d"
  team?: TeamType
  employeeId?: string
}

interface TaskRow {
  status: string
  team: string
  type: string
  qualityScore: number | null
  tokenUsage: number | null
  startTime: Date | null
  employeeId: string
}
```

- [ ] **Step 2: Implement the time range helper and core query**

Add below the types in the same file:

```ts
// ─── Helpers ─────────────────────────────────────────────────────────────

function getTimeRange(range: "today" | "7d" | "30d"): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  let start: Date
  if (range === "7d") {
    start = new Date(end.getTime() - 7 * 86400000)
  } else if (range === "30d") {
    start = new Date(end.getTime() - 30 * 86400000)
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  }
  return { start, end }
}

function getMonthRange(period: string): { start: Date; end: Date } {
  const [year, month] = period.split("-").map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  return { start, end }
}

async function queryTasks(scope: MetricScope): Promise<TaskRow[]> {
  let start: Date
  let end: Date

  if (scope.period) {
    ;({ start, end } = getMonthRange(scope.period))
  } else if (scope.timeRange) {
    ;({ start, end } = getTimeRange(scope.timeRange))
  } else {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    ;({ start, end } = getMonthRange(currentMonth))
  }

  const conditions = [gte(tasks.startTime, start), lte(tasks.startTime, end)]
  if (scope.team) conditions.push(eq(tasks.team, scope.team))
  if (scope.employeeId) conditions.push(eq(tasks.employeeId, scope.employeeId))

  return db
    .select({
      status: tasks.status,
      team: tasks.team,
      type: tasks.type,
      qualityScore: tasks.qualityScore,
      tokenUsage: tasks.tokenUsage,
      startTime: tasks.startTime,
      employeeId: tasks.employeeId,
    })
    .from(tasks)
    .where(and(...conditions))
}

async function getGlobalCostPerHour(): Promise<number> {
  const global = await db
    .select({ costPerHour: metricConfigs.costPerHour })
    .from(metricConfigs)
    .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
    .limit(1)
  return global[0]?.costPerHour ?? 46.875
}

async function getHumanBaselines(): Promise<Map<string, number>> {
  const configs = await db
    .select({
      taskType: metricConfigs.taskType,
      humanBaseline: metricConfigs.humanBaseline,
    })
    .from(metricConfigs)
    .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
  return new Map(configs.map((c) => [c.taskType, c.humanBaseline]))
}
```

- [ ] **Step 3: Implement computeMetrics and getMetrics**

Add below the helpers:

```ts
// ─── Core Computation ────────────────────────────────────────────────────

function computeMetrics(
  rows: TaskRow[],
  baselines: Map<string, number>,
  costPerHour: number,
): MetricValues {
  const total = rows.length
  const completed = rows.filter((r) => r.status === "completed")
  const failed = rows.filter((r) => r.status === "failed")
  const running = rows.filter((r) => r.status === "running")

  const completedCount = completed.length
  const failedCount = failed.length
  const runningCount = running.length

  const resolved = completedCount + failedCount
  const completionRate = resolved > 0 ? (completedCount / resolved) * 100 : 0
  const adoptionRate = total > 0 ? (completedCount / total) * 100 : 0

  const scores = completed.filter((r) => r.qualityScore != null).map((r) => r.qualityScore!)
  const qualityScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const accuracyRate = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  let hoursSaved = 0
  for (const r of completed) {
    const baseline = baselines.get(r.type)
    if (baseline) hoursSaved += baseline
  }

  const costSaved = hoursSaved * costPerHour

  const totalTokens = rows.reduce((sum, r) => sum + (r.tokenUsage ?? 0), 0)
  const tokenCost = totalTokens * TOKEN_COST_RATE

  const operationalIndex = Math.round((adoptionRate + accuracyRate) / 2)

  return {
    taskCount: total,
    completedCount,
    failedCount,
    runningCount,
    completionRate: +completionRate.toFixed(1),
    adoptionRate: +adoptionRate.toFixed(1),
    accuracyRate: +accuracyRate.toFixed(1),
    qualityScore,
    hoursSaved: +hoursSaved.toFixed(1),
    costSaved: Math.round(costSaved),
    tokenCost: +tokenCost.toFixed(2),
    operationalIndex,
  }
}

export async function getMetrics(scope: MetricScope = {}): Promise<MetricValues> {
  const [rows, baselines, costPerHour] = await Promise.all([
    queryTasks(scope),
    getHumanBaselines(),
    getGlobalCostPerHour(),
  ])
  return computeMetrics(rows, baselines, costPerHour)
}
```

- [ ] **Step 4: Implement trend and comparison functions**

Add below getMetrics:

```ts
// ─── Trend Helpers ───────────────────────────────────────────────────────

export function calcTrend(
  current: number,
  prev: number,
): { trendPct: number; trendDirection: "up" | "down" | "neutral" } {
  if (prev === 0) return { trendPct: 0, trendDirection: "neutral" }
  const pct = Math.round(((current - prev) / prev) * 100)
  return {
    trendPct: Math.abs(pct),
    trendDirection: pct > 0 ? "up" : pct < 0 ? "down" : "neutral",
  }
}

export interface KpiItemEngine {
  key: string
  label: string
  emoji: string
  value: number
  displaySuffix: string
  displayPrefix: string
  prevValue: number
  trendPct: number
  trendDirection: "up" | "down" | "neutral"
  href: string | null
}

export async function getKpiItems(
  currentMonth: string,
  prevMonth: string,
): Promise<KpiItemEngine[]> {
  const [cur, prev] = await Promise.all([
    getMetrics({ period: currentMonth }),
    getMetrics({ period: prevMonth }),
  ])

  return [
    {
      key: "taskCount",
      label: "本月任务量",
      emoji: "📋",
      value: cur.taskCount,
      displaySuffix: " 个",
      displayPrefix: "",
      prevValue: prev.taskCount,
      ...calcTrend(cur.taskCount, prev.taskCount),
      href: "/production",
    },
    {
      key: "adoptionRate",
      label: "采纳率",
      emoji: "🎯",
      value: cur.adoptionRate,
      displaySuffix: "%",
      displayPrefix: "",
      prevValue: prev.adoptionRate,
      ...calcTrend(cur.adoptionRate, prev.adoptionRate),
      href: null,
    },
    {
      key: "accuracyRate",
      label: "准确率",
      emoji: "✅",
      value: cur.accuracyRate,
      displaySuffix: "%",
      displayPrefix: "",
      prevValue: prev.accuracyRate,
      ...calcTrend(cur.accuracyRate, prev.accuracyRate),
      href: null,
    },
    {
      key: "hoursSaved",
      label: "节省人工时",
      emoji: "⏱️",
      value: cur.hoursSaved,
      displaySuffix: " h",
      displayPrefix: "",
      prevValue: prev.hoursSaved,
      ...calcTrend(cur.hoursSaved, prev.hoursSaved),
      href: null,
    },
    {
      key: "costSaved",
      label: "节省人力成本",
      emoji: "💰",
      value: cur.costSaved,
      displaySuffix: " 元",
      displayPrefix: "¥",
      prevValue: prev.costSaved,
      ...calcTrend(cur.costSaved, prev.costSaved),
      href: null,
    },
  ]
}
```

- [ ] **Step 5: Implement team efficiency trend and monthly trend**

Add below getKpiItems:

```ts
// ─── Trend Queries ───────────────────────────────────────────────────────

export interface TeamEfficiencyPoint {
  month: string
  management: number
  design: number
  production: number
}

export async function getTeamEfficiencyTrend(
  months: string[],
): Promise<TeamEfficiencyPoint[]> {
  const result: TeamEfficiencyPoint[] = []
  for (const month of months) {
    const { start, end } = getMonthRange(month)
    const rows = await db
      .select({ team: tasks.team, status: tasks.status })
      .from(tasks)
      .where(and(gte(tasks.startTime, start), lte(tasks.startTime, end)))

    const completed = rows.filter((r) => r.status === "completed")
    result.push({
      month,
      management: completed.filter((r) => r.team === "management").length,
      design: completed.filter((r) => r.team === "design").length,
      production: completed.filter((r) => r.team === "production").length,
    })
  }
  return result
}

export interface MonthlyTrendPoint {
  period: string
  taskCount: number
  adoptionRate: number
  accuracyRate: number
  hoursSaved: number
}

export async function getMonthlyTrend(
  employeeId: string,
  months: string[],
): Promise<MonthlyTrendPoint[]> {
  const [baselines, costPerHour] = await Promise.all([
    getHumanBaselines(),
    getGlobalCostPerHour(),
  ])

  const result: MonthlyTrendPoint[] = []
  for (const month of months) {
    const rows = await queryTasks({ period: month, employeeId })
    const m = computeMetrics(rows, baselines, costPerHour)
    result.push({
      period: month,
      taskCount: m.taskCount,
      adoptionRate: m.adoptionRate,
      accuracyRate: m.accuracyRate,
      hoursSaved: m.hoursSaved,
    })
  }
  return result
}
```

- [ ] **Step 6: Implement employee ranking and per-employee metrics**

Add at the end of the file:

```ts
// ─── Rankings ────────────────────────────────────────────────────────────

export interface EmployeeMetricSummary {
  employeeId: string
  taskCount: number
  adoptionRate: number
  accuracyRate: number
}

export async function getEmployeeMetrics(
  scope: Omit<MetricScope, "employeeId"> = {},
): Promise<EmployeeMetricSummary[]> {
  let start: Date
  let end: Date

  if (scope.period) {
    ;({ start, end } = getMonthRange(scope.period))
  } else if (scope.timeRange) {
    ;({ start, end } = getTimeRange(scope.timeRange))
  } else {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    ;({ start, end } = getMonthRange(currentMonth))
  }

  const conditions = [gte(tasks.startTime, start), lte(tasks.startTime, end)]
  if (scope.team) conditions.push(eq(tasks.team, scope.team))

  const rows = await db
    .select({
      employeeId: tasks.employeeId,
      status: tasks.status,
      qualityScore: tasks.qualityScore,
    })
    .from(tasks)
    .where(and(...conditions))

  const grouped = new Map<string, { total: number; completed: number; scores: number[] }>()
  for (const r of rows) {
    let entry = grouped.get(r.employeeId)
    if (!entry) {
      entry = { total: 0, completed: 0, scores: [] }
      grouped.set(r.employeeId, entry)
    }
    entry.total++
    if (r.status === "completed") {
      entry.completed++
      if (r.qualityScore != null) entry.scores.push(r.qualityScore)
    }
  }

  return Array.from(grouped.entries()).map(([employeeId, e]) => ({
    employeeId,
    taskCount: e.total,
    adoptionRate: e.total > 0 ? +((e.completed / e.total) * 100).toFixed(1) : 0,
    accuracyRate: e.scores.length > 0 ? +(e.scores.reduce((a, b) => a + b, 0) / e.scores.length).toFixed(1) : 0,
  }))
}
```

- [ ] **Step 7: Verify the engine compiles**

Run: `npx tsc --noEmit src/lib/metric-engine.ts 2>&1 | head -20`

If there are errors, fix them. The file should compile cleanly.

- [ ] **Step 8: Commit**

```bash
git add src/lib/metric-engine.ts
git commit -m "feat: add unified metric-engine deriving all indicators from tasks table"
```

---

### Task 2: Create MetricTooltip component

**Files:**
- Create: `src/components/shared/metric-tooltip.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create the MetricTooltip component**

```tsx
"use client"

import { METRIC_DEFS } from "@/lib/metric-engine"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

interface MetricTooltipProps {
  metricKey?: string
  description?: string
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
}

export function MetricTooltip({
  metricKey,
  description,
  children,
  side = "top",
}: MetricTooltipProps) {
  const text = description ?? (metricKey ? METRIC_DEFS[metricKey]?.description : undefined)
  if (!text) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger
        className="cursor-help border-b border-dashed border-muted-foreground/40"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  )
}
```

- [ ] **Step 2: Add TooltipProvider to root layout**

In `src/app/layout.tsx`, add the import and wrap children:

Change the imports at the top — add:
```ts
import { TooltipProvider } from "@/components/ui/tooltip";
```

Change the body content from:
```tsx
<body>
  <HelpPanelProvider>
```
to:
```tsx
<body>
  <TooltipProvider delay={300}>
  <HelpPanelProvider>
```

And add the closing tag before `</body>`:
```tsx
        </HelpPanelProvider>
        </TooltipProvider>
      </body>
```

- [ ] **Step 3: Verify build compiles**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/metric-tooltip.tsx src/app/layout.tsx
git commit -m "feat: add MetricTooltip component and TooltipProvider in root layout"
```

---

### Phase 2: Dashboard Page Migration

---

### Task 3: Update dashboard-types.ts and dashboard-data.ts

**Files:**
- Modify: `src/lib/dashboard-types.ts`
- Modify: `src/lib/dashboard-data.ts`

- [ ] **Step 1: Update DashboardSummary in dashboard-types.ts**

Replace the `DashboardSummary` interface (lines 3-9) with:

```ts
export interface DashboardSummary {
  operationalIndex: number
  monthlyTaskCount: number
  completionRate: number
  adoptionRate: number
  accuracyRate: number
  costSaved: number
  costPerHour: number
}
```

Note: `successRate` is renamed to `completionRate`, `savedCost` renamed to `costSaved`, added `adoptionRate` and `accuracyRate`.

- [ ] **Step 2: Clean up dashboard-data.ts**

Remove these functions from `src/lib/dashboard-data.ts`:
- `getDashboardSummary` (the entire function)
- `getKpiData` (the entire function)
- `getTeamEfficiencyTrend` (the entire function)
- `calcTrend` (the private helper)

Keep these functions:
- `getTeamStatus()`
- `getHeatmapData()`
- `getRecentTasks()`
- `getGamificationData()`
- `computeLeaderboard()`
- `computeRecentAchievements()`

Remove unused imports: `metrics`, `metricConfigs` from schema import, and `isNull` from drizzle-orm if no longer used. Keep `employees`, `tasks`, `skills`, `eq`, `sql`, `and`, `desc`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

Fix any import errors in files that were importing the removed functions (the dashboard page.tsx will break — that's expected, we fix it in the next task).

- [ ] **Step 4: Commit**

```bash
git add src/lib/dashboard-types.ts src/lib/dashboard-data.ts
git commit -m "refactor: remove metrics-table functions from dashboard-data, keep tasks-based ones"
```

---

### Task 4: Update dashboard page.tsx and operational-index-gauge

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/operational-index-gauge.tsx`
- Modify: `src/components/dashboard/dashboard-shell.tsx` (if DashboardSummary shape changed)

- [ ] **Step 1: Rewrite dashboard page.tsx**

Replace the entire file with:

```tsx
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  getTeamStatus,
  getHeatmapData,
  getRecentTasks,
  getGamificationData,
  computeLeaderboard,
  computeRecentAchievements,
} from "@/lib/dashboard-data"
import { getMetrics, getKpiItems, getTeamEfficiencyTrend } from "@/lib/metric-engine"

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getPrevMonth(current: string): string {
  const [y, m] = current.split("-").map(Number)
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
  return prev
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
  const now = new Date()
  const end = now.toISOString().slice(0, 10)
  const start = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10)
  return { startDate: start, endDate: end }
}

export default async function DashboardPage() {
  const currentMonth = getCurrentMonth()
  const prevMonth = getPrevMonth(currentMonth)
  const last5Months = getLastNMonths(5)
  const { startDate, endDate } = getDateRange(30)

  const [engineMetrics, teamStatus, kpiItems, efficiencyTrend, heatmapData, recentTasks, gamificationRaw] =
    await Promise.all([
      getMetrics({ period: currentMonth }),
      getTeamStatus(),
      getKpiItems(currentMonth, prevMonth),
      getTeamEfficiencyTrend(last5Months),
      getHeatmapData(startDate, endDate),
      getRecentTasks(8),
      getGamificationData(),
    ])

  const summary = {
    operationalIndex: engineMetrics.operationalIndex,
    monthlyTaskCount: engineMetrics.taskCount,
    completionRate: engineMetrics.completionRate,
    adoptionRate: engineMetrics.adoptionRate,
    accuracyRate: engineMetrics.accuracyRate,
    costSaved: engineMetrics.costSaved,
    costPerHour: 0,
  }

  const leaderboard = computeLeaderboard(gamificationRaw, "month")
  const recentAchievements = computeRecentAchievements(gamificationRaw, 5)

  return (
    <DashboardShell
      summary={summary}
      teamStatus={teamStatus}
      kpiItems={kpiItems}
      efficiencyTrend={efficiencyTrend}
      heatmapData={heatmapData}
      leaderboard={leaderboard}
      recentTasks={recentTasks}
      recentAchievements={recentAchievements}
    />
  )
}
```

- [ ] **Step 2: Update operational-index-gauge.tsx**

The gauge currently shows `summary.monthlyTaskCount`, `summary.successRate`, `summary.savedCost`. Update to match the new DashboardSummary shape.

Find the bottom stats section (around line 60-85) and update the three stat entries:
- Change `summary.successRate` → `summary.completionRate`
- Change `Math.round(summary.successRate * 100) + "%"` → `summary.completionRate.toFixed(1) + "%"` (it's already a percentage now)
- Change `summary.savedCost` → `summary.costSaved`
- Change the `savedCost` formatting to `summary.costSaved.toLocaleString()`

Also add MetricTooltip imports and wrap each stat label:

Add import at top:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Wrap each stat label text with `<MetricTooltip>`. The three stats should become:
- 任务总量 → `<MetricTooltip metricKey="taskCount">任务总量</MetricTooltip>`
- 成功率 → rename to 完成率, wrap: `<MetricTooltip metricKey="completionRate">完成率</MetricTooltip>`
- 节省成本 → `<MetricTooltip metricKey="costSaved">节省成本</MetricTooltip>`

And wrap the gauge title "综合运营指数" with: `<MetricTooltip metricKey="operationalIndex">综合运营指数</MetricTooltip>`

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/page.tsx src/components/dashboard/operational-index-gauge.tsx
git commit -m "feat: dashboard page uses metric-engine, gauge shows tooltips"
```

---

### Task 5: Add tooltips to KpiCard, TeamStatusPanel, TaskFeed, LeaderboardPanel

**Files:**
- Modify: `src/components/dashboard/kpi-card.tsx`
- Modify: `src/components/dashboard/team-status-panel.tsx`
- Modify: `src/components/dashboard/task-feed.tsx`
- Modify: `src/components/dashboard/leaderboard-panel.tsx`

- [ ] **Step 1: Add MetricTooltip to KpiCard**

In `src/components/dashboard/kpi-card.tsx`, add import:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Find the label rendering (the `<span>` showing `item.label` — it's a `text-xs text-[#64748b]` span). Wrap it:
```tsx
<MetricTooltip metricKey={item.key}>
  <span className="text-xs text-[#64748b]">{item.label}</span>
</MetricTooltip>
```

- [ ] **Step 2: Add tooltip to TeamStatusPanel**

In `src/components/dashboard/team-status-panel.tsx`, add import:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Find the "团队健康度" title text (h3 element). Wrap with:
```tsx
<MetricTooltip metricKey="teamHealth">团队健康度</MetricTooltip>
```

Also wrap each team's health percentage label if there is one visible.

- [ ] **Step 3: Fix token cost and add tooltip in TaskFeed**

In `src/components/dashboard/task-feed.tsx`:

Add import:
```ts
import { MetricTooltip, TOKEN_COST_RATE } from "@/components/shared/metric-tooltip"
```

Wait — TOKEN_COST_RATE is in metric-engine.ts, not metric-tooltip. Fix the import:
```ts
import { TOKEN_COST_RATE } from "@/lib/metric-engine"
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Find line 78 where token cost is calculated as `task.tokenUsage * 0.00005`. Change to:
```tsx
<MetricTooltip metricKey="tokenCost">
  <span className="text-xs text-[#64748b]">≈ ¥{(task.tokenUsage * TOKEN_COST_RATE).toFixed(2)}</span>
</MetricTooltip>
```

- [ ] **Step 4: Add tooltips to LeaderboardPanel**

In `src/components/dashboard/leaderboard-panel.tsx`, add import:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Find the XP display (line 89: `{entry.xp.toLocaleString()} XP`). Wrap:
```tsx
<MetricTooltip metricKey="xp">
  <span className="text-xs text-[#64748b]">{entry.xp.toLocaleString()} XP</span>
</MetricTooltip>
```

Find the level badge (line 85-87). Wrap:
```tsx
<MetricTooltip metricKey="level">
  <span className="text-xs rounded px-1 py-0.5 flex-shrink-0 font-medium" style={{ background: entry.levelColor + "20", color: entry.levelColor }}>
    {entry.levelEmoji} Lv.{entry.level}
  </span>
</MetricTooltip>
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/kpi-card.tsx src/components/dashboard/team-status-panel.tsx src/components/dashboard/task-feed.tsx src/components/dashboard/leaderboard-panel.tsx
git commit -m "feat: add MetricTooltip to all dashboard metric displays, fix token cost rate"
```

---

### Phase 3: Production Page Migration

---

### Task 6: Update production-stats API and components

**Files:**
- Modify: `src/app/api/production-stats/route.ts`
- Modify: `src/components/production/production-stats.tsx`
- Modify: `src/components/production/charts/quality-gauge.tsx`

- [ ] **Step 1: Update production-stats API to use engine**

Replace `src/app/api/production-stats/route.ts` with a version that uses `getMetrics` from the engine for the summary portion. The dailyTrend, typeDistribution, employeeRanking, and dateAvgQuality sections can remain as direct queries since they are chart-specific aggregations.

At the top, add import:
```ts
import { getMetrics } from "@/lib/metric-engine"
```

Replace the summary computation section (lines 42-47) with:
```ts
const engineMetrics = await getMetrics({ timeRange: timeRange as "today" | "7d" | "30d" })
```

And update the response summary to use engine values:
```ts
summary: {
  totalTasks: engineMetrics.taskCount,
  completedTasks: engineMetrics.completedCount,
  completionRate: engineMetrics.completionRate,
  runningTasks: engineMetrics.runningCount,
  avgQualityScore: engineMetrics.qualityScore,
},
```

Keep the rest of the route (dailyTrend, typeDistribution, employeeRanking, dateAvgQuality) using the existing direct query since those are chart-specific and already query tasks directly.

- [ ] **Step 2: Add MetricTooltip to ProductionStats**

In `src/components/production/production-stats.tsx`, add import:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Update the STAT_CARDS config to include metricKey:
```ts
const STAT_CARDS = [
  { key: "totalTasks" as const, metricKey: "taskCount", label: "今日任务", icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "completionRate" as const, metricKey: "completionRate", label: "完成率", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", suffix: "%" },
  { key: "runningTasks" as const, metricKey: "runningTasks", label: "执行中", icon: Loader, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "avgQualityScore" as const, metricKey: "qualityScore", label: "平均质量分", icon: Star, color: "text-purple-600", bg: "bg-purple-50", suffix: "/100" },
];
```

In the render, wrap the label `<p>` with MetricTooltip:
```tsx
<p className="text-xs text-muted-foreground">
  <MetricTooltip metricKey={metricKey}>{label}</MetricTooltip>
</p>
```

- [ ] **Step 3: Add MetricTooltip to QualityGauge**

In `src/components/production/charts/quality-gauge.tsx`, add import:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Wrap the CardTitle:
```tsx
<CardTitle className="text-sm font-medium text-muted-foreground">
  <MetricTooltip metricKey="qualityScore">平均质量评分</MetricTooltip>
</CardTitle>
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/production-stats/route.ts src/components/production/production-stats.tsx src/components/production/charts/quality-gauge.tsx
git commit -m "feat: production page uses metric-engine for summary, adds tooltips"
```

---

### Phase 4: Roster Page Migration

---

### Task 7: Update roster page and employee card

**Files:**
- Modify: `src/app/roster/page.tsx`
- Modify: `src/components/roster/employee-card.tsx`

- [ ] **Step 1: Rewrite roster page.tsx to use engine**

Replace the entire file:

```tsx
import { db } from "@/db";
import { EmployeeGrid } from "@/components/roster/employee-grid";
import { getEmployeeMetrics } from "@/lib/metric-engine";

export default async function RosterPage() {
  const rows = await db.query.employees.findMany({
    orderBy: (e, { asc }) => [asc(e.team), asc(e.name)],
  });

  const empMetrics = await getEmployeeMetrics();
  const metricMap = new Map(empMetrics.map((m) => [m.employeeId, m]));

  const employeeList = rows.map((emp) => {
    const m = metricMap.get(emp.id);
    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      monthlyTaskCount: m?.taskCount ?? 0,
      adoptionRate: m ? m.adoptionRate / 100 : null,
      accuracyRate: m ? m.accuracyRate / 100 : null,
      description: emp.description,
      subTeam: emp.subTeam,
    };
  });

  return (
    <div className="p-8">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-foreground">AI 员工花名册</h1>
        <p className="text-muted-foreground mt-1">
          共 {employeeList.length} 名 AI 员工，
          {employeeList.filter((e) => e.status === "active").length} 名在岗运行
        </p>
      </div>
      <div className="animate-fade-in-up animate-delay-100">
        <EmployeeGrid employees={employeeList} />
      </div>
    </div>
  );
}
```

Note: `adoptionRate` and `accuracyRate` from the engine are percentages (0-100), but `EmployeeListItem` expects 0-1 decimals (since the card does `* 100`). So we divide by 100 here to maintain the card's existing formatting logic.

- [ ] **Step 2: Add MetricTooltip to EmployeeCard**

In `src/components/roster/employee-card.tsx`, add import:
```ts
import { MetricTooltip } from "@/components/shared/metric-tooltip"
```

Find the three metric labels in the metrics row (lines ~79, ~83, ~89). Wrap each:

```tsx
{/* 本月任务 */}
<span className="text-[11px] text-muted-foreground mt-0.5">
  <MetricTooltip metricKey="taskCount">本月任务</MetricTooltip>
</span>

{/* 采纳率 */}
<span className="text-[11px] text-muted-foreground mt-0.5">
  <MetricTooltip metricKey="adoptionRate">采纳率</MetricTooltip>
</span>

{/* 准确率 */}
<span className="text-[11px] text-muted-foreground mt-0.5">
  <MetricTooltip metricKey="accuracyRate">准确率</MetricTooltip>
</span>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/app/roster/page.tsx src/components/roster/employee-card.tsx
git commit -m "feat: roster page uses metric-engine, employee cards show tooltips"
```

---

### Task 8: Update roster MetricsTab and employee API

**Files:**
- Modify: `src/components/roster/tabs/metrics-tab.tsx`
- Modify: `src/app/api/employees/[id]/route.ts`

- [ ] **Step 1: Update MetricsTab to work with engine data**

The MetricsTab currently receives `Metric[]` (from the old metrics table) and renders summary cards + a trend chart. We need to change its data source.

The MetricsTab is rendered inside the employee detail modal, which fetches `/api/employees/[id]`. We'll update the API to return engine-computed metrics, and update the MetricsTab props to match.

First, update MetricsTab. Replace the props interface and data handling:

```tsx
"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";

interface TrendPoint {
  period: string;
  taskCount: number;
  adoptionRate: number;
  accuracyRate: number;
  hoursSaved: number;
}

interface MetricsTabProps {
  current: {
    taskCount: number;
    adoptionRate: number;
    accuracyRate: number;
    hoursSaved: number;
  } | null;
  trend: TrendPoint[];
}

export function MetricsTab({ current, trend }: MetricsTabProps) {
  const periods = trend.map((m) => m.period);
  const taskCounts = trend.map((m) => m.taskCount);
  const hoursSaved = trend.map((m) => m.hoursSaved);
  const adoptionRates = trend.map((m) => m.adoptionRate);
  const accuracyRates = trend.map((m) => m.accuracyRate);

  // ... keep the existing trendOption and chart rendering, but use the new data arrays
  // ... keep the same ECharts config
```

For the summary cards, update to use `current` prop and wrap labels with MetricTooltip:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
  <Card>
    <CardHeader className="pb-2">
      <CardDescription><MetricTooltip metricKey="taskCount">任务数</MetricTooltip></CardDescription>
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl tabular-nums">{current?.taskCount ?? "—"}</CardTitle>
    </CardContent>
  </Card>
  <Card>
    <CardHeader className="pb-2">
      <CardDescription><MetricTooltip metricKey="adoptionRate">采纳率</MetricTooltip></CardDescription>
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl tabular-nums">{current ? `${current.adoptionRate.toFixed(1)}%` : "—"}</CardTitle>
    </CardContent>
  </Card>
  <Card>
    <CardHeader className="pb-2">
      <CardDescription><MetricTooltip metricKey="accuracyRate">准确率</MetricTooltip></CardDescription>
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl tabular-nums">{current ? `${current.accuracyRate.toFixed(1)}%` : "—"}</CardTitle>
    </CardContent>
  </Card>
  <Card>
    <CardHeader className="pb-2">
      <CardDescription><MetricTooltip metricKey="hoursSaved">节省工时</MetricTooltip></CardDescription>
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl tabular-nums">{current ? `${current.hoursSaved.toFixed(1)} h` : "—"}</CardTitle>
    </CardContent>
  </Card>
</div>
```

- [ ] **Step 2: Update employee API to return engine metrics**

In `src/app/api/employees/[id]/route.ts`, update the GET handler:

Add imports:
```ts
import { getMetrics, getMonthlyTrend } from "@/lib/metric-engine"
```

Replace the metrics query (line 20: `db.select().from(metrics).where(...)`) with engine calls:

```ts
const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
const months: string[] = []
for (let i = 5; i >= 0; i--) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
  months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
}

const [empSkills, currentMetrics, monthlyTrend, empVersionLogs, empSkillMetrics] = await Promise.all([
  db.select().from(skills).where(eq(skills.employeeId, id)),
  getMetrics({ period: currentMonth, employeeId: id }),
  getMonthlyTrend(id, months),
  db.select().from(versionLogs).where(eq(versionLogs.employeeId, id)),
  db.select().from(skillMetrics).where(eq(skillMetrics.employeeId, id)),
])
```

Update the response to return the new shape:
```ts
return NextResponse.json({
  ...emp,
  skills: empSkills.map(s => ({
    ...s,
    skillMetrics: skillMetricsMap.get(s.id) ?? [],
  })),
  currentMetrics: {
    taskCount: currentMetrics.taskCount,
    adoptionRate: currentMetrics.adoptionRate,
    accuracyRate: currentMetrics.accuracyRate,
    hoursSaved: currentMetrics.hoursSaved,
  },
  monthlyTrend,
  versionLogs: empVersionLogs,
})
```

Remove the `metrics` import from `@/db/schema` if no longer used in this file.

- [ ] **Step 3: Update the employee detail component to pass new props**

Find the component that renders `<MetricsTab>` (in `src/components/roster/employee-detail.tsx` or the modal). Update the props passed to MetricsTab from `metrics={employee.metrics}` to:

```tsx
<MetricsTab
  current={employee.currentMetrics ?? null}
  trend={employee.monthlyTrend ?? []}
/>
```

Update the Employee type in `src/lib/types.ts` — add optional fields:
```ts
export interface Employee {
  // ... existing fields ...
  currentMetrics?: {
    taskCount: number
    adoptionRate: number
    accuracyRate: number
    hoursSaved: number
  }
  monthlyTrend?: {
    period: string
    taskCount: number
    adoptionRate: number
    accuracyRate: number
    hoursSaved: number
  }[]
}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/components/roster/tabs/metrics-tab.tsx src/app/api/employees/[id]/route.ts src/lib/types.ts
git commit -m "feat: employee metrics tab uses engine data with tooltips"
```

---

### Phase 5: Cleanup

---

### Task 9: Delete dead API routes and verify

**Files:**
- Delete: `src/app/api/dashboard/summary/route.ts`
- Delete: `src/app/api/dashboard/heatmap/route.ts`
- Delete: `src/app/api/dashboard/team-comparison/route.ts`
- Delete: `src/app/api/dashboard/recent-tasks/route.ts`

- [ ] **Step 1: Delete the dead routes**

```bash
rm -rf src/app/api/dashboard/
```

- [ ] **Step 2: Verify no imports reference them**

```bash
grep -r "api/dashboard" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Should return nothing (or only references in comments/docs). If any code references these, update it.

- [ ] **Step 3: Full build verification**

Run: `npm run build 2>&1 | tail -30`

The build should succeed. If there are errors, fix them.

- [ ] **Step 4: Start dev server and visually verify**

Run: `npm run dev`

Check each page in the browser:
- `/dashboard` — KPI cards show values, gauge shows index, tooltips appear on hover
- `/production` — stat cards show values with tooltips
- `/roster` — employee cards show metrics with tooltips, detail modal metrics tab works

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete dead /api/dashboard routes, verify full build"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| Phase 1 | Tasks 1-2 | metric-engine.ts + MetricTooltip component |
| Phase 2 | Tasks 3-5 | Dashboard fully migrated to engine + tooltips |
| Phase 3 | Task 6 | Production page migrated + tooltips |
| Phase 4 | Tasks 7-8 | Roster page migrated + tooltips |
| Phase 5 | Task 9 | Dead code cleanup + full verification |
