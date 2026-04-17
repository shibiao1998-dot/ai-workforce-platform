"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RunningTaskCard } from "./running-task-card";
import { TaskDetailDialog } from "./task-detail-dialog";

interface RunningTask {
  id: string;
  name: string;
  type: string;
  status: "running";
  progress: number;
  currentStep: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  team: string;
  employeeName: string;
}

interface RunningTaskStep {
  id: string;
  taskId: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

export function RunningTasksPanel() {
  const [tasks, setTasks] = useState<RunningTask[]>([]);
  const [stepsMap, setStepsMap] = useState<Record<string, RunningTaskStep[]>>({});
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const url = teamFilter !== "all"
      ? `/api/tasks?status=running&team=${teamFilter}`
      : `/api/tasks?status=running`;
    const res = await fetch(url, { cache: "no-store" });
    const data: RunningTask[] = await res.json();
    setTasks(data);

    const newStepsMap: Record<string, RunningTaskStep[]> = {};
    await Promise.all(
      data.map(async (t) => {
        try {
          const r = await fetch(`/api/tasks/${t.id}`, { cache: "no-store" });
          const detail = await r.json();
          if (detail.steps) newStepsMap[t.id] = detail.steps;
        } catch {}
      })
    );
    setStepsMap(newStepsMap);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">实时任务面板</h2>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {tasks.length} 个任务执行中
            </span>
          </div>
          <Select value={teamFilter} onValueChange={(v) => setTeamFilter(v ?? "all")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="全部团队" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部团队</SelectItem>
              <SelectItem value="management">管理团队</SelectItem>
              <SelectItem value="design">设计师团队</SelectItem>
              <SelectItem value="production">生产团队</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <RunningTaskCard
              key={task.id}
              task={task}
              steps={stepsMap[task.id]}
              onClick={() => setSelectedTaskId(task.id)}
            />
          ))}
          {tasks.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-sm">当前没有执行中的任务</p>
            </div>
          )}
        </div>
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={selectedTaskId !== null}
        onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
      />
    </>
  );
}
