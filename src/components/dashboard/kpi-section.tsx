import { NdStatCard } from "@/components/netdragon"
import type { KpiItem } from "@/lib/dashboard-types"

interface KpiSectionProps {
  kpiItems: KpiItem[]
  onNavigate: (href: string | null) => void
}

type Tone = "primary" | "violet" | "emerald" | "accent"

const TONE_BY_KEY: Record<string, Tone> = {
  taskCount: "primary",
  adoptionRate: "emerald",
  accuracyRate: "emerald",
  hoursSaved: "accent",
  costSaved: "violet",
}

/** 把 KpiItem 的 prefix + value 合并成 NdStatCard 的 value(string 或 number) */
function formatValue(item: KpiItem): string | number {
  if (item.displayPrefix) {
    // 带前缀(如 "¥")的一律转字符串拼接
    return `${item.displayPrefix}${Math.round(item.value).toLocaleString("zh-CN")}`
  }
  return Math.round(item.value)
}

export function KpiSection({ kpiItems, onNavigate }: KpiSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {kpiItems.map((item) => (
        <NdStatCard
          key={item.key}
          label={item.label}
          value={formatValue(item)}
          unit={item.displaySuffix.trim() || undefined}
          trendPct={item.trendPct}
          higherIsBetter
          tone={TONE_BY_KEY[item.key] ?? "primary"}
          onClick={item.href ? () => onNavigate(item.href) : undefined}
        />
      ))}
    </div>
  )
}
