"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal"
import { TaskDetailDialog } from "@/components/production/task-detail-dialog"
import { Card } from "@/components/ui/card"
import { NdVoidBlock, NdPipelineFlow } from "@/components/netdragon"
import { KpiSection } from "./kpi-section"
import { ActivityHeatmap } from "./activity-heatmap"
import { TaskFeed } from "./task-feed"
import { TeamStatusPanel } from "./team-status-panel"
import { TeamDrawer } from "./team-drawer"
import { AchievementFeed } from "./achievement-feed"
import type {
  DashboardSummary,
  TeamStatus,
  KpiItem,
  TeamEfficiencyPoint,
  HeatmapEntry,
  LeaderboardEntry,
  RecentTaskEntry,
  PipelineNodeStat,
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
  pipelineNodes: PipelineNodeStat[]
}

export function DashboardShell({
  summary,
  teamStatus,
  kpiItems,
  heatmapData,
  leaderboard,
  recentTasks,
  recentAchievements,
  pipelineNodes,
}: DashboardShellProps) {
  const router = useRouter()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [drawerTeam, setDrawerTeam] = useState<string | null>(null)

  function handleEmployeeClick(employeeId: string) {
    setSelectedEmployeeId(employeeId)
  }

  function handleKpiNavigate(href: string | null) {
    if (href) router.push(href)
  }

  // 派生:在岗总数(TeamStatus activeCount 之和)
  const totalActive = teamStatus.reduce((sum, t) => sum + t.activeCount, 0)
  const operationalPct = Math.round((summary.operationalIndex ?? 0) * 100)

  return (
    <div className="min-h-screen bg-nd-canvas p-6">
      {/* 区块 1 · Hero 欢迎区 */}
      <NdVoidBlock className="mb-4">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-[color:var(--color-nd-void-edge)]">
              NetDragon · Digital Craft Factory
            </div>
            <h1 className="mt-2 text-3xl font-bold">早安,今日产线已启动</h1>
            <p className="mt-3 text-sm opacity-80">
              <span className="font-nd-display text-[color:var(--color-nd-accent)]">{totalActive}</span>
              <span> 位 AI 员工在岗 · 本月</span>
              <span className="font-nd-display text-[color:var(--color-nd-accent)]">{summary.monthlyTaskCount}</span>
              <span> 个任务流转 · 整体产能 </span>
              <span className="font-nd-display text-[color:var(--color-nd-void-edge)]">{operationalPct}%</span>
            </p>
          </div>
        </div>
      </NdVoidBlock>

      {/* 区块 2 · KPI 矩阵 */}
      <div className="mb-4">
        <KpiSection kpiItems={kpiItems} onNavigate={handleKpiNavigate} />
      </div>

      {/* 区块 3 · 产线流转 + 团队状态 */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <Card className="col-span-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-nd-ink">今日产线流转</h3>
            <span className="text-xs text-nd-ink-soft">实时更新</span>
          </div>
          <NdPipelineFlow nodes={pipelineNodes.map((n) => ({ ...n, active: n.count > 0 }))} />
        </Card>
        <TeamStatusPanel teamStatus={teamStatus} onTeamClick={setDrawerTeam} />
      </div>

      {/* 区块 4 · 活动热力 + 成就 + 近期任务(3 列) */}
      <div className="grid grid-cols-3 gap-4">
        <ActivityHeatmap
          data={heatmapData}
          filterTeam={null}
          onEmployeeClick={handleEmployeeClick}
        />
        <AchievementFeed
          achievements={recentAchievements.map((a, i) => ({
            id: `${a.employeeId}-${a.achievementKey}-${i}`,
            employeeId: a.employeeId,
            employeeName: a.employeeName,
            team: a.team,
            achievementKey: a.achievementKey,
            achievementEmoji: a.achievementEmoji,
            achievementName: a.achievementName,
            earnedAt: a.earnedAt,
          }))}
        />
        <TaskFeed tasks={recentTasks} onTaskClick={setSelectedTaskId} />
      </div>

      {/* 弹窗层 */}
      <EmployeeDetailModal
        employeeId={selectedEmployeeId}
        open={selectedEmployeeId !== null}
        onOpenChange={(open) => { if (!open) setSelectedEmployeeId(null) }}
      />
      <TaskDetailDialog
        taskId={selectedTaskId}
        open={selectedTaskId !== null}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null) }}
      />
      <TeamDrawer
        team={drawerTeam}
        open={drawerTeam !== null}
        onOpenChange={(open) => { if (!open) setDrawerTeam(null) }}
        members={leaderboard.filter((e) => e.team === drawerTeam)}
        healthRate={teamStatus.find((t) => t.team === drawerTeam)?.healthRate ?? 0}
        activeCount={teamStatus.find((t) => t.team === drawerTeam)?.activeCount ?? 0}
        totalCount={teamStatus.find((t) => t.team === drawerTeam)?.totalCount ?? 0}
      />
    </div>
  )
}
