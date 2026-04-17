"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsTab } from "./metrics-tab";
import { SkillMetricsTab } from "./skill-metrics-tab";
import { TasksTab } from "./tasks-tab";

export function DataManagementCenter() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">数据指标管理</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          管理员工绩效、技能指标和任务数据，支持筛选、导出与 CRUD 操作
        </p>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="metrics">📊 员工绩效</TabsTrigger>
          <TabsTrigger value="skill-metrics">⚡ 技能指标</TabsTrigger>
          <TabsTrigger value="tasks">📋 任务数据</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <MetricsTab />
        </TabsContent>

        <TabsContent value="skill-metrics">
          <SkillMetricsTab />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
