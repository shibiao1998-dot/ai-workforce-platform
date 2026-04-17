"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, CheckCircle, Loader, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  runningTasks: number;
  avgQualityScore: number;
}

const STAT_CARDS = [
  { key: "totalTasks" as const, label: "今日任务", icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "completionRate" as const, label: "完成率", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", suffix: "%" },
  { key: "runningTasks" as const, label: "执行中", icon: Loader, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "avgQualityScore" as const, label: "平均质量分", icon: Star, color: "text-purple-600", bg: "bg-purple-50", suffix: "/100" },
];

export function ProductionStats({ timeRange }: { timeRange: string }) {
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useEffect(() => {
    fetch(`/api/production-stats?timeRange=${timeRange}`)
      .then(r => r.json())
      .then(d => setStats(d.summary))
      .catch(() => {});
  }, [timeRange]);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map(c => (
          <Card key={c.key}>
            <CardContent className="p-4">
              <div className="h-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, suffix }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats[key]}{suffix}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
