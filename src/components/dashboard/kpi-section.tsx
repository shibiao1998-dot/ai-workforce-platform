import { KpiCard } from "./kpi-card"
import type { KpiItem } from "@/lib/dashboard-types"

interface KpiSectionProps {
  kpiItems: KpiItem[]
  onNavigate: (href: string | null) => void
}

export function KpiSection({ kpiItems, onNavigate }: KpiSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {kpiItems.map((item) => (
        <KpiCard
          key={item.key}
          item={item}
          onClick={() => onNavigate(item.href)}
        />
      ))}
    </div>
  )
}
