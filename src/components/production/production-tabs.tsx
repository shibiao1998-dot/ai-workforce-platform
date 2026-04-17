"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RunningTasksPanel } from "./running-tasks-panel";
import { TaskHistoryTable } from "./task-history-table";
import { ProductionDashboard } from "./production-dashboard";

interface ProductionTabsProps {
  initialTasks: Array<{
    id: string;
    name: string;
    type: string;
    status: "running" | "completed" | "failed";
    startTime: string | null;
    actualEndTime: string | null;
    team: string;
    employeeName: string;
    qualityScore: number | null;
  }>;
  timeRange: string;
}

export function ProductionTabs({ initialTasks, timeRange }: ProductionTabsProps) {
  return (
    <Tabs defaultValue="realtime">
      <TabsList variant="line">
        <TabsTrigger value="realtime">实时看板</TabsTrigger>
        <TabsTrigger value="dashboard">数据面板</TabsTrigger>
        <TabsTrigger value="history">历史记录</TabsTrigger>
      </TabsList>
      <TabsContent value="realtime" className="mt-4">
        <RunningTasksPanel />
      </TabsContent>
      <TabsContent value="dashboard" className="mt-4">
        <ProductionDashboard timeRange={timeRange} />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <TaskHistoryTable initialTasks={initialTasks} />
      </TabsContent>
    </Tabs>
  );
}
