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
