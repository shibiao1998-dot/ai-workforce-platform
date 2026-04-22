import { db } from "@/db"
import { tasks, metricConfigs } from "@/db/schema"
import { eq, and, gte, lte, isNull } from "drizzle-orm"
import type { TeamType } from "@/lib/types"
import { TOKEN_COST_RATE } from "./metric-defs"

export { METRIC_DEFS, TOKEN_COST_RATE } from "./metric-defs"
export type { MetricDef } from "./metric-defs"

// ─── Step 1: Metric definitions and types ────────────────────────────────────

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

// ─── Step 2: Time range helpers and core query ────────────────────────────────

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
    .select({ taskType: metricConfigs.taskType, humanBaseline: metricConfigs.humanBaseline })
    .from(metricConfigs)
    .where(and(isNull(metricConfigs.employeeId), isNull(metricConfigs.team)))
  return new Map(configs.map((c) => [c.taskType, c.humanBaseline]))
}

// ─── Step 3: computeMetrics and getMetrics ────────────────────────────────────

function computeMetrics(rows: TaskRow[], baselines: Map<string, number>, costPerHour: number): MetricValues {
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

// ─── Step 4: Trend helpers and KPI items ─────────────────────────────────────

export function calcTrend(
  current: number,
  prev: number,
): { trendPct: number; trendDirection: "up" | "down" | "neutral" } {
  if (prev === 0) return { trendPct: 0, trendDirection: "neutral" }
  const pct = Math.round(((current - prev) / prev) * 100)
  return { trendPct: Math.abs(pct), trendDirection: pct > 0 ? "up" : pct < 0 ? "down" : "neutral" }
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

export async function getKpiItems(currentMonth: string, prevMonth: string): Promise<KpiItemEngine[]> {
  const [cur, prev] = await Promise.all([getMetrics({ period: currentMonth }), getMetrics({ period: prevMonth })])
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

// ─── Step 5: Team efficiency trend and monthly trend ──────────────────────────

export interface TeamEfficiencyPoint {
  month: string
  management: number
  design: number
  production: number
}

export async function getTeamEfficiencyTrend(months: string[]): Promise<TeamEfficiencyPoint[]> {
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

export async function getMonthlyTrend(employeeId: string, months: string[]): Promise<MonthlyTrendPoint[]> {
  const [baselines, costPerHour] = await Promise.all([getHumanBaselines(), getGlobalCostPerHour()])
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

// ─── Step 6: Employee ranking and per-employee metrics ────────────────────────

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
    .select({ employeeId: tasks.employeeId, status: tasks.status, qualityScore: tasks.qualityScore })
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
    accuracyRate:
      e.scores.length > 0 ? +(e.scores.reduce((a, b) => a + b, 0) / e.scores.length).toFixed(1) : 0,
  }))
}
