import { NdStatCard } from "@/components/netdragon"
import type { KpiItem, KpiTrendSeries } from "@/lib/dashboard-types"

interface KpiSectionProps {
  kpiItems: KpiItem[]
  trendSeries: KpiTrendSeries
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

const SERIES_KEYS: Record<string, keyof KpiTrendSeries> = {
  taskCount: "taskCount",
  adoptionRate: "adoptionRate",
  accuracyRate: "accuracyRate",
  hoursSaved: "hoursSaved",
  costSaved: "costSaved",
}

/** 把 KpiItem 的 prefix + value 合并成 NdStatCard 的 value(string 或 number) */
function formatValue(item: KpiItem): string | number {
  if (item.displayPrefix) {
    return `${item.displayPrefix}${Math.round(item.value).toLocaleString("zh-CN")}`
  }
  return Math.round(item.value)
}

export function KpiSection({ kpiItems, trendSeries, onNavigate }: KpiSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {kpiItems.map((item) => {
        const seriesKey = SERIES_KEYS[item.key]
        const series = seriesKey ? trendSeries[seriesKey] : undefined
        return (
          <NdStatCard
            key={item.key}
            label={item.label}
            metricKey={item.key}
            value={formatValue(item)}
            unit={item.displaySuffix.trim() || undefined}
            trendPct={item.trendPct}
            trendDirection={item.trendDirection}
            higherIsBetter
            trendSeries={series}
            tone={TONE_BY_KEY[item.key] ?? "primary"}
            onClick={item.href ? () => onNavigate(item.href) : undefined}
          />
        )
      })}
    </div>
  )
}
