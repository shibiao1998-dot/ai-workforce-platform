"use client"

import { useCountUp } from "@/hooks/use-count-up"
import { cn } from "@/lib/utils"
import type { KpiItem } from "@/lib/dashboard-types"
import { MetricTooltip } from "@/components/shared/metric-tooltip"

interface KpiCardProps {
  item: KpiItem
  onClick: () => void
}

function buildSparklinePoints(value: number, trendPct: number): number[] {
  const points: number[] = []
  const base = trendPct !== 0 ? value / (1 + trendPct / 100) : value
  for (let i = 0; i < 5; i++) {
    // Deterministic variation based on index instead of Math.random()
    const variation = 0.85 + ((i * 7 + 3) % 10) / 33
    points.push(Math.max(0, base * variation))
  }
  points.push(value)
  return points
}

function MiniSparkline({ value, trendPct, color }: { value: number; trendPct: number; color: string }) {
  const raw = buildSparklinePoints(value, trendPct)
  const max = Math.max(...raw, 1)
  const min = Math.min(...raw, 0)
  const range = max - min || 1
  const W = 80
  const H = 32
  const pts = raw
    .map((v, i) => {
      const x = (i / (raw.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TREND_COLOR = { up: "#16a34a", down: "#dc2626", neutral: "#64748b" } as const
const TREND_SYMBOL = { up: "↑", down: "↓", neutral: "→" } as const

export function KpiCard({ item, onClick }: KpiCardProps) {
  const decimals = item.displayPrefix === "¥" ? 0 : 0
  const animated = useCountUp(item.value, 1200, decimals)
  const trendColor = TREND_COLOR[item.trendDirection]
  const sparkColor = item.trendDirection === "down" ? "#dc2626" : "#6366f1"

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 cursor-pointer",
        "transition-all duration-200 hover:-translate-y-0.5",
        item.href ? "hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]" : "cursor-default"
      )}
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl leading-none">{item.emoji}</span>
        <MetricTooltip metricKey={item.key}>
          <p className="text-xs text-[#64748b] font-medium truncate">{item.label}</p>
        </MetricTooltip>
      </div>
      <p className="text-[28px] font-bold text-[#1e293b] tabular-nums leading-none mb-2">
        {item.displayPrefix}{animated}{item.displaySuffix}
      </p>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trendColor }}>
          <span>{TREND_SYMBOL[item.trendDirection]}</span>
          <span>{Math.abs(item.trendPct).toFixed(1)}% 环比</span>
        </div>
        <MiniSparkline value={item.value} trendPct={item.trendPct} color={sparkColor} />
      </div>
      {item.href && (
        <div className="absolute bottom-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-indigo-500">点击跳转 →</span>
        </div>
      )}
    </div>
  )
}
