"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal"
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
import type { AchievementFeedEntry } from "@/lib/dashboard-data"

interface DashboardShellProps {
  summary: DashboardSummary
  teamStatus: TeamStatus[]
  kpiItems: KpiItem[]
  efficiencyTrend: TeamEfficiencyPoint[]
  heatmapData: HeatmapEntry[]
  leaderboard: LeaderboardEntry[]
  recentTasks: RecentTaskEntry[]
  recentAchievements: AchievementFeedEntry[]
}

export function DashboardShell({
  summary,
  teamStatus,
  kpiItems,
  efficiencyTrend,
  heatmapData,
  leaderboard,
  recentTasks,
  recentAchievements,
}: DashboardShellProps) {
  const router = useRouter()
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  function handleTeamClick(team: string) {
    setSelectedTeam((prev) => (prev === team ? null : team))
  }

  function handleEmployeeClick(employeeId: string) {
    setSelectedEmployeeId(employeeId)
  }

  function handleKpiNavigate(href: string | null) {
    if (href) router.push(href)
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "linear-gradient(135deg, #f0f4f8, #e8eef5)" }}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1e293b]">AI 驾驶舱</h1>
        <p className="text-[#64748b] mt-1 text-sm">AI团队运营全景 · 实时数据驱动</p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="col-span-3">
          <OperationalIndexGauge summary={summary} />
        </div>
        <div className="col-span-2">
          <TeamStatusPanel teamStatus={teamStatus} />
        </div>
      </div>

      <div className="mb-4">
        <KpiSection kpiItems={kpiItems} onNavigate={handleKpiNavigate} />
      </div>

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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <ActivityHeatmap
            data={heatmapData}
            filterTeam={selectedTeam}
            onEmployeeClick={handleEmployeeClick}
          />
        </div>
        <div>
          <AchievementFeed
            achievements={recentAchievements.map((a, i) => ({
              id: `${a.employeeId}-${a.achievementKey}-${i}`,
              employeeId: a.employeeId,
              employeeName: a.employeeName,
              team: a.team,
              achievementEmoji: a.achievementEmoji,
              achievementName: a.achievementName,
              earnedAt: a.earnedAt,
            }))}
          />
        </div>
        <div>
          <TaskFeed tasks={recentTasks} />
        </div>
      </div>

      <EmployeeDetailModal
        employeeId={selectedEmployeeId}
        open={selectedEmployeeId !== null}
        onOpenChange={(open) => { if (!open) setSelectedEmployeeId(null) }}
      />
    </div>
  )
}
