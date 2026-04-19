"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductionStats } from "./production-stats";
import { ProductionTabs } from "./production-tabs";

interface ProductionClientProps {
  initialTasks: Array<{
    id: string;
    name: string;
    type: string;
    status: "running" | "completed" | "failed";
    startTime: string | null;
    actualEndTime: string | null;
    team: string;
    employeeId: string;
    employeeName: string;
    qualityScore: number | null;
  }>;
  initialEmployeeId?: string;
  initialHighlightTaskId?: string;
  initialSort?: string;
}

const TIME_RANGES = [
  { value: "today", label: "今日" },
  { value: "7d", label: "7日" },
  { value: "30d", label: "30日" },
];

export function ProductionClient({
  initialTasks,
  initialEmployeeId,
  initialHighlightTaskId,
  initialSort,
}: ProductionClientProps) {
  const [timeRange, setTimeRange] = useState("today");

  // Filter tasks by employee if param provided
  const filteredTasks = initialEmployeeId
    ? initialTasks.filter((t) => t.employeeId === initialEmployeeId)
    : initialTasks;

  // Find employee name for header display
  const filterEmployeeName = initialEmployeeId
    ? (initialTasks.find((t) => t.employeeId === initialEmployeeId)?.employeeName ?? null)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">生产看板</h1>
          <p className="text-muted-foreground mt-1">
            {filterEmployeeName ? `${filterEmployeeName} 的任务` : "AI团队实时工作状态与数据分析"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filterEmployeeName && (
            <a
              href="/production"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
            >
              清除筛选
            </a>
          )}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {TIME_RANGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  timeRange === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ProductionStats timeRange={timeRange} />
      <ProductionTabs
        initialTasks={filteredTasks}
        timeRange={timeRange}
        highlightTaskId={initialHighlightTaskId}
        initialSort={initialSort}
      />
    </div>
  );
}

