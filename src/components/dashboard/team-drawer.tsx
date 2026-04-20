"use client"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import type { LeaderboardEntry } from "@/lib/dashboard-types"

const TEAM_META: Record<string, { label: string; color: string }> = {
  management: { label: "管理团队", color: "#8b5cf6" },
  design: { label: "设计团队", color: "#3b82f6" },
  production: { label: "生产团队", color: "#22c55e" },
}

interface TeamDrawerProps {
  team: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  members: LeaderboardEntry[]
  healthRate: number
  activeCount: number
  totalCount: number
}

export function TeamDrawer({ team, open, onOpenChange, members, healthRate, activeCount, totalCount }: TeamDrawerProps) {
  const router = useRouter()
  const meta = team ? TEAM_META[team] : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        />
        <DialogPrimitive.Popup
          className="fixed right-0 top-0 z-50 h-full w-[380px] bg-white shadow-2xl transition-transform duration-300 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b" style={{ borderBottomColor: meta?.color ?? "#e2e8f0" }}>
              <div>
                <DialogPrimitive.Title className="text-lg font-bold text-[#1e293b]">
                  {meta?.label ?? "团队详情"}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-[#64748b] mt-0.5">
                  {activeCount}/{totalCount} 在线 · 健康度 {Math.round(healthRate * 100)}%
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
                <XIcon className="h-5 w-5 text-[#64748b]" />
              </DialogPrimitive.Close>
            </div>

            {/* Health bar */}
            <div className="px-5 py-3">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.round(healthRate * 100)}%`, background: meta?.color ?? "#64748b" }}
                />
              </div>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              <p className="text-xs text-[#64748b] font-medium mb-3">团队成员</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.employeeId}
                    className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(0,0,0,0.05)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1e293b] truncate">{m.employeeName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs" style={{ color: m.levelColor }}>{m.levelEmoji} Lv.{m.level}</span>
                        <span className="text-xs text-[#64748b]">{m.xp} XP</span>
                      </div>
                    </div>
                    {m.rankChange > 0 && <span className="text-xs text-green-600">↑{m.rankChange}</span>}
                    {m.rankChange < 0 && <span className="text-xs text-red-500">↓{Math.abs(m.rankChange)}</span>}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-[#64748b] text-center py-8">暂无成员数据</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t">
              <button
                onClick={() => { onOpenChange(false); router.push(`/org?team=${team}`) }}
                className="w-full text-center text-sm font-medium py-2.5 rounded-xl transition-colors hover:bg-gray-50"
                style={{ color: meta?.color ?? "#64748b" }}
              >
                查看组织架构 →
              </button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
