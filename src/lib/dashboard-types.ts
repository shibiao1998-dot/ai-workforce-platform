import type { TeamType } from "./types"

export interface DashboardSummary {
  operationalIndex: number
  monthlyTaskCount: number
  completionRate: number
  adoptionRate: number
  accuracyRate: number
  costSaved: number
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
  href: string | null
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
  rankChange: number
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

export interface PipelineNodeStat {
  key: "intake" | "design" | "production" | "review" | "archive"
  label: string
  count: number
}

export interface KpiTrendSeries {
  taskCount: number[]
  adoptionRate: number[]
  accuracyRate: number[]
  hoursSaved: number[]
  costSaved: number[]
}
