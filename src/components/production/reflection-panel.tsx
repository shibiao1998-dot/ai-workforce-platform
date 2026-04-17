"use client";

import { AlertTriangle, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reflection {
  problems: string;
  lessons: string;
  improvements: string;
}

const SECTIONS = [
  { key: "problems" as const, label: "发现的问题", icon: AlertTriangle, borderColor: "border-l-amber-500", iconColor: "text-amber-500" },
  { key: "lessons" as const, label: "踩过的坑", icon: Target, borderColor: "border-l-red-500", iconColor: "text-red-500" },
  { key: "improvements" as const, label: "改进建议", icon: Lightbulb, borderColor: "border-l-green-500", iconColor: "text-green-500" },
];

export function ReflectionPanel({ reflection }: { reflection: string | null }) {
  if (!reflection) {
    return <p className="text-sm text-muted-foreground py-4 text-center">暂无执行反思</p>;
  }

  let parsed: Reflection;
  try {
    parsed = JSON.parse(reflection);
  } catch {
    return <p className="text-sm text-muted-foreground py-4">{reflection}</p>;
  }

  return (
    <div className="space-y-3">
      {SECTIONS.map(({ key, label, icon: Icon, borderColor, iconColor }) => {
        const content = parsed[key];
        if (!content) return null;
        return (
          <div key={key} className={cn("rounded-lg border-l-4 bg-muted/30 p-3", borderColor)}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn("h-4 w-4", iconColor)} />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
          </div>
        );
      })}
    </div>
  );
}
