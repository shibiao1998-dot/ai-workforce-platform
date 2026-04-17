"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Minus, ChevronDown, ChevronRight } from "lucide-react";

interface Step {
  id: string;
  stepOrder: number;
  name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  thought: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

function formatStepDuration(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

export function StepsStepper({ steps }: { steps: Step[] }) {
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

  const toggleThought = (id: string) => {
    setExpandedThoughts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const hasThought = step.thought != null;
        const isExpanded = expandedThoughts.has(step.id);

        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  step.status === "completed" && "bg-green-500 text-white",
                  step.status === "running" && "bg-blue-500 text-white animate-pulse",
                  step.status === "pending" && "border-2 border-gray-300 text-gray-300",
                  step.status === "failed" && "bg-red-500 text-white",
                  step.status === "skipped" && "bg-gray-300 text-white"
                )}
              >
                {step.status === "completed" && <Check className="h-3.5 w-3.5" />}
                {step.status === "failed" && <X className="h-3.5 w-3.5" />}
                {step.status === "skipped" && <Minus className="h-3.5 w-3.5" />}
                {step.status === "running" && <span className="h-2 w-2 rounded-full bg-white" />}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px]",
                    step.status === "completed" ? "bg-green-500" :
                    step.status === "running" ? "bg-blue-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>

            <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
              <div className="flex items-center justify-between">
                <p className={cn(
                  "text-sm font-medium",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "skipped" && "text-muted-foreground line-through"
                )}>
                  {step.stepOrder}. {step.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {step.status === "running" ? "执行中..." : formatStepDuration(step.startedAt, step.completedAt) ?? ""}
                </span>
              </div>

              {hasThought && (
                <button
                  onClick={() => toggleThought(step.id)}
                  className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  思考过程
                </button>
              )}
              {hasThought && isExpanded && (
                <div className="mt-1 rounded-md border-l-2 border-gray-300 bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {step.thought}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
