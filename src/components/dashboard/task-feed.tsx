"use client"

import { cn } from "@/lib/utils"
import type { RecentTaskEntry } from "@/lib/dashboard-types"
import { TOKEN_COST_RATE } from "@/lib/metric-defs"
import { MetricTooltip } from "@/components/shared/metric-tooltip"
import { Card } from "@/components/ui/card"

interface Props {
  tasks: RecentTaskEntry[]
  renderedAtMs: number
  onTaskClick: (taskId: string) => void
  compact?: boolean
  className?: string
}

const TEAM_COLOR: Record<string, string> = {
  management: "text-nd-violet",
  design: "text-nd-sapphire",
  production: "text-nd-emerald",
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-[color:var(--color-nd-primary)]/10 text-nd-primary border border-[color:var(--color-nd-primary)]/20" },
  completed: { label: "已完成", className: "bg-[color:var(--color-nd-emerald)]/10 text-nd-emerald border border-[color:var(--color-nd-emerald)]/20" },
  failed: { label: "失败", className: "bg-[color:var(--color-nd-danger)]/10 text-[color:var(--color-nd-danger)] border border-[color:var(--color-nd-danger)]/20" },
} as const

function relativeTime(epoch: number | null, renderedAtMs: number): string {
  if (!epoch) return "时间待补"
  const diff = renderedAtMs - epoch * 1000
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

export function TaskFeed({ tasks, renderedAtMs, onTaskClick, compact = false, className }: Props) {

  if (tasks.length === 0) {
    return (
      <Card
        variant="glass"
        className={cn(
          "flex items-center justify-center p-5",
          compact ? "min-h-[190px]" : "h-full min-h-[240px]",
          className,
        )}
      >
        <p className="text-sm text-nd-ink-soft">暂无任务数据，生产线完成任务后会自动刷新。</p>
      </Card>
    )
  }

  return (
    <Card variant="glass" className={cn("gap-0", compact ? "p-4" : "h-full p-5", className)}>
      <div className={cn("flex items-end justify-between gap-3", compact ? "mb-2" : "mb-3")}>
        <div>
          <div className="text-xs font-semibold text-nd-primary">任务动态</div>
          <h3 className="mt-1 text-sm font-semibold text-nd-ink">最近任务动态</h3>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-nd-ink-soft">
          <span className="nd-live-dot h-1.5 w-1.5 rounded-full bg-nd-emerald" />
          实时更新
        </span>
      </div>

      <div className={cn("space-y-2 overflow-y-auto pr-1", compact ? "max-h-[230px]" : "max-h-[390px]")}>
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onTaskClick(task.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onTaskClick(task.id)
            }}
            className={cn(
              "flex cursor-pointer flex-col rounded-nd-md border border-[color:var(--color-nd-glass-border)]/70 bg-nd-surface/60 shadow-nd-xs transition-all duration-300 hover:-translate-y-0.5 hover:bg-nd-surface/85 hover:shadow-nd-sm active:translate-y-[1px]",
              compact ? "gap-1.5 p-2.5" : "gap-2 p-3",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-xs font-semibold", TEAM_COLOR[task.team] ?? "text-nd-ink-soft")}>
                {task.employeeName}
              </span>
              <span className={cn("text-xs rounded-md px-1.5 py-0.5", STATUS_CONFIG[task.status].className)}>
                {STATUS_CONFIG[task.status].label}
              </span>
              {task.qualityScore !== null && (
                <span className="text-xs text-nd-ink-soft">质量 {task.qualityScore}</span>
              )}
              {task.tokenUsage !== null && (
                <MetricTooltip metricKey="tokenCost">
                  <span className="text-xs text-nd-ink-soft">≈ ¥{(task.tokenUsage * TOKEN_COST_RATE).toFixed(2)}</span>
                </MetricTooltip>
              )}
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-nd-ink">{task.name}</p>
              <span className="shrink-0 text-[11px] text-nd-ink-soft">{relativeTime(task.startTime, renderedAtMs)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
