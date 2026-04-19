"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import type { RecentTaskEntry } from "@/lib/dashboard-types"

interface Props {
  tasks: RecentTaskEntry[]
}

const TEAM_COLOR: Record<string, string> = {
  management: "text-[#8b5cf6]",
  design: "text-[#3b82f6]",
  production: "text-[#22c55e]",
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  completed: { label: "已完成", className: "bg-green-50 text-green-700 border border-green-200" },
  failed: { label: "失败", className: "bg-red-50 text-red-700 border border-red-200" },
} as const

export function TaskFeed({ tasks }: Props) {
  const router = useRouter()

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-2xl p-5 flex items-center justify-center h-full min-h-[200px]"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <p className="text-sm text-[#64748b]">暂无任务数据</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">最近任务动态</h3>
        <span className="flex items-center gap-1.5 text-xs text-[#64748b]">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          实时更新
        </span>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => router.push(`/production?task=${task.id}`)}
            className="flex flex-col gap-1 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.9)" }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-medium", TEAM_COLOR[task.team] ?? "text-[#64748b]")}>
                {task.employeeName}
              </span>
              <span className={cn("text-xs rounded-md px-1.5 py-0.5", STATUS_CONFIG[task.status].className)}>
                {STATUS_CONFIG[task.status].label}
              </span>
              {task.qualityScore !== null && (
                <span className="text-xs text-[#64748b]">⭐ {task.qualityScore}</span>
              )}
              {task.tokenUsage !== null && (
                <span className="text-xs text-[#64748b]">≈ ¥{(task.tokenUsage * 0.00005).toFixed(2)}</span>
              )}
            </div>
            <p className="text-sm text-[#1e293b] truncate">{task.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
