"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { EmployeeDetailModal } from "@/components/shared/employee-detail-modal"
import { TaskDetailDialog } from "@/components/production/task-detail-dialog"
import { Card } from "@/components/ui/card"
import { MetricTooltip } from "@/components/shared/metric-tooltip"
import { NdPipelineFlow, NdScenePortrait } from "@/components/netdragon"
import { KpiSection } from "./kpi-section"
import { ActivityPulseChart } from "./activity-heatmap"
import { TaskFeed } from "./task-feed"
import { TeamStatusPanel } from "./team-status-panel"
import { TeamDrawer } from "./team-drawer"
import { AchievementFeed } from "./achievement-feed"
import type {
  DashboardSummary,
  TeamStatus,
  KpiItem,
  KpiTrendSeries,
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
  kpiTrend: KpiTrendSeries
  efficiencyTrend: TeamEfficiencyPoint[]
  heatmapEndDate: string
  renderedAtMs: number
  heatmapData: HeatmapEntry[]
  leaderboard: LeaderboardEntry[]
  recentTasks: RecentTaskEntry[]
  recentAchievements: AchievementFeedEntry[]
  pipelineNodes: PipelineNodeStat[]
}

const TEAM_LABEL: Record<string, string> = {
  management: "管理",
  design: "设计",
  production: "生产",
}

const SCENE_ASSETS = [
  "scene-ai-product-manager",
  "scene-ai-character-designer",
  "scene-ai-game-designer",
  "scene-ai-screenwriter",
  "scene-ai-movie-artist",
  "scene-ai-role-designer",
]

function formatPct(value: number): string {
  return `${Math.round(value)}%`
}

function formatCurrency(value: number): string {
  return `¥${Math.round(value).toLocaleString("zh-CN")}`
}

function SectionTitle({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string
  title: string
  meta?: string
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div>
        <div className="text-xs font-semibold text-nd-primary">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-sm font-semibold tracking-tight text-nd-ink">{title}</h2>
      </div>
      {meta && <span className="text-xs text-nd-ink-soft">{meta}</span>}
    </div>
  )
}

function HeroReadout({
  label,
  value,
  detail,
  metricKey,
  description,
}: {
  label: string
  value: string | number
  detail: string
  metricKey?: string
  description?: string
}) {
  return (
    <div className="border-t border-white/15 pt-3">
      <div className="text-xs font-semibold text-white/58">
        {metricKey || description ? (
          <MetricTooltip metricKey={metricKey} description={description}>
            {label}
          </MetricTooltip>
        ) : (
          label
        )}
      </div>
      <div className="mt-1 font-nd-display text-2xl font-bold leading-none text-white">{value}</div>
      <div className="mt-1 text-xs text-white/65">{detail}</div>
    </div>
  )
}

