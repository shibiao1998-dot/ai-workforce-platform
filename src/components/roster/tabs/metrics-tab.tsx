import { Metric } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface MetricsTabProps {
  metrics: Metric[];
}

function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function formatHours(hours: number | null): string {
  if (hours === null) return "—";
  return `${hours.toFixed(1)} h`;
}

export function MetricsTab({ metrics }: MetricsTabProps) {
  // Use the most recent monthly metric
  const latest = metrics
    .filter((m) => m.periodType === "monthly")
    .sort((a, b) => b.period.localeCompare(a.period))[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>任务数</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? latest.taskCount : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>采用率</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? formatRate(latest.adoptionRate) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>准确率</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? formatRate(latest.accuracyRate) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>节省工时</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {latest ? formatHours(latest.humanTimeSaved) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          趋势图表将在 Phase 2 实现
        </CardContent>
      </Card>
    </div>
  );
}
