"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RankingData {
  employeeId: string;
  name: string;
  team: string;
  count: number;
}

const TEAM_COLOR: Record<string, string> = {
  management: "#8b5cf6",
  design: "#3b82f6",
  production: "#22c55e",
};

export function EmployeeRankingChart({
  data,
  onEmployeeClick,
}: {
  data: RankingData[];
  onEmployeeClick?: (employeeId: string) => void;
}) {
  const sorted = [...data].sort((a, b) => a.count - b.count);

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: "3%", right: "10%", top: "3%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#64748b" },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    yAxis: {
      type: "category",
      data: sorted.map(d => d.name),
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
    },
    series: [
      {
        type: "bar",
        data: sorted.map(d => ({
          value: d.count,
          itemStyle: { color: TEAM_COLOR[d.team] ?? "#94a3b8", borderRadius: [0, 4, 4, 0] },
        })),
        label: { show: true, position: "right", color: "#64748b", fontSize: 11 },
        barMaxWidth: 24,
      },
    ],
  };

  const onEvents = onEmployeeClick
    ? {
        click: (params: { dataIndex: number }) => {
          const emp = sorted[params.dataIndex];
          if (emp) onEmployeeClick(emp.employeeId);
        },
      }
    : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">员工产出排行 Top 10</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 280 }} onEvents={onEvents} />
      </CardContent>
    </Card>
  );
}
