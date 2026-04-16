"use client";

import { KpiSection } from "./kpi-section";
import { TeamComparisonChart } from "./team-comparison-chart";
import { ActivityHeatmap } from "./activity-heatmap";
import { TaskFeed } from "./task-feed";

interface DashboardShellProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  summary: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teamComparison: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  heatmap: any;
}

export function DashboardShell({ summary, teamComparison, heatmap }: DashboardShellProps) {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold text-foreground">AI 驾驶舱</h1>
        <p className="text-muted-foreground mt-1">AI团队全局视图 · 实时数据</p>
      </div>

      {/* KPI Cards */}
      <div className="animate-fade-in-up animate-delay-100">
        <KpiSection data={summary} />
      </div>

      {/* Team comparison */}
      <div className="animate-fade-in-up animate-delay-200">
        <TeamComparisonChart data={teamComparison} />
      </div>

      {/* Heatmap + Feed */}
      <div className="animate-fade-in-up animate-delay-300 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActivityHeatmap data={heatmap} />
        </div>
        <div>
          <TaskFeed />
        </div>
      </div>
    </div>
  );
}
