"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapData {
  employees: { id: string; name: string; team: string }[];
  activity: { employeeId: string; date: string; count: number }[];
}

export function ActivityHeatmap({ data }: { data: HeatmapData }) {
  // Build 30 days of dates
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  const employeeNames = data.employees.map((e) => e.name);

  // Build [xIndex, yIndex, value] triples
  const heatData: [number, number, number][] = [];
  data.activity.forEach((a) => {
    const xIdx = dates.indexOf(a.date);
    const yIdx = data.employees.findIndex((e) => e.id === a.employeeId);
    if (xIdx >= 0 && yIdx >= 0) {
      heatData.push([xIdx, yIdx, a.count]);
    }
  });

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      formatter: (params: { data: [number, number, number] }) => {
        const [xIdx, yIdx, val] = params.data;
        return `${employeeNames[yIdx]}<br/>${dates[xIdx]}<br/>完成任务: ${val}`;
      },
    },
    grid: { left: 100, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: dates.map((d) => d.slice(5)),
      axisLabel: {
        color: "#64748b",
        fontSize: 10,
        rotate: 45,
        interval: 4,
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: employeeNames,
      axisLabel: { color: "#64748b", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0,
      max: 10,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: -10,
      show: false,
      inRange: {
        color: ["#fff7ed", "#fed7aa", "#fb923c", "#f97316", "#ea580c"],
      },
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        itemStyle: { borderRadius: 2, borderColor: "#ffffff", borderWidth: 1 },
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          AI员工近30天活跃热力图
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 420 }} />
      </CardContent>
    </Card>
  );
}
