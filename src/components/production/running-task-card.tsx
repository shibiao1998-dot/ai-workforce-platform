"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskStep {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

interface RunningTaskCardProps {
  task: {
    id: string;
    name: string;
    type: string;
    progress: number;
    currentStep: string | null;
    startTime: string | null;
    team: string;
    employeeName: string;
  };
  steps?: TaskStep[];
  onClick: () => void;
}

const TEAM_BORDER: Record<string, string> = {
  management: "border-l-purple-500",
  design: "border-l-blue-500",
  production: "border-l-green-500",
};

function formatDuration(startTime: string | null): string {
  if (!startTime) return "—";
  const diff = Date.now() - new Date(startTime).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}分钟`;
  return `${Math.floor(mins / 60)}小时${mins % 60}分`;
}

export function RunningTaskCard({ task, steps, onClick }: RunningTaskCardProps) {
  const currentStepName = steps?.find(s => s.status === "running")?.name ?? task.currentStep;

  return (
    <Card
      className={cn(
        "cursor-pointer border-l-4 transition-shadow hover:shadow-md",
        TEAM_BORDER[task.team] ?? "border-l-gray-300"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{task.name}</p>
            <p className="text-xs text-muted-foreground">
              {task.employeeName} · {task.type}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-lg font-bold text-primary">{task.progress}%</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
              执行中
            </Badge>
          </div>
        </div>

        {steps && steps.length > 0 && (
          <div className="flex items-center gap-1">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border",
                    step.status === "completed" && "bg-green-500 border-green-500",
                    step.status === "running" && "bg-blue-500 border-blue-500 animate-pulse",
                    step.status === "pending" && "bg-transparent border-gray-300",
                    step.status === "failed" && "bg-red-500 border-red-500",
                    step.status === "skipped" && "bg-gray-300 border-gray-300"
                  )}
                />
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-3",
                      step.status === "completed" ? "bg-green-500" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-blue-600 truncate">
            {currentStepName ?? "处理中..."}
          </p>
          <p className="text-xs text-muted-foreground flex-shrink-0">
            已运行 {formatDuration(task.startTime)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
