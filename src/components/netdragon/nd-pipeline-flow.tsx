/**
 * NdPipelineFlow — 水平工序流水线
 *
 * 展示:立项 → 设计 → 生产 → 评审 → 入库(或任意节点序列)
 * 每个节点有:短标签 + 计数;节点间连线带能量流动光带。
 *
 * 视觉约束:节点是 44×44px 圆形,label 建议控制在 2 个中文字符以内,
 * 超长会溢出或换行异常。
 */

"use client";

import { cn } from "@/lib/utils";

interface PipelineNode {
  key: string;
  label: string;
  count: number;
  /** 该节点是否已激活(有任务流过),未激活节点灰化 */
  active?: boolean;
}

interface NdPipelineFlowProps {
  nodes: PipelineNode[];
  className?: string;
}

export function NdPipelineFlow({ nodes, className }: NdPipelineFlowProps) {
  return (
    <div className={cn("relative py-6", className)}>
      {/* 底部连线(静态渐变) */}
      <div
        aria-hidden="true"
        className="absolute left-12 right-12 top-1/2 h-px -translate-y-1/2"
        style={{
          background:
            "linear-gradient(90deg, var(--color-nd-primary), var(--color-nd-void-edge), var(--color-nd-emerald))",
          opacity: 0.35,
        }}
      />

      {/* 流光覆盖条(动态) */}
      <div
        aria-hidden="true"
        className="nd-flow absolute left-12 right-12 top-1/2 h-0.5 -translate-y-1/2"
      />

      {/* 节点 */}
      <div className="relative z-10 flex items-start justify-between">
        {nodes.map((n) => (
          <div key={n.key} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-xs font-semibold",
                n.active
                  ? "bg-gradient-to-br from-[color:var(--color-nd-primary)] to-[color:var(--color-nd-void-edge)] text-white shadow-nd-glow"
                  : "bg-[color:var(--color-nd-line)] text-nd-ink-soft",
              )}
            >
              {n.label}
            </div>
            <div className="font-nd-display text-xs text-nd-ink">{n.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
