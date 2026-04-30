/**
 * NdStatCard — 驾驶舱 KPI 大数字卡
 *
 * 视觉特征:
 *   - 顶部 2px 流光彩带(电光蓝 → 团队色)
 *   - Orbitron 字体大数字
 *   - 趋势箭头 + 同环比百分比(可选)
 */

"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { NdSparkline } from "./nd-sparkline";

type Tone = "primary" | "violet" | "emerald" | "accent";

interface NdStatCardProps {
  label: string;
  value: string | number;
  /** 大数字旁的单位,例如 "%" / "k" / "¥" */
  unit?: string;
  /** 趋势百分比(正=上升,负=下降,null=无) */
  trendPct?: number | null;
  /** 趋势方向;当 trendPct 已经被取绝对值时由调用方显式传入 */
  trendDirection?: "up" | "down" | "neutral";
  /** 趋势是否"越高越好"(accuracy ↑ = good,cost ↑ = bad) */
  higherIsBetter?: boolean;
  /** 副标题(例如"≈ 79 个 FTE/月") */
  footer?: string;
  /** 近 N 个月走势序列,用于底部 sparkline */
  trendSeries?: number[];
  /** 顶部流光带色调 */
  tone?: Tone;
  className?: string;
  onClick?: () => void;
}

const TONE_GRADIENT: Record<Tone, string> = {
  primary: "from-transparent via-[color:var(--color-nd-primary)] to-transparent",
  violet: "from-transparent via-[color:var(--color-nd-violet)] to-transparent",
  emerald: "from-transparent via-[color:var(--color-nd-emerald)] to-transparent",
  accent: "from-transparent via-[color:var(--color-nd-accent)] to-transparent",
};

export function NdStatCard({
  label,
  value,
  unit,
  trendPct,
  trendDirection,
  higherIsBetter = true,
  footer,
  trendSeries,
  tone = "primary",
  className,
  onClick,
}: NdStatCardProps) {
  const isClickable = !!onClick;
  const resolvedTrendDirection =
    trendDirection ??
    (trendPct == null || trendPct === 0 ? "neutral" : trendPct > 0 ? "up" : "down");

  const trendColor =
    resolvedTrendDirection === "neutral"
      ? "text-nd-ink-soft"
      : (resolvedTrendDirection === "up") === higherIsBetter
        ? "text-[color:var(--color-nd-success)]"
        : "text-[color:var(--color-nd-danger)]";

  const TrendIcon =
    resolvedTrendDirection === "neutral"
      ? Minus
      : resolvedTrendDirection === "up"
        ? ArrowUp
        : ArrowDown;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-nd-lg bg-nd-surface p-5 shadow-nd-sm transition-shadow",
        isClickable && "cursor-pointer hover:shadow-nd-md",
        className,
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      aria-label={isClickable ? label : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick?.() : undefined}
    >
      {/* 顶部流光彩带 */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r",
          TONE_GRADIENT[tone],
        )}
      />

      <div className="text-xs font-medium uppercase tracking-wider text-nd-ink-soft">
        {label}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-nd-display text-4xl font-bold leading-none tracking-tight text-nd-ink">
          {value}
        </span>
        {unit && <span className="text-lg text-nd-ink-soft">{unit}</span>}
      </div>

      {(trendPct != null || footer) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trendPct != null && (
            <span className={cn("inline-flex items-center gap-0.5", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trendPct).toFixed(1)}%
            </span>
          )}
          {footer && <span className="text-nd-ink-soft">{footer}</span>}
        </div>
      )}

      {trendSeries && trendSeries.length >= 2 && (
        <div className="mt-3">
          <NdSparkline data={trendSeries} width={160} height={36} direction={resolvedTrendDirection} className="w-full" />
        </div>
      )}
    </div>
  );
}
