/**
 * NdScenePortrait — 员工场景立绘卡(驾驶舱"明星员工" / 花名册大尺寸卡)
 *
 * 结构:
 *   - 全屏背景:NdAsset (scene 家族 WebP)
 *   - 右上角:排名徽章(可选)
 *   - 底部玻璃信息条:员工名 + 职位 + 副信息
 */

"use client";

import { cn } from "@/lib/utils";
import { NdAsset } from "./primitives";
import type { ReactNode } from "react";

interface NdScenePortraitProps {
  assetId: string;
  name: string;
  title: string;
  meta?: string;
  rankBadge?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NdScenePortrait({
  assetId,
  name,
  title,
  meta,
  rankBadge,
  className,
  onClick,
}: NdScenePortraitProps) {
  const isClickable = !!onClick;
  const accessibleName = meta ? `${name}、${title}、${meta}` : `${name}、${title}`;

  return (
    <div
      className={cn(
        "group relative aspect-[4/5] overflow-hidden rounded-nd-lg shadow-nd-md",
        "transition-transform duration-300",
        isClickable && "cursor-pointer hover:-translate-y-1 hover:shadow-nd-lg",
        className,
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      aria-label={isClickable ? accessibleName : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick?.() : undefined}
    >
      {/* 背景立绘 */}
      <NdAsset
        id={assetId}
        label="card"
        alt={isClickable ? "" : `${name} - ${title}`}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />

      {/* 右上角排名徽章 */}
      {rankBadge && (
        <div className="absolute right-3 top-3 z-10">{rankBadge}</div>
      )}

      {/* 底部玻璃信息条 */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 p-3",
          "bg-[color:var(--color-nd-glass-bg)] backdrop-blur-[var(--nd-glass-blur)]",
          "border-t border-[color:var(--color-nd-glass-border)]",
        )}
      >
        <div className="text-sm font-bold leading-tight text-nd-ink">{name}</div>
        <div className="mt-0.5 text-xs text-nd-ink-soft">{title}</div>
        {meta && <div className="mt-1 text-[11px] text-nd-ink-soft">{meta}</div>}
      </div>
    </div>
  );
}