function CompactReadout({
  label,
  value,
  tone = "primary",
}: {
  label: string
  value: string
  tone?: "primary" | "edge" | "accent" | "emerald"
}) {
  const toneClass = {
    primary: "text-nd-primary",
    edge: "text-[color:var(--color-nd-void-edge)]",
    accent: "text-nd-accent",
    emerald: "text-nd-emerald",
  }[tone]

  return (
    <div className="rounded-nd-md border border-white/10 bg-white/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="text-xs font-semibold text-white/52">{label}</div>
      <div className={`mt-1 font-nd-display text-lg font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}

export function DashboardShell({
  summary,
  teamStatus,
  kpiItems,
  kpiTrend,
  efficiencyTrend,
  heatmapEndDate,
  renderedAtMs,
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
  const operationalPct = Math.round(summary.operationalIndex ?? 0)
  const totalEmployees = teamStatus.reduce((sum, t) => sum + t.totalCount, 0)
  const adoptionPct = Math.round(summary.adoptionRate)
  const accuracyPct = Math.round(summary.accuracyRate)
  const completedPipelineCount = pipelineNodes.reduce((sum, node) => sum + node.count, 0)
  const topLeaders = leaderboard.slice(0, 3)
  const latestEfficiency = efficiencyTrend.at(-1)
  const previousEfficiency = efficiencyTrend.at(-2)
  const latestCompletedTotal = latestEfficiency
    ? latestEfficiency.management + latestEfficiency.design + latestEfficiency.production
    : 0
  const previousCompletedTotal = previousEfficiency
    ? previousEfficiency.management + previousEfficiency.design + previousEfficiency.production
    : latestCompletedTotal
  const outputDelta = latestCompletedTotal - previousCompletedTotal
  const taskKpi = kpiItems.find((k) => k.key === "taskCount")
  const taskTrendPct = taskKpi?.trendPct ?? 0
  const taskTrendDir = taskKpi?.trendDirection ?? "neutral"
  const trendText =
    taskTrendDir === "up"
      ? `较上月 ↑${taskTrendPct}%`
      : taskTrendDir === "down"
        ? `较上月 ↓${taskTrendPct}%`
        : `与上月持平`
  return (
    <div className="nd-command-cockpit relative min-h-[100dvh] overflow-hidden bg-nd-canvas px-4 py-4 text-nd-ink sm:px-5 lg:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(90deg,rgba(19,236,209,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(18,102,249,0.055)_1px,transparent_1px),linear-gradient(135deg,rgba(18,102,249,0.20),transparent_32%,rgba(10,13,31,0.92)_72%)] bg-[size:42px_42px,42px_42px,100%_100%]"
      />

      <div className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-4">
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(360px,0.72fr)]">
          <div className="relative min-h-[430px] overflow-hidden rounded-nd-xl bg-[color:var(--color-nd-void)] p-5 text-white shadow-nd-lg sm:p-7 lg:p-8">
            <Image
              aria-hidden="true"
              src="/netdragon/hero/hero-dashboard-desktop.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 62vw, 100vw"
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(115deg,rgba(10,13,31,0.95)_0%,rgba(10,13,31,0.78)_42%,rgba(10,13,31,0.28)_100%)]"
            />
            <div
              aria-hidden="true"
              className="nd-scanline absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(19,236,209,0.8),transparent)]"
            />
            <div className="relative flex h-full min-h-[360px] flex-col justify-between gap-8">
              <div className="max-w-[760px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[color:var(--color-nd-void-edge)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  网龙 · AI 员工指挥中心
                </div>
                <h1 className="mt-6 max-w-[820px] text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl">
                  <span className="relative inline-block bg-[linear-gradient(100deg,#ffffff_0%,#d9fbff_36%,#33dfeb_68%,#7aa7ff_100%)] bg-clip-text text-transparent [text-shadow:0_0_26px_rgba(19,236,209,0.22),0_14px_38px_rgba(0,0,0,0.48)]">
                    AI 员工生产指挥台
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-2 left-1 h-px w-[86%] bg-[linear-gradient(90deg,rgba(19,236,209,0.86),rgba(18,102,249,0.42),transparent)]"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute -right-5 top-2 h-3 w-3 border-r border-t border-[rgba(19,236,209,0.86)]"
                    />
                  </span>
                </h1>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <HeroReadout
                  label="本月任务"
                  metricKey="taskCount"
                  value={summary.monthlyTaskCount.toLocaleString("zh-CN")}
                  detail={trendText}
                />
                <HeroReadout
                  label="经营指数"
                  metricKey="operationalIndex"
                  value={formatPct(operationalPct)}
                  detail={`采纳 ${adoptionPct}% · 准确 ${accuracyPct}%`}
                />
                <HeroReadout
                  label="在岗员工"
                  description="当前处于在岗状态的 AI 员工数量 / 全部 AI 员工数量"
                  value={`${totalActive}/${totalEmployees}`}
                  detail="AI 员工当前在岗"
                />
              </div>
            </div>
          </div>

          <Card variant="void" className="relative min-h-[430px] gap-0 p-5 shadow-nd-lg sm:p-6">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,236,209,0.10),transparent_46%)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-[color:var(--color-nd-void-edge)]">
                    明星员工
                  </div>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">累计明星员工</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 font-nd-display text-xs text-white/70">
                  {topLeaders.length > 0 ? "No.1" : "暂无"}
                </div>
              </div>

              <div className="mt-4 grid flex-1 grid-cols-[1.05fr_0.95fr] gap-3">
                {topLeaders[0] ? (
                  <NdScenePortrait
                    assetId={SCENE_ASSETS[0]}
                    name={topLeaders[0].employeeName}
                    title={`${TEAM_LABEL[topLeaders[0].team] ?? topLeaders[0].team}团队`}
                    meta={`${topLeaders[0].xp.toLocaleString("zh-CN")} XP · Lv.${topLeaders[0].level}`}
                    className="min-h-[292px]"
                    onClick={() => handleEmployeeClick(topLeaders[0].employeeId)}
                  />
                ) : (
                  <div className="rounded-nd-lg border border-white/10 bg-white/[0.06]" />
                )}

                <div className="flex flex-col gap-3">
                  <CompactReadout label="节省成本" value={formatCurrency(summary.costSaved)} tone="accent" />
                  <CompactReadout label="本期完成" value={latestCompletedTotal.toLocaleString("zh-CN")} tone="edge" />
                  <div className="flex-1 rounded-nd-lg border border-white/10 bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <div className="text-xs font-semibold text-white/52">
                      产出变化
                    </div>
                    <div className="mt-2 font-nd-display text-2xl font-bold text-white">
                      {outputDelta >= 0 ? "+" : ""}
                      {outputDelta}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-white/58">较上一周期完成任务变化</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle eyebrow="关键指标" title="本月关键指标" meta="点击指标进入明细" />
          <KpiSection kpiItems={kpiItems} trendSeries={kpiTrend} onNavigate={handleKpiNavigate} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
          <Card variant="glass" className="gap-0 p-5">
            <SectionTitle
              eyebrow="产线流转"
              title="今日产线流转"
              meta={completedPipelineCount > 0 ? `${completedPipelineCount} 项正在流转` : "等待今日流转信号"}
            />
            <div className="rounded-nd-lg border border-[color:var(--color-nd-glass-border)]/70 bg-nd-surface/55 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <NdPipelineFlow nodes={pipelineNodes.map((n) => ({ ...n, active: n.count > 0 }))} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              {teamStatus.map((team) => {
                const healthPct = Math.round(team.healthRate * 100)
                return (
                  <button
                    key={team.team}
                    type="button"
                    onClick={() => setDrawerTeam(team.team)}
                    className="group rounded-nd-md border border-[color:var(--color-nd-glass-border)]/60 bg-nd-surface/50 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-nd-surface/80 active:translate-y-[1px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-nd-ink">{team.teamLabel}</span>
                      <span className="font-nd-display text-sm font-bold text-nd-primary">{healthPct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nd-line">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-nd-primary),var(--color-nd-void-edge))] transition-[width] duration-500"
                        style={{ width: `${healthPct}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-nd-ink-soft">
                      {team.activeCount}/{team.totalCount} 在岗
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <TeamStatusPanel teamStatus={teamStatus} onTeamClick={setDrawerTeam} />
        </section>

        <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
          <ActivityPulseChart
            data={heatmapData}
            endDate={heatmapEndDate}
            filterTeam={null}
            onEmployeeClickAction={handleEmployeeClick}
          />
          <div className="flex h-full min-h-0 flex-col gap-4">
            <AchievementFeed
              className="min-h-0 flex-1"
              renderedAtMs={renderedAtMs}
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
            <TaskFeed
              compact
              className="shrink-0"
              tasks={recentTasks}
              renderedAtMs={renderedAtMs}
              onTaskClick={setSelectedTaskId}
            />
          </div>
        </section>
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
