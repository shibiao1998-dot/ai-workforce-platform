"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamData {
  team: string;
  label: string;
  totalTasks: number;
  avgAdoptionRate: number;
  avgAccuracyRate: number;
  totalHoursSaved: number;
  employeeCount: number;
}

export function TeamComparisonChart({ data }: { data: TeamData[] }) {
  const labels = data.map((d) => d.label);

  const barOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      data: ["任务总量", "节省人力(h)"],
      textStyle: { color: "#94a3b8" },
      top: 0,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: "#94a3b8" },
      axisLine: { lineStyle: { color: "#334155" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8" },
      splitLine: { lineStyle: { color: "#1e293b" } },
    },
    series: [
      {
        name: "任务总量",
        type: "bar",
        data: data.map((d) => d.totalTasks),
        itemStyle: { color: "#00d4ff", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
      },
      {
        name: "节省人力(h)",
        type: "bar",
        data: data.map((d) => d.totalHoursSaved),
        itemStyle: { color: "#00ff88", borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 60,
      },
    ],
  };

  const radarOption = {
    backgroundColor: "transparent",
    tooltip: {},
    radar: {
      indicator: [
        { name: "任务量", max: Math.max(...data.map((d) => d.totalTasks)) * 1.2 },
        { name: "采纳率", max: 100 },
        { name: "准确率", max: 100 },
        { name: "节省人力", max: Math.max(...data.map((d) => d.totalHoursSaved)) * 1.2 },
      ],
      axisLine: { lineStyle: { color: "#334155" } },
      splitLine: { lineStyle: { color: "#1e293b" } },
      name: { textStyle: { color: "#94a3b8" } },
    },
    series: [
      {
        type: "radar",
        data: data.map((d) => ({
          name: d.label,
          value: [d.totalTasks, d.avgAdoptionRate, d.avgAccuracyRate, d.totalHoursSaved],
        })),
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.15 },
      },
    ],
    color: ["#00d4ff", "#00ff88", "#ffd93d"],
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">三团队任务对比</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={barOption} style={{ height: 280 }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">能力雷达图</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={radarOption} style={{ height: 280 }} />
        </CardContent>
      </Card>
    </div>
  );
}
