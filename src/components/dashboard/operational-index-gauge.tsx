"use client"

import ReactECharts from "echarts-for-react"
import type { DashboardSummary } from "@/lib/dashboard-types"

interface Props {
  summary: DashboardSummary
}

export function OperationalIndexGauge({ summary }: Props) {
  const score = summary.operationalIndex

  const option = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: "90%",
        center: ["50%", "70%"],
        splitNumber: 5,
        progress: { show: false },
        pointer: {
          show: true,
          length: "60%",
          width: 4,
          itemStyle: { color: "#1e293b" },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.6, "#f97316"],
              [0.8, "#eab308"],
              [1.0, "#22c55e"],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: true, size: 12, itemStyle: { color: "#1e293b" } },
        detail: {
          valueAnimation: true,
          fontSize: 40,
          fontWeight: "bold",
          color: "#1e293b",
          offsetCenter: [0, "-15%"],
          formatter: "{value}",
        },
        title: {
          show: true,
          offsetCenter: [0, "15%"],
          fontSize: 13,
          color: "#64748b",
        },
        data: [{ value: score, name: "综合运营指数" }],
      },
    ],
  }

  return (
    <div
      className="relative rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ animation: "gaugeBreath 2s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes gaugeBreath {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 24px 4px rgba(99,102,241,0.25); }
        }
      `}</style>

      <ReactECharts option={option} style={{ height: 220, flex: "1 0 auto" }} />

      <div className="grid grid-cols-3 gap-3 mt-2 pt-3 border-t border-white/60">
        <div className="text-center">
          <p className="text-xs text-[#64748b]">本月任务</p>
          <p className="text-lg font-bold text-[#1e293b] tabular-nums">{summary.monthlyTaskCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#64748b]">成功率</p>
          <p className="text-lg font-bold text-[#1e293b] tabular-nums">{summary.successRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#64748b]">节省成本</p>
          <p className="text-lg font-bold text-[#1e293b] tabular-nums">¥{summary.savedCost.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}
