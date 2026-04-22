import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getMetrics } from "@/lib/metric-engine";

function getDateRange(timeRange: string) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;
  if (timeRange === "7d") {
    start = new Date(end.getTime() - 7 * 86400000);
  } else if (timeRange === "30d") {
    start = new Date(end.getTime() - 30 * 86400000);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
  return { start, end };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get("timeRange") ?? "today";
  const selectedDate = searchParams.get("date");

  const { start, end } = getDateRange(timeRange);

  const allTasks = await db
    .select({
      id: tasks.id,
      status: tasks.status,
      team: tasks.team,
      type: tasks.type,
      startTime: tasks.startTime,
      qualityScore: tasks.qualityScore,
      employeeId: tasks.employeeId,
      employeeName: employees.name,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(and(gte(tasks.startTime, start), lte(tasks.startTime, end)));

  const engineMetrics = await getMetrics({ timeRange: timeRange as "today" | "7d" | "30d" });

  const dailyMap = new Map<string, { management: number; design: number; production: number }>();
  for (const t of allTasks) {
    if (t.status !== "completed" || !t.startTime) continue;
    const day = t.startTime.toISOString().slice(0, 10);
    if (!dailyMap.has(day)) dailyMap.set(day, { management: 0, design: 0, production: 0 });
    const entry = dailyMap.get(day)!;
    if (t.team in entry) entry[t.team as keyof typeof entry]++;
  }
  const dailyTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  const filteredByDate = selectedDate
    ? allTasks.filter(t => t.startTime && t.startTime.toISOString().startsWith(selectedDate))
    : allTasks;

  const typeMap = new Map<string, number>();
  for (const t of filteredByDate) {
    typeMap.set(t.type, (typeMap.get(t.type) ?? 0) + 1);
  }
  const typeDistribution = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

  const empMap = new Map<string, { employeeId: string; name: string; team: string; count: number }>();
  for (const t of filteredByDate) {
    if (t.status !== "completed") continue;
    const existing = empMap.get(t.employeeId);
    if (existing) {
      existing.count++;
    } else {
      empMap.set(t.employeeId, { employeeId: t.employeeId, name: t.employeeName, team: t.team, count: 1 });
    }
  }
  const employeeRanking = Array.from(empMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  const dateQualityScores = filteredByDate.filter(t => t.qualityScore != null).map(t => t.qualityScore!);
  const dateAvgQuality = dateQualityScores.length > 0
    ? Math.round(dateQualityScores.reduce((a, b) => a + b, 0) / dateQualityScores.length)
    : engineMetrics.qualityScore;

  return NextResponse.json({
    summary: {
      totalTasks: engineMetrics.taskCount,
      completedTasks: engineMetrics.completedCount,
      completionRate: engineMetrics.completionRate,
      runningTasks: engineMetrics.runningCount,
      avgQualityScore: engineMetrics.qualityScore,
    },
    dailyTrend,
    typeDistribution,
    employeeRanking,
    dateAvgQuality,
  });
}
