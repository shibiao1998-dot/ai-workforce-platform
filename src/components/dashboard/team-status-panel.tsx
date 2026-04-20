"use client"

import type { TeamStatus } from "@/lib/dashboard-types"

interface Props {
  teamStatus: TeamStatus[]
  onTeamClick: (team: string) => void
}

const TEAM_COLORS: Record<string, { border: string; bar: string; bg: string }> = {
  management: { border: "#8b5cf6", bar: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  design: { border: "#3b82f6", bar: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  production: { border: "#22c55e", bar: "#22c55e", bg: "rgba(34,197,94,0.08)" },
}

export function TeamStatusPanel({ teamStatus, onTeamClick }: Props) {

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h3 className="text-sm font-semibold text-[#1e293b] mb-1">团队状态概览</h3>
      {teamStatus.map((ts) => {
        const colors = TEAM_COLORS[ts.team] ?? { border: "#64748b", bar: "#64748b", bg: "rgba(100,116,139,0.08)" }
        const healthPct = Math.round(ts.healthRate * 100)

        return (
          <div
            key={ts.team}
            onClick={() => onTeamClick(ts.team)}
            className="flex-1 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderLeft: `4px solid ${colors.border}`, background: colors.bg }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#1e293b]">{ts.teamLabel}</span>
              <span className="text-xs text-[#64748b]">{ts.activeCount}/{ts.totalCount} 在线</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${healthPct}%`, background: colors.bar }}
              />
            </div>
            <p className="text-xs text-[#64748b] mt-1">健康度 {healthPct}%</p>
          </div>
        )
      })}
    </div>
  )
}
