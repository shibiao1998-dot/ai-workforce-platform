"use client"

import { Card } from "@/components/ui/card"
import { MetricTooltip } from "@/components/shared/metric-tooltip"
import { NdTeamCrest } from "@/components/netdragon"
import type { TeamStatus } from "@/lib/dashboard-types"

interface Props {
  teamStatus: TeamStatus[]
  onTeamClick: (team: string) => void
}

export function TeamStatusPanel({ teamStatus, onTeamClick }: Props) {
  return (
    <Card variant="glass" className="h-full gap-0 p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-nd-primary">团队状态</div>
          <h3 className="mt-1 text-sm font-semibold text-nd-ink">
            <MetricTooltip metricKey="teamHealth">团队战情</MetricTooltip>
          </h3>
        </div>
        <span className="text-xs text-nd-ink-soft">点击查看成员</span>
      </div>
      <div className="divide-y divide-[color:var(--color-nd-line)]/70">
        {teamStatus.map((ts) => {
          const healthPct = Math.round(ts.healthRate * 100)
          const healthTone =
            healthPct >= 80
              ? "bg-nd-emerald"
              : healthPct >= 60
                ? "bg-nd-primary"
                : "bg-nd-accent"
          return (
            <button
              key={ts.team}
              type="button"
              onClick={() => onTeamClick(ts.team)}
              className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3 text-left transition-all duration-300 hover:px-2 hover:bg-nd-surface/55 active:translate-y-[1px]"
              aria-label={`${ts.teamLabel}、在岗 ${ts.activeCount} / ${ts.totalCount}、产能 ${healthPct}%`}
            >
              <div aria-hidden="true">
                <NdTeamCrest team={ts.team} className="w-9" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="truncate text-sm font-semibold text-nd-ink">{ts.teamLabel}</div>
                </div>
                <div className="mt-1 text-xs text-nd-ink-soft">
                  {ts.activeCount}/{ts.totalCount} 在岗
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nd-line">
                  <div
                    className={`h-full rounded-full ${healthTone}`}
                    style={{ width: `${healthPct}%` }}
                  />
                </div>
              </div>
              <div className="font-nd-display text-sm font-bold text-nd-ink">{healthPct}%</div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
