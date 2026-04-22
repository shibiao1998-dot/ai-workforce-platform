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
