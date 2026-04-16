"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";

interface KpiCardProps {
  title: string;
  numericValue: number;
  displaySuffix?: string;
  displayPrefix?: string;
  decimals?: number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "blue" | "green" | "yellow" | "purple" | "red";
}

const ACCENT_CLASSES = {
  blue: "text-[#2563eb]",
  green: "text-[#16a34a]",
  yellow: "text-[#d97706]",
  purple: "text-[#7c3aed]",
  red: "text-[#dc2626]",
};

export function KpiCard({
  title,
  numericValue,
  displaySuffix = "",
  displayPrefix = "",
  decimals = 0,
  subtitle,
  trend,
  trendLabel,
  accent = "blue",
}: KpiCardProps) {
  const animated = useCountUp(numericValue, 1200, decimals);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div
        className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(37,99,235,0.2)" }}
      />
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
        <p className={cn("text-3xl font-bold tabular-nums", ACCENT_CLASSES[accent])}>
          {displayPrefix}{animated}{displaySuffix}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && trendLabel && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
