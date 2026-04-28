/**
 * NdTeamCrest — 管理/设计/生产三团队的徽记
 *
 * 仅渲染视觉本身(尺寸由 className 控制),不含标题/描述。
 */

"use client";

import { cn } from "@/lib/utils";

export type NdTeamKey = "management" | "design" | "production";

interface NdTeamCrestProps {
  team: NdTeamKey;
  className?: string;
}

const GRADIENTS: Record<NdTeamKey, string> = {
  management: "from-[color:var(--color-nd-violet)] to-[color:var(--color-nd-primary)]",
  design: "from-[color:var(--color-nd-sapphire)] to-[color:var(--color-nd-void-edge)]",
  production: "from-[color:var(--color-nd-emerald)] to-[color:var(--color-nd-void-edge)]",
};

const GLOW: Record<NdTeamKey, string> = {
  management: "shadow-[0_0_18px_var(--color-nd-violet)]",
  design: "shadow-[0_0_18px_var(--color-nd-primary)]",
  production: "shadow-[0_0_18px_var(--color-nd-emerald)]",
};

const TEAM_LABEL_ZH: Record<NdTeamKey, string> = {
  management: "管理团队",
  design: "设计团队",
  production: "生产团队",
};

export function NdTeamCrest({ team, className }: NdTeamCrestProps) {
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-full bg-gradient-to-br",
        GRADIENTS[team],
        GLOW[team],
        className,
      )}
      role="img"
      aria-label={TEAM_LABEL_ZH[team]}
    >
      {/* 内部六边形图腾 */}
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="h-3/5 w-3/5 text-white/90"
      >
        <polygon
          points="20,4 34,12 34,28 20,36 6,28 6,12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <polygon
          points="20,10 28,14 28,26 20,30 12,26 12,14"
          fill="currentColor"
          fillOpacity="0.25"
        />
      </svg>
    </div>
  );
}
