"use client"

import ReactECharts from "echarts-for-react"
import type { TeamEfficiencyPoint } from "@/lib/dashboard-types"

interface Props {
  data: TeamEfficiencyPoint[]
  selectedTeam: string | null
  onTeamClick: (team: string) => void
}

const TEAM_COLORS: Record<string, string> = {
  management: "#8b5cf6",
  design: "#3b82f6",
  production: "#22c55e",
}

const TEAM_LABELS: Record<string, string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
}

const TEAMS = ["management", "design", "production"] as const

export function TeamComparisonChart({ data, selectedTeam, onTeamClick }: Props) {
  const months = data.map((d) => d.month)

  function getOpacity(team: string): number {
    if (!selectedTeam) return 1
    return selectedTeam === team ? 1 : 0.3
  }

  const series = TEAMS.map((team) => ({
    name: TEAM_LABELS[team],
    type: "bar" as const,
    data: data.map((d) => d[team]),
    itemStyle: { color: TEAM_COLORS[team], borderRadius: [4, 4, 0, 0], opacity: getOpacity(team) },
    barMaxWidth: 32,
    emphasis: { itemStyle: { opacity: 1 } },
  }))

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { data: TEAMS.map((t) => TEAM_LABELS[t]), textStyle: { color: "#64748b", fontSize: 12 }, top: 0 },
    grid: { left: "3%", right: "4%", bottom: "3%", top: 36, containLabel: true },
    xAxis: { type: "category", data: months, axisLabel: { color: "#64748b", fontSize: 11 }, axisLine: { lineStyle: { color: "#e2e8f0" } }, axisTick: { show: false } },
    yAxis: { type: "value", axisLabel: { color: "#64748b", fontSize: 11 }, splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } } },
    series,
  }

  function handleChartClick(params: { seriesName?: string }) {
    const teamEntry = Object.entries(TEAM_LABELS).find(([, label]) => label === params.seriesName)
    if (teamEntry) onTeamClick(teamEntry[0])
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.8)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1e293b]">团队效能对比</h3>
        {selectedTeam && (
          <button onClick={() => onTeamClick(selectedTeam)} className="text-xs text-indigo-500 hover:underline">
            清除筛选
          </button>
        )}
      </div>
      <ReactECharts option={option} style={{ height: 280 }} onEvents={{ click: handleChartClick }} />
    </div>
  )
}
