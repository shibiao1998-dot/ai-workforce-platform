"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QualityGauge({ score }: { score: number }) {
  const option = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        pointer: { show: false },
        progress: {
          show: true,
          width: 14,
          itemStyle: {
            color: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
          },
        },
        axisLine: { lineStyle: { width: 14, color: [[1, "#e2e8f0"]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: "bold",
          offsetCenter: [0, "0%"],
          color: score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444",
          formatter: "{value}",
        },
        data: [{ value: score }],
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">平均质量评分</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 180 }} />
      </CardContent>
    </Card>
  );
}
