"use client"

import { Card } from "@/components/ui/card"
import { MetricTooltip } from "@/components/shared/metric-tooltip"
import type { HeatmapEntry } from "@/lib/dashboard-types"

type TeamKey = "management" | "design" | "production"

interface Props {
  data: HeatmapEntry[]
  endDate: string
  filterTeam: string | null
  onEmployeeClickAction: (employeeId: string) => void
}

const TEAM_ORDER: TeamKey[] = ["management", "design", "production"]

const TEAM_META: Record<TeamKey, { label: string; color: string; soft: string }> = {
  management: {
    label: "管理",
    color: "var(--color-nd-violet)",
    soft: "rgba(152,89,231,0.18)",
  },
  design: {
    label: "设计",
    color: "var(--color-nd-primary)",
    soft: "rgba(18,102,249,0.18)",
  },
  production: {
    label: "生产",
    color: "var(--color-nd-emerald)",
    soft: "rgba(31,190,125,0.18)",
  },
}

function createTeamTotals(): Record<TeamKey, number> {
  return { management: 0, design: 0, production: 0 }
}

function isTeamKey(team: string): team is TeamKey {
  return team === "management" || team === "design" || team === "production"
}

function formatShortDate(date: string): string {
  return date.slice(5).replace("-", ".")
}

function buildPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ")
}

