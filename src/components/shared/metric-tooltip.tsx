"use client"

import { METRIC_DEFS } from "@/lib/metric-defs"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

interface MetricTooltipProps {
  metricKey?: string
  description?: string
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
}

export function MetricTooltip({
  metricKey,
  description,
  children,
  side = "top",
}: MetricTooltipProps) {
  const text = description ?? (metricKey ? METRIC_DEFS[metricKey]?.description : undefined)
  if (!text) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger
        className="cursor-help border-b border-dashed border-muted-foreground/40"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  )
}
