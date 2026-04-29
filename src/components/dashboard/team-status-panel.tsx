"use client"

import { Card } from "@/components/ui/card"
import { NdTeamCrest } from "@/components/netdragon"
import type { TeamStatus } from "@/lib/dashboard-types"

interface Props {
  teamStatus: TeamStatus[]
  onTeamClick: (team: string) => void
}

export function TeamStatusPanel({ teamStatus, onTeamClick }: Props) {
  return (
    <Card className="h-full p-4">
      <h3 className="mb-3 text-sm font-semibold text-nd-ink">团队状态</h3>
      <div className="flex flex-col gap-2">
        {teamStatus.map((ts) => {
          const healthPct = Math.round(ts.healthRate * 100)
          return (
            <div
              key={ts.team}
              onClick={() => onTeamClick(ts.team)}
              className="flex cursor-pointer items-center gap-3 rounded-nd-md p-2 transition-colors hover:bg-nd-canvas"
              role="button"
              tabIndex={0}
              aria-label={`${ts.teamLabel}、在岗 ${ts.activeCount} / ${ts.totalCount}、产能 ${healthPct}%`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onTeamClick(ts.team)
              }}
            >
              <div aria-hidden="true">
                <NdTeamCrest team={ts.team} className="w-8" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-nd-ink">{ts.teamLabel}</div>
                <div className="text-xs text-nd-ink-soft">
                  {ts.activeCount}/{ts.totalCount} 在岗 · 产能 {healthPct}%
                </div>
              </div>
              <div className="font-nd-display text-sm font-bold text-nd-ink">{healthPct}%</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
