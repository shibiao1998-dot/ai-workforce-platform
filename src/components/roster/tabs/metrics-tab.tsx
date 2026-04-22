"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricTooltip } from "@/components/shared/metric-tooltip";

interface TrendPoint {
  period: string;
  taskCount: number;
  adoptionRate: number;
  accuracyRate: number;
  hoursSaved: number;
}

interface MetricsTabProps {
  current: {
    taskCount: number;
    adoptionRate: number;
    accuracyRate: number;
    hoursSaved: number;
  } | null;
  trend: TrendPoint[];
}

export function MetricsTab({ current, trend }: MetricsTabProps) {
  const periods = trend.map((m) => m.period);
  const taskCounts = trend.map((m) => m.taskCount);
  const hoursSaved = trend.map((m) => m.hoursSaved);
  const adoptionRates = trend.map((m) => m.adoptionRate);
  const accuracyRates = trend.map((m) => m.accuracyRate);

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
            <CardDescription>
              <MetricTooltip metricKey="taskCount">任务数</MetricTooltip>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {current?.taskCount ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>
              <MetricTooltip metricKey="adoptionRate">采纳率</MetricTooltip>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {current ? current.adoptionRate.toFixed(1) + "%" : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>
              <MetricTooltip metricKey="accuracyRate">准确率</MetricTooltip>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {current ? current.accuracyRate.toFixed(1) + "%" : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>
              <MetricTooltip metricKey="hoursSaved">节省工时</MetricTooltip>
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {current ? current.hoursSaved.toFixed(1) + " h" : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {trend.length > 0 ? (
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
