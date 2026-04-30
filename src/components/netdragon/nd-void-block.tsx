/**
 * NdVoidBlock — Layer 3 深色载体(Hero)
 *
 * 设计原则:如果有 hero 图,让图说话,不再在其上叠 CSS 装饰。
 * 如果没 hero 图,保留暗底作为兜底(开发环境/未来其他 Hero 复用)。
 */

"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NdVoidBlockProps {
  children?: ReactNode;
  className?: string;
  bgImage?: string;
}

export function NdVoidBlock({ children, className, bgImage }: NdVoidBlockProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-nd-xl p-8 text-white shadow-nd-lg",
        "bg-[color:var(--color-nd-void)]",
        className,
      )}
    >
      {bgImage && (
        <img
          aria-hidden="true"
          src={bgImage}
          alt=""
          loading="eager"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* 统一暗化罩 —— 保证任何 hero 图下白字都可读 */}
      {bgImage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--color-nd-void)]/75 via-[color:var(--color-nd-void)]/40 to-[color:var(--color-nd-void)]/20"
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
