/**
 * NdAchievementBadge — 基于 NdAsset 的徽章展示
 *
 * 职责:显示徽章 WebP,悬停显示 tooltip(名称 + 描述),
 *       支持 gold/silver/bronze 等级影响光环颜色。
 * 依赖:上层必须已有 TooltipProvider(已在 src/app/layout.tsx 全局注入)。
 */

"use client";

import { cn } from "@/lib/utils";
import { NdAsset } from "./primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type BadgeRank = "gold" | "silver" | "bronze";

interface NdAchievementBadgeProps {
  /** catalog 里的 badge 素材 id,例如 "badge-efficiency-gold" */
  assetId: string;
  name: string;
  description?: string;
  rank?: BadgeRank;
  /** 外层尺寸(默认 48px) */
  size?: number;
  className?: string;
}

const RANK_RING: Record<BadgeRank, string> = {
  gold: "ring-2 ring-[color:var(--color-nd-accent)]/70",
  silver: "ring-2 ring-slate-400/70",
  bronze: "ring-2 ring-orange-400/70",
};

export function NdAchievementBadge({
  assetId,
  name,
  description,
  rank = "gold",
  size = 48,
  className,
}: NdAchievementBadgeProps) {
  const dimPx = `${size}px`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            tabIndex={0}
            role="img"
            aria-label={description ? `${name}:${description}` : name}
            className={cn(
              "relative inline-flex items-center justify-center rounded-full outline-none focus-visible:ring-offset-2",
              RANK_RING[rank],
              className,
            )}
            style={{ width: dimPx, height: dimPx }}
          >
            <NdAsset
              id={assetId}
              label="default"
              alt={name}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        }
      />
      <TooltipContent>
        <div className="font-semibold">{name}</div>
        {description && <div className="mt-0.5 text-xs opacity-80">{description}</div>}
      </TooltipContent>
    </Tooltip>
  );
}
