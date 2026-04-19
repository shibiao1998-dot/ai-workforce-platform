"use client"

import ReactECharts from "echarts-for-react"
import type { HeatmapEntry } from "@/lib/dashboard-types"

interface Props {
  data: HeatmapEntry[]
  filterTeam: string | null
  onEmployeeClick: (employeeId: string) => void
}

export function ActivityHeatmap({ data, filterTeam, onEmployeeClick }: Props) {
  const filteredData = filterTeam ? data.filter((d) => d.team === filterTeam) : data

  const empMap = new Map<string, { id: string; name: string }>()
  for (const d of filteredData) {
    if (!empMap.has(d.employeeId)) empMap.set(d.employeeId, { id: d.employeeId, name: d.employeeName })
  }
  const employees = Array.from(empMap.values())
  const employeeNames = employees.map((e) => e.name)

  const dates: string[] = []
  for (let i = 29; i >= 0; i--) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10))
  }

  const heatData: [number, number, number][] = []
  for (const entry of filteredData) {
    const xIdx = dates.indexOf(entry.date)
    const yIdx = employees.findIndex((e) => e.id === entry.employeeId)
    if (xIdx >= 0 && yIdx >= 0) heatData.push([xIdx, yIdx, entry.count])
  }

  const maxCount = Math.max(...filteredData.map((d) => d.count), 1)

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      formatter: (params: { data: [number, number, number] }) => {
        const [xIdx, yIdx, val] = params.data
        return `${employeeNames[yIdx]}<br/>${dates[xIdx]}<br/>完成任务: ${val}`
      },
    },
    grid: { left: 100, right: 20, top: 20, bottom: 30 },
    xAxis: { type: "category", data: dates.map((d) => d.slice(5)), axisLabel: { color: "#64748b", fontSize: 10, rotate: 45, interval: 4 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: "category", data: employeeNames, axisLabel: { color: "#64748b", fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false } },
    visualMap: { min: 0, max: maxCount, calculable: false, show: false, inRange: { color: ["#fff7ed", "#fed7aa", "#fb923c", "#f97316", "#ea580c"] } },
    series: [{ type: "heatmap", data: heatData, itemStyle: { borderRadius: 2, borderColor: "#ffffff", borderWidth: 1 } }],
  }

  function handleChartClick(params: { componentType: string; value?: [number, number, number] }) {
    if (params.componentType === "series" && params.value) {
      const emp = employees[params.value[1]]
      if (emp) onEmployeeClick(emp.id)
    }
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
        <h3 className="text-sm font-semibold text-[#1e293b]">AI员工近30天活跃热力图</h3>
        {filterTeam && (
          <span className="text-xs text-[#64748b]">
            已筛选：{filterTeam === "management" ? "管理团队" : filterTeam === "design" ? "设计师团队" : "生产团队"}
          </span>
        )}
      </div>
      <ReactECharts option={option} style={{ height: 320 }} onEvents={{ click: handleChartClick }} />
    </div>
  )
}