export function ActivityPulseChart({ data, endDate, filterTeam, onEmployeeClickAction }: Props) {
  const filteredData = filterTeam ? data.filter((d) => d.team === filterTeam) : data
  const endTime = new Date(`${endDate}T00:00:00Z`).getTime()
  const dates = Array.from({ length: 30 }, (_, index) =>
    new Date(endTime - (29 - index) * 86400000).toISOString().slice(0, 10),
  )
  const dateIndex = new Map(dates.map((date, index) => [date, index]))
  const daily = dates.map((date) => ({ date, total: 0, teams: createTeamTotals() }))
  const teamTotals = createTeamTotals()
  const employeeTotals = new Map<string, { id: string; name: string; team: string; count: number }>()

  for (const entry of filteredData) {
    const index = dateIndex.get(entry.date)
    if (index === undefined) continue

    const team = isTeamKey(entry.team) ? entry.team : null
    daily[index].total += entry.count
    if (team) {
      daily[index].teams[team] += entry.count
      teamTotals[team] += entry.count
    }

    const current = employeeTotals.get(entry.employeeId) ?? {
      id: entry.employeeId,
      name: entry.employeeName,
      team: entry.team,
      count: 0,
    }
    current.count += entry.count
    employeeTotals.set(entry.employeeId, current)
  }

  const total = daily.reduce((sum, day) => sum + day.total, 0)
  const maxDaily = Math.max(...daily.map((day) => day.total), 1)
  const peakDay = daily.reduce((peak, day) => (day.total > peak.total ? day : peak), daily[0])
  const activeEmployees = employeeTotals.size
  const averageDaily = total / dates.length
  const topEmployees = Array.from(employeeTotals.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const topCount = Math.max(...topEmployees.map((employee) => employee.count), 1)
  const points = daily.map((day, index) => {
    const x = dates.length === 1 ? 0 : (index / (dates.length - 1)) * 100
    const y = 88 - (day.total / maxDaily) * 68
    return { x, y }
  })
  const linePath = buildPath(points)
  const areaPath = `${linePath} L 100 96 L 0 96 Z`
  const hasActivity = total > 0

  return (
    <Card variant="glass" className="relative min-h-[480px] gap-0 overflow-hidden p-0">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,102,249,0.18),transparent_34%),linear-gradient(180deg,rgba(19,236,209,0.08),transparent_52%)]"
      />
      <div className="relative grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_286px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[color:var(--color-nd-void-edge)]">
                生产脉冲
              </div>
              <h3 className="mt-1 text-base font-semibold text-nd-ink">30 天生产脉冲</h3>
            </div>
            <span className="rounded-full border border-[color:var(--color-nd-glass-border)] bg-nd-surface/55 px-3 py-1 text-xs text-nd-ink-soft">
              {filterTeam
                ? `已筛选：${filterTeam === "management" ? "管理团队" : filterTeam === "design" ? "设计师团队" : "生产团队"}`
                : "全团队任务完成信号"}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-nd-md border border-[color:var(--color-nd-glass-border)]/70 bg-nd-surface/45 p-3">
              <div className="text-xs font-semibold text-nd-ink-soft">
                <MetricTooltip metricKey="taskCount" description="近 30 天窗口内完成的任务总数">
                  总完成
                </MetricTooltip>
              </div>
              <div className="mt-1 font-nd-display text-2xl font-bold text-nd-ink">{total}</div>
            </div>
            <div className="rounded-nd-md border border-[color:var(--color-nd-glass-border)]/70 bg-nd-surface/45 p-3">
              <div className="text-xs font-semibold text-nd-ink-soft">
                <MetricTooltip description="近 30 天中单日完成任务数最高的一天">
                  单日峰值
                </MetricTooltip>
              </div>
              <div className="mt-1 font-nd-display text-2xl font-bold text-nd-accent">{peakDay.total}</div>
            </div>
            <div className="rounded-nd-md border border-[color:var(--color-nd-glass-border)]/70 bg-nd-surface/45 p-3">
              <div className="text-xs font-semibold text-nd-ink-soft">
                <MetricTooltip description="近 30 天内至少完成过一个任务的 AI 员工数量">
                  参与员工
                </MetricTooltip>
              </div>
              <div className="mt-1 font-nd-display text-2xl font-bold text-[color:var(--color-nd-void-edge)]">
                {activeEmployees}
              </div>
            </div>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-nd-lg border border-[color:var(--color-nd-glass-border)]/70 bg-[linear-gradient(180deg,rgba(7,11,28,0.82),rgba(13,21,48,0.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div
              aria-hidden="true"
              className="absolute inset-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:100%_25%,12.5%_100%]"
            />
            <div
              aria-hidden="true"
              className="nd-pulse-sweep absolute bottom-4 top-4 w-14 bg-[linear-gradient(90deg,transparent,rgba(19,236,209,0.22),transparent)]"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="relative h-[250px] w-full overflow-visible"
              role="img"
              aria-label={`近 30 天共完成 ${total} 个任务，峰值日为 ${formatShortDate(peakDay.date)}，完成 ${peakDay.total} 个任务`}
            >
              <defs>
                <linearGradient id="activityPulseArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-nd-void-edge)" stopOpacity="0.34" />
                  <stop offset="58%" stopColor="var(--color-nd-primary)" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="var(--color-nd-primary)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="activityPulseLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="var(--color-nd-primary)" />
                  <stop offset="50%" stopColor="var(--color-nd-void-edge)" />
                  <stop offset="100%" stopColor="var(--color-nd-accent)" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#activityPulseArea)" />
              <path
                d={linePath}
                fill="none"
                stroke="url(#activityPulseLine)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.8"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="relative mt-2 flex items-center justify-between text-[10px] font-medium text-nd-ink-soft">
              <span>{formatShortDate(dates[0])}</span>
              <span>日均 {averageDaily.toFixed(1)} 项</span>
              <span>{formatShortDate(endDate)}</span>
            </div>
            {!hasActivity && (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(7,11,28,0.58)] text-center">
                <div>
                  <div className="font-nd-display text-3xl font-bold text-[color:var(--color-nd-void-edge)]">0</div>
                  <p className="mt-2 text-sm text-nd-ink">近 30 天暂无完成任务信号</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            {TEAM_ORDER.map((team) => {
              const maxTeamDay = Math.max(...daily.map((day) => day.teams[team]), 1)
              const meta = TEAM_META[team]
              return (
                <div
                  key={team}
                  className="grid grid-cols-[56px_1fr_52px] items-center gap-3 rounded-nd-md border border-[color:var(--color-nd-glass-border)]/55 bg-nd-surface/42 px-3 py-2"
                >
                  <span className="text-xs font-semibold text-nd-ink">{meta.label}</span>
                  <div className="flex h-9 items-end gap-1">
                    {daily.map((day) => {
                      const value = day.teams[team]
                      const height = value > 0 ? Math.max(16, (value / maxTeamDay) * 100) : 10
                      return (
                        <div
                          key={`${team}-${day.date}`}
                          className="min-w-1 flex-1 rounded-t-[3px]"
                          style={{
                            height: `${height}%`,
                            background: value > 0 ? meta.color : meta.soft,
                            opacity: value > 0 ? 0.94 : 0.38,
                          }}
                          title={`${meta.label} · ${day.date} · ${value} 项`}
                        />
                      )
                    })}
                  </div>
                  <span className="text-right font-nd-display text-sm font-bold" style={{ color: meta.color }}>
                    {teamTotals[team]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="border-t border-[color:var(--color-nd-glass-border)]/60 bg-nd-surface/35 p-5 lg:border-l lg:border-t-0">
          <div className="text-xs font-semibold text-nd-primary">贡献排行</div>
          <h4 className="mt-1 text-sm font-semibold text-nd-ink">活跃贡献榜</h4>

          <div className="mt-4 space-y-3">
            {topEmployees.length > 0 ? (
              topEmployees.map((employee, index) => {
                const team = isTeamKey(employee.team) ? employee.team : "production"
                const meta = TEAM_META[team]
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => onEmployeeClickAction(employee.id)}
                    className="group w-full rounded-nd-md border border-[color:var(--color-nd-glass-border)]/55 bg-nd-surface/55 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-nd-surface/85 active:translate-y-[1px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-nd-ink">
                          {index + 1}. {employee.name}
                        </div>
                        <div className="mt-0.5 text-xs text-nd-ink-soft">{meta.label}团队</div>
                      </div>
                      <div className="font-nd-display text-lg font-bold" style={{ color: meta.color }}>
                        {employee.count}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-nd-line">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${(employee.count / topCount) * 100}%`, background: meta.color }}
                      />
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-nd-md border border-dashed border-[color:var(--color-nd-glass-border)]/70 p-4 text-sm text-nd-ink-soft">
                暂无可排行的活跃记录。
              </div>
            )}
          </div>

          <div className="mt-5 rounded-nd-lg border border-[color:var(--color-nd-glass-border)]/55 bg-[rgba(19,236,209,0.06)] p-4">
            <div className="text-xs text-nd-ink-soft">峰值日</div>
            <div className="mt-1 font-nd-display text-xl font-bold text-nd-ink">{formatShortDate(peakDay.date)}</div>
            <p className="mt-2 text-xs leading-5 text-nd-ink-soft">
              当天完成 {peakDay.total} 项任务，是当前 30 天窗口的最高生产脉冲。
            </p>
          </div>
        </aside>
      </div>
    </Card>
  )
}
