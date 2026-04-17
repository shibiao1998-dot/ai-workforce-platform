"use client";

import { useEffect, useState } from "react";
import { TrendChart } from "./charts/trend-chart";
import { TypeDistributionChart } from "./charts/type-distribution-chart";
import { QualityGauge } from "./charts/quality-gauge";
import { EmployeeRankingChart } from "./charts/employee-ranking-chart";

interface StatsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    runningTasks: number;
    avgQualityScore: number;
  };
  dailyTrend: Array<{ date: string; management: number; design: number; production: number }>;
  typeDistribution: Array<{ type: string; count: number }>;
  employeeRanking: Array<{ employeeId: string; name: string; team: string; count: number }>;
  dateAvgQuality: number;
}

export function ProductionDashboard({ timeRange }: { timeRange: string }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = async (date: string | null) => {
    const params = new URLSearchParams({ timeRange });
    if (date) params.set("date", date);
    const res = await fetch(`/api/production-stats?${params}`);
    const json = await res.json();
    setData(json);
  };

  useEffect(() => {
    fetchData(selectedDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, selectedDate]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TrendChart
            data={data.dailyTrend}
            onDateClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>
        <div className="lg:col-span-2 grid gap-4">
          <TypeDistributionChart data={data.typeDistribution} />
          <QualityGauge score={data.dateAvgQuality} />
        </div>
      </div>
      <EmployeeRankingChart data={data.employeeRanking} />
    </div>
  );
}
