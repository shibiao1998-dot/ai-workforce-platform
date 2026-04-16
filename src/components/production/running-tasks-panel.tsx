"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RunningTask {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  currentStep: string | null;
  startTime: string | null;
  estimatedEndTime: string | null;
  team: string;
  employeeName: string;
}

const TEAM_GRADIENT: Record<string, string> = {
  management: "from-purple-50 to-white",
  design: "from-blue-50 to-white",
  production: "from-green-50 to-white",
};

function formatDuration(startTime: string | null): string {
  if (!startTime) return "—";
  const diff = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟`;
  return `${Math.floor(mins / 60)}小时${mins % 60}分`;
}

export function RunningTasksPanel() {
  const [tasks, setTasks] = useState<RunningTask[]>([]);
  const [teamFilter, setTeamFilter] = useState("all");

  const fetchTasks = async () => {
    const url =
      teamFilter !== "all"
        ? `/api/tasks?status=running&team=${teamFilter}`
        : `/api/tasks?status=running`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter]);

  return (
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
          <Card
            key={task.id}
            className={cn(
              "relative overflow-hidden",
              `bg-gradient-to-br ${TEAM_GRADIENT[task.team]}`
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{task.employeeName}</p>
                  <p className="font-medium text-sm truncate">{task.name}</p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-xs flex-shrink-0"
                >
                  执行中
                </Badge>
              </div>
              <Progress value={task.progress} className="mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{task.currentStep ?? "处理中..."}</span>
                <span className="font-bold text-primary">{task.progress}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                已运行 {formatDuration(task.startTime)}
              </p>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && (
          <p className="text-muted-foreground text-sm col-span-3">
            当前没有执行中的任务
          </p>
        )}
      </div>
    </div>
  );
}
