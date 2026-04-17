"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyData {
  date: string;
  management: number;
  design: number;
  production: number;
}

export function TrendChart({
  data,
  onDateClick,
  selectedDate,
}: {
  data: DailyData[];
  onDateClick: (date: string | null) => void;
  selectedDate: string | null;
}) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: {
      data: ["管理团队", "设计团队", "生产团队"],
      textStyle: { color: "#475569" },
      top: 0,
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: data.map(d => d.date.slice(5)),
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b" },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    series: [
      {
        name: "管理团队",
        type: "bar",
        stack: "total",
        data: data.map(d => d.management),
        itemStyle: { color: "#8b5cf6" },
        emphasis: { focus: "series" },
      },
      {
        name: "设计团队",
        type: "bar",
        stack: "total",
        data: data.map(d => d.design),
        itemStyle: { color: "#3b82f6" },
        emphasis: { focus: "series" },
      },
      {
        name: "生产团队",
        type: "bar",
        stack: "total",
        data: data.map(d => d.production),
        itemStyle: { color: "#22c55e", borderRadius: [4, 4, 0, 0] },
        emphasis: { focus: "series" },
      },
    ],
  };

  const onEvents = {
    click: (params: { dataIndex: number }) => {
      const clickedDate = data[params.dataIndex]?.date ?? null;
      onDateClick(clickedDate === selectedDate ? null : clickedDate);
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">任务产出趋势（按团队）</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 280 }} onEvents={onEvents} />
      </CardContent>
    </Card>
  );
}
