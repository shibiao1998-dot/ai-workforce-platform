/**
 * NdSparkline — 趋势迷你折线
 *
 * 用于 KPI 卡下方显示近 N 个月走势,不带坐标轴和标签。
 * 色调根据 trendDirection 选择,与 NdStatCard 的 tone 语义解耦。
 */

"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface NdSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  direction?: "up" | "down" | "neutral";
  className?: string;
}

const STROKE_BY_DIRECTION: Record<NonNullable<NdSparklineProps["direction"]>, string> = {
  up: "var(--color-nd-emerald)",
  down: "var(--color-nd-accent)",
  neutral: "var(--color-nd-ink-soft)",
};

export function NdSparkline({
  data,
  width = 120,
  height = 32,
  direction = "neutral",
  className,
}: NdSparklineProps) {
  const fillId = useId();
  const stroke = STROKE_BY_DIRECTION[direction];

  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center text-xs text-nd-ink-soft", className)}
        style={{ width, height }}
        aria-hidden="true"
      >
        —
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return [x, y] as const;
  });

  const pathD = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const fillD = `${pathD} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`近 ${data.length} 个月趋势`}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${fillId})`} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.5" fill={stroke} />
    </svg>
  );
}
