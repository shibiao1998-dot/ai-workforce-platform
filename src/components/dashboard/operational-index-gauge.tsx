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
        startAngle: 225,
        endAngle: -45,
        min: 0,
        max: 100,
        radius: "85%",
        center: ["50%", "55%"],
        pointer: { show: false },
        anchor: { show: false },
        progress: {
          show: true,
          width: 20,
          roundCap: true,
          itemStyle: {
            color: score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444",
          },
        },
        axisLine: {
          lineStyle: {
            width: 20,
            color: [[1, "#f1f5f9"]],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 48,
          fontWeight: "bold",
          color: "#1e293b",
          offsetCenter: [0, "-5%"],
          formatter: "{value}",
        },
        title: {
          show: true,
          offsetCenter: [0, "25%"],
          fontSize: 14,
          color: "#64748b",
          fontWeight: 500,
        },
        data: [{ value: score, name: "综合运营指数" }],
      },
    ],
  }

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
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
