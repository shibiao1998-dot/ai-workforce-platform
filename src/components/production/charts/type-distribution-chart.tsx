"use client";

import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TypeData {
  type: string;
  count: number;
}

export function TypeDistributionChart({ data }: { data: TypeData[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "55%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: data.map(d => ({ name: d.type, value: d.count })),
      },
    ],
    graphic: {
      type: "text",
      left: "center",
      top: "center",
      style: { text: `${total}`, fontSize: 24, fontWeight: "bold", fill: "#0f172a", textAlign: "center" },
    },
    color: ["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#94a3b8"],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">任务类型分布</CardTitle>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 180 }} />
      </CardContent>
    </Card>
  );
}
