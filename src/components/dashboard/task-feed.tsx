"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  startTime: string | null;
  actualEndTime: string | null;
  employeeName: string;
  team: string;
}

const TEAM_COLOR: Record<string, string> = {
  management: "text-[#c084fc]",
  design: "text-[#00d4ff]",
  production: "text-[#00ff88]",
};

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  completed: { label: "已完成", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "失败", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function TaskFeed() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const fetchTasks = async () => {
    const res = await fetch("/api/dashboard/recent-tasks", { cache: "no-store" });
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">最近任务动态</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            实时更新
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg p-2.5 bg-card/50 border border-border/50 hover:border-border transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn("text-xs font-medium truncate", TEAM_COLOR[task.team])}>
                  {task.employeeName}
                </span>
                <Badge variant="outline" className={cn("text-xs py-0 px-1.5", STATUS_CONFIG[task.status].className)}>
                  {STATUS_CONFIG[task.status].label}
                </Badge>
              </div>
              <p className="text-sm text-foreground truncate">{task.name}</p>
            </div>
            {task.status === "running" && (
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-bold text-primary">{task.progress}%</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
