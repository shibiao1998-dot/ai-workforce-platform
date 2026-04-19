"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { LeaderboardEntry } from "@/lib/dashboard-types"

interface Props {
  entries: LeaderboardEntry[]
  onEmployeeClick: (employeeId: string) => void
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-[#8b5cf6]",
  design: "border-[#3b82f6]",
  production: "border-[#22c55e]",
}

const RANK_STYLES: Record<number, string> = {
  1: "text-[#f59e0b] text-xl font-black",
  2: "text-[#94a3b8] text-base font-bold",
  3: "text-[#cd7f32] text-base font-bold",
}

function RankChangeIcon({ change }: { change: number }) {
  if (change > 0) return <span className="text-[10px] text-green-500">↑{change}</span>
  if (change < 0) return <span className="text-[10px] text-red-500">↓{Math.abs(change)}</span>
  return <span className="text-[10px] text-[#64748b]">—</span>
}

export function LeaderboardPanel({ entries, onEmployeeClick }: Props) {
  const [tab, setTab] = useState<"week" | "month">("month")

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">实时排行榜 🏆</h3>
        <div className="flex rounded-lg overflow-hidden border border-[#e2e8f0] text-xs">
          <button
            onClick={() => setTab("week")}
            className={cn("px-3 py-1 transition-colors", tab === "week" ? "bg-indigo-500 text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]")}
          >
            本周
          </button>
          <button
            onClick={() => setTab("month")}
            className={cn("px-3 py-1 transition-colors", tab === "month" ? "bg-indigo-500 text-white" : "bg-white text-[#64748b] hover:bg-[#f8fafc]")}
          >
            本月
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#64748b] text-center">暂无排行数据</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 overflow-y-auto">
          {entries.slice(0, 5).map((entry, idx) => {
            const rank = idx + 1
            return (
              <div
                key={entry.employeeId}
                onClick={() => onEmployeeClick(entry.employeeId)}
                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.9)" }}
              >
                <span className={cn("w-6 text-center flex-shrink-0", RANK_STYLES[rank] ?? "text-sm font-semibold text-[#475569]")}>
                  {rank}
                </span>
                <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold bg-[#e2e8f0] border-2", TEAM_BORDER[entry.team] ?? "border-[#64748b]")}>
                  {entry.employeeName.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[#1e293b] truncate">{entry.employeeName}</span>
                    <span className="text-xs rounded px-1 py-0.5 flex-shrink-0 font-medium" style={{ background: entry.levelColor + "20", color: entry.levelColor }}>
                      {entry.levelEmoji} Lv.{entry.level}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b]">{entry.xp.toLocaleString()} XP</p>
                </div>
                <RankChangeIcon change={entry.rankChange} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
