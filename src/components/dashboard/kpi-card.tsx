import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "blue" | "green" | "yellow" | "purple" | "red";
}

const ACCENT_CLASSES = {
  blue: "text-[#00d4ff]",
  green: "text-[#00ff88]",
  yellow: "text-[#ffd93d]",
  purple: "text-[#c084fc]",
  red: "text-[#ff6b6b]",
};

export function KpiCard({ title, value, subtitle, trend, trendLabel, accent = "blue" }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
        <p className={cn("text-3xl font-bold tabular-nums", ACCENT_CLASSES[accent])}>{value}</p>
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
