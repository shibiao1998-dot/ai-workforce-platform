/**
 * NdVoidBlock — Layer 3 深色高光载体
 *
 * 用于页面 Hero 区的深色块,携带星舰暗纹 SVG 装饰。
 * 不承担 Hero 的文本/CTA 布局 — 仅提供"深底+霓虹光效+暗纹"的外壳,
 * 由调用方往 children 里塞具体内容。
 */

"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NdVoidBlockProps {
  children?: ReactNode;
  className?: string;
}

export function NdVoidBlock({ children, className }: NdVoidBlockProps) {
  const gradientId = useId();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-nd-xl p-8 text-white shadow-nd-lg",
        "bg-[color:var(--color-nd-void)]",
        className,
      )}
    >
      {/* 霓虹光晕 - 紫 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-60 w-60 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-nd-violet), transparent 70%)" }}
      />
      {/* 霓虹光晕 - 青 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -bottom-10 h-60 w-60 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-nd-void-edge), transparent 70%)" }}
      />

      {/* 星舰暗纹 SVG - 右侧 */}
      <svg
        aria-hidden="true"
        viewBox="0 0 800 300"
        className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-25"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-nd-void-edge)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-nd-primary)" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* 星舰碟形轮廓暗示 */}
        <ellipse cx="620" cy="170" rx="180" ry="28" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
        <ellipse cx="620" cy="170" rx="120" ry="18" fill="none" stroke={`url(#${gradientId})`} strokeWidth="1" />
        {/* 六边形能量节点 */}
        <polygon
          points="520,60 560,40 600,60 600,100 560,120 520,100"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.2"
        />
        <polygon
          points="640,80 680,60 720,80 720,120 680,140 640,120"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="1.2"
        />
        {/* 虚线流光 */}
        <line
          x1="0"
          y1="230"
          x2="800"
          y2="230"
          stroke="var(--color-nd-void-edge)"
          strokeWidth="0.5"
          strokeDasharray="3 8"
          opacity="0.5"
        />
      </svg>

      {/* 内容层 */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
