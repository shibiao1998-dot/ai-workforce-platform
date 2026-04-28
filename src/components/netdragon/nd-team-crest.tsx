/**
 * NdTeamCrest — 管理/设计/生产三团队的徽记
 *
 * 仅渲染视觉本身(尺寸由 className 控制),不含标题/描述。
 *
 * 本组件自带 role="img" + 中文 aria-label。若调用方已经在徽记旁有
 * 可见的团队名称文字,为避免 screen reader 重复朗读,应给外层容器
 * 加 aria-hidden 或用 aria-labelledby 指向那段文字。
 */

"use client";

import { cn } from "@/lib/utils";

export type NdTeamKey = "management" | "design" | "production";

interface NdTeamCrestProps {
  team: NdTeamKey;
  className?: string;
}

const TEAM_STYLE: Record<NdTeamKey, { gradient: string; glow: string; labelZh: string }> = {
  management: {
    gradient: "from-[color:var(--color-nd-violet)] to-[color:var(--color-nd-primary)]",
    glow: "shadow-[0_0_18px_var(--color-nd-violet)]",
    labelZh: "管理团队",
  },
  design: {
    gradient: "from-[color:var(--color-nd-sapphire)] to-[color:var(--color-nd-void-edge)]",
    glow: "shadow-[0_0_18px_var(--color-nd-primary)]",
    labelZh: "设计团队",
  },
  production: {
    gradient: "from-[color:var(--color-nd-emerald)] to-[color:var(--color-nd-void-edge)]",
    glow: "shadow-[0_0_18px_var(--color-nd-emerald)]",
    labelZh: "生产团队",
  },
};

export function NdTeamCrest({ team, className }: NdTeamCrestProps) {
  const style = TEAM_STYLE[team];
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-full bg-gradient-to-br",
        style.gradient,
        style.glow,
        className,
      )}
      role="img"
      aria-label={style.labelZh}
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
        {/* 内腔填充,坐标比外层六边形各边内缩约 6px */}
        <polygon
          points="20,10 28,14 28,26 20,30 12,26 12,14"
          fill="currentColor"
          fillOpacity="0.25"
        />
      </svg>
    </div>
  );
}
