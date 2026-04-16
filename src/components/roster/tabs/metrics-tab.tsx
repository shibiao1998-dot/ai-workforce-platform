"use client";

import ReactECharts from "echarts-for-react";
import { Metric } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface MetricsTabProps {
  metrics: Metric[];
}

function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  return `${hours.toFixed(1)} h`;
}

export function MetricsTab({ metrics }: MetricsTabProps) {
  const monthly = metrics
    .filter((m) => m.periodType === "monthly")
    .sort((a, b) => a.period.localeCompare(b.period));

  const latest = monthly[monthly.length - 1] ?? null;

  const periods = monthly.map((m) => m.period);
  const taskCounts = monthly.map((m) => m.taskCount);
  const hoursSaved = monthly.map((m) => m.humanTimeSaved ?? 0);
  const adoptionRates = monthly.map((m) =>
    m.adoptionRate != null ? +(m.adoptionRate * 100).toFixed(1) : 0
  );
  const accuracyRates = monthly.map((m) =>
    m.accuracyRate != null ? +(m.accuracyRate * 100).toFixed(1) : 0
  );

  const trendOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      formatter: (params: Array<{ seriesName: string; value: number; color: string }>) => {
        return (
          `<b>${(params[0] as unknown as { axisValueLabel: string }).axisValueLabel}</b><br/>` +
          params
            .map(
              (p) =>
                `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: <b>${p.value}${p.seriesName.includes("率") ? "%" : ""}</b>`
            )
            .join("<br/>")
        );
      },
    },
    legend: {
      top: 0,
      textStyle: { color: "#475569" },
    },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    xAxis: {
      type: "category",
      data: periods,
      axisLabel: { color: "#64748b" },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
    },
    yAxis: [
      {
        type: "value",
        name: "数量",
        nameTextStyle: { color: "#64748b" },
        axisLabel: { color: "#64748b" },
        splitLine: { lineStyle: { color: "#e2e8f0" } },
      },
      {
        type: "value",
        name: "%",
        nameTextStyle: { color: "#64748b" },
        axisLabel: { color: "#64748b", formatter: "{value}%" },
        splitLine: { show: false },
        min: 0,
        max: 100,
      },
    ],
    series: [
      {
        name: "任务数",
        type: "line",
        data: taskCounts,
        smooth: true,
        yAxisIndex: 0,
        itemStyle: { color: "#2563eb" },
        lineStyle: { width: 2 },
      },
      {
        name: "节省工时(h)",
        type: "line",
        data: hoursSaved,
        smooth: true,
        yAxisIndex: 0,
        itemStyle: { color: "#16a34a" },
        lineStyle: { width: 2 },
      },
      {
        name: "采用率",
        type: "line",
        data: adoptionRates,
        smooth: true,
        yAxisIndex: 1,
        itemStyle: { color: "#d97706" },
        lineStyle: { width: 2 },
      },
      {
        name: "准确率",
        type: "line",
        data: accuracyRates,
        smooth: true,
        yAxisIndex: 1,
        itemStyle: { color: "#7c3aed" },
        lineStyle: { width: 2 },
      },
    ],
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>任务数</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? latest.taskCount : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>采用率</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? formatRate(latest.adoptionRate) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>准确率</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? formatRate(latest.accuracyRate) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>节省工时</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? formatHours(latest.humanTimeSaved) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {monthly.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              指标趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={trendOption} style={{ height: 280 }} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            暂无趋势数据
          </CardContent>
        </Card>
      )}
    </div>
  );
}
