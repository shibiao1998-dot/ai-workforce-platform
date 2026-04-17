"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StepsStepper } from "./steps-stepper";
import { OutputsList } from "./outputs-list";
import { ReflectionPanel } from "./reflection-panel";

interface TaskDetail {
  id: string;
  name: string;
  type: string;
  status: "running" | "completed" | "failed";
  progress: number;
  team: string;
  employeeName: string;
  startTime: string | null;
  estimatedEndTime: string | null;
  actualEndTime: string | null;
  qualityScore: number | null;
  retryCount: number | null;
  tokenUsage: number | null;
  reflection: string | null;
  steps: Array<{
    id: string;
    stepOrder: number;
    name: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    thought: string | null;
    startedAt: string | null;
    completedAt: string | null;
  }>;
  outputs: Array<{
    id: string;
    type: "document" | "resource" | "report" | "media" | "other";
    title: string;
    content: string | null;
    url: string | null;
    createdAt: string | null;
  }>;
}

const STATUS_CONFIG = {
  running: { label: "执行中", className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "已完成", className: "bg-green-50 text-green-700 border-green-200" },
  failed: { label: "失败", className: "bg-red-50 text-red-700 border-red-200" },
};

function calcDuration(start: string | null, end: string | null) {
  if (!start) return "—";
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diff = endTime - new Date(start).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60}m`;
}

function formatTokenCost(tokens: number | null) {
  if (tokens == null) return "—";
  const cost = tokens * 0.000006;
  return `¥${cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)}`;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId || !open) { setTask(null); return; }
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(d => setTask(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId, open]);

  const qualityColor = task?.qualityScore != null
    ? task.qualityScore >= 80 ? "text-green-600" : task.qualityScore >= 60 ? "text-amber-600" : "text-red-600"
    : "";
  const retryColor = task?.retryCount != null
    ? task.retryCount === 0 ? "text-green-600" : task.retryCount >= 3 ? "text-red-600" : "text-amber-600"
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {loading || !task ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{task.name}</DialogTitle>
                <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG[task.status].className)}>
                  {STATUS_CONFIG[task.status].label}
                </Badge>
              </div>
              <DialogDescription>
                {task.employeeName} · {task.type}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-4 gap-px rounded-lg bg-border overflow-hidden">
              <div className="bg-background p-3 text-center">
                <p className={cn("text-xl font-bold", qualityColor)}>{task.qualityScore ?? "—"}</p>
                <p className="text-xs text-muted-foreground">质量评分</p>
              </div>
              <div className="bg-background p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{calcDuration(task.startTime, task.actualEndTime)}</p>
                <p className="text-xs text-muted-foreground">执行耗时</p>
              </div>
              <div className="bg-background p-3 text-center">
                <p className={cn("text-xl font-bold", retryColor)}>{task.retryCount ?? "—"}</p>
                <p className="text-xs text-muted-foreground">重试次数</p>
              </div>
              <div className="bg-background p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{formatTokenCost(task.tokenUsage)}</p>
                <p className="text-xs text-muted-foreground">预估费用</p>
              </div>
            </div>

            <Tabs defaultValue="steps" className="flex-1 min-h-0">
              <TabsList variant="line">
                <TabsTrigger value="steps">执行步骤</TabsTrigger>
                <TabsTrigger value="outputs">产出内容</TabsTrigger>
                <TabsTrigger value="reflection">
                  执行反思
                </TabsTrigger>
              </TabsList>
              <div className="overflow-y-auto flex-1 mt-3 max-h-[40vh]">
                <TabsContent value="steps">
                  <StepsStepper steps={task.steps} />
                </TabsContent>
                <TabsContent value="outputs">
                  <OutputsList outputs={task.outputs} />
                </TabsContent>
                <TabsContent value="reflection">
                  <ReflectionPanel reflection={task.reflection} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
