import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { metrics, skillMetrics, tasks, employees, skills } from "@/db/schema";
import { eq, and, like, desc } from "drizzle-orm";

const TEAM_LABELS: Record<string, string> = {
  management: "管理团队",
  design: "设计团队",
  production: "生产团队",
};

type MetricsRow = {
  employeeName: string | null;
  team: string;
  period: string;
  taskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  humanTimeSaved: number | null;
};

type SkillMetricsRow = {
  employeeName: string | null;
  team: string;
  skillName: string | null;
  category: string | null;
  period: string;
  invocationCount: number;
  successRate: number | null;
  avgResponseTime: number | null;
};

type TasksRow = {
  name: string;
  employeeName: string | null;
  team: string;
  type: string;
  status: string;
  qualityScore: number | null;
  tokenUsage: number | null;
  retryCount: number | null;
  startTime: Date | null;
};

async function fetchMetrics(search: string, team: string, period: string): Promise<MetricsRow[]> {
  const conditions = [];
  if (search) conditions.push(like(employees.name, `%${search}%`));
  if (team) conditions.push(eq(employees.team, team as "management" | "design" | "production"));
  if (period) conditions.push(eq(metrics.period, period));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      employeeName: employees.name,
      team: employees.team,
      period: metrics.period,
      taskCount: metrics.taskCount,
      adoptionRate: metrics.adoptionRate,
      accuracyRate: metrics.accuracyRate,
      humanTimeSaved: metrics.humanTimeSaved,
    })
    .from(metrics)
    .innerJoin(employees, eq(metrics.employeeId, employees.id))
    .where(whereClause)
    .orderBy(desc(metrics.period));
}

async function fetchSkillMetrics(search: string, team: string, period: string): Promise<SkillMetricsRow[]> {
  const conditions = [];
  if (search) conditions.push(like(employees.name, `%${search}%`));
  if (team) conditions.push(eq(employees.team, team as "management" | "design" | "production"));
  if (period) conditions.push(eq(skillMetrics.period, period));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      employeeName: employees.name,
      team: employees.team,
      skillName: skills.name,
      category: skills.category,
      period: skillMetrics.period,
      invocationCount: skillMetrics.invocationCount,
      successRate: skillMetrics.successRate,
      avgResponseTime: skillMetrics.avgResponseTime,
    })
    .from(skillMetrics)
    .innerJoin(employees, eq(skillMetrics.employeeId, employees.id))
    .innerJoin(skills, eq(skillMetrics.skillId, skills.id))
    .where(whereClause)
    .orderBy(desc(skillMetrics.period));
}

async function fetchTasks(search: string, team: string): Promise<TasksRow[]> {
  const conditions = [];
  if (search) conditions.push(like(tasks.name, `%${search}%`));
  if (team) conditions.push(eq(employees.team, team as "management" | "design" | "production"));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      name: tasks.name,
      employeeName: employees.name,
      team: employees.team,
      type: tasks.type,
      status: tasks.status,
      qualityScore: tasks.qualityScore,
      tokenUsage: tasks.tokenUsage,
      retryCount: tasks.retryCount,
      startTime: tasks.startTime,
    })
    .from(tasks)
    .innerJoin(employees, eq(tasks.employeeId, employees.id))
    .where(whereClause)
    .orderBy(desc(tasks.startTime));
}

function metricsToRows(rows: MetricsRow[]): string[][] {
  return rows.map((r) => [
    r.employeeName ?? "",
    r.team,
    r.period,
    String(r.taskCount),
    r.adoptionRate != null ? (r.adoptionRate * 100).toFixed(1) : "",
    r.accuracyRate != null ? (r.accuracyRate * 100).toFixed(1) : "",
    r.humanTimeSaved != null ? String(r.humanTimeSaved) : "",
  ]);
}

function skillMetricsToRows(rows: SkillMetricsRow[]): string[][] {
  return rows.map((r) => [
    r.employeeName ?? "",
    r.team,
    r.skillName ?? "",
    r.category ?? "",
    r.period,
    String(r.invocationCount),
    r.successRate != null ? (r.successRate * 100).toFixed(1) : "",
    r.avgResponseTime != null ? String(r.avgResponseTime) : "",
  ]);
}

function tasksToRows(rows: TasksRow[]): string[][] {
  return rows.map((r) => [
    r.name,
    r.employeeName ?? "",
    r.team,
    r.type,
    r.status,
    r.qualityScore != null ? String(r.qualityScore) : "",
    r.tokenUsage != null ? String(r.tokenUsage) : "",
    r.tokenUsage != null ? (r.tokenUsage * 0.00015).toFixed(4) : "",
    r.retryCount != null ? String(r.retryCount) : "",
    r.startTime ? r.startTime.toISOString() : "",
  ]);
}

const METRICS_HEADERS = ["员工", "团队", "期间", "任务数", "采纳率(%)", "准确率(%)", "节省人时(h)"];
const SKILL_METRICS_HEADERS = ["员工", "团队", "技能", "分类", "期间", "调用次数", "成功率(%)", "响应时间(ms)"];
const TASKS_HEADERS = ["任务名称", "员工", "团队", "类型", "状态", "质量分", "Token用量", "预估费用(¥)", "重试次数", "开始时间"];

function buildCsv(headers: string[], dataRows: string[][]): string {
  const lines = [headers.join(","), ...dataRows.map((r) => r.join(","))];
  return "\uFEFF" + lines.join("\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "metrics";
  const format = searchParams.get("format") ?? "csv";
  const search = searchParams.get("search") ?? "";
  const team = searchParams.get("team") ?? "";
  const period = searchParams.get("period") ?? "";

  let headers: string[];
  let allRows: string[][];

  if (type === "metrics") {
    const rows = await fetchMetrics(search, team, period);
    headers = METRICS_HEADERS;
    allRows = metricsToRows(rows);
  } else if (type === "skill-metrics") {
    const rows = await fetchSkillMetrics(search, team, period);
    headers = SKILL_METRICS_HEADERS;
    allRows = skillMetricsToRows(rows);
  } else if (type === "tasks") {
    const rows = await fetchTasks(search, team);
    headers = TASKS_HEADERS;
    allRows = tasksToRows(rows);
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const filename = `${type}-export.${format === "xlsx" ? "xlsx" : "csv"}`;

  if (format === "csv") {
    const csv = buildCsv(headers, allRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Excel format
  const wb = XLSX.utils.book_new();

  if (team) {
    // Single team sheet
    const sheetData = [headers, ...allRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, TEAM_LABELS[team] ?? team);
  } else {
    // Group by team into separate sheets
    const teamGroups: Record<string, string[][]> = {};

    for (const row of allRows) {
      // team is always the second column (index 1) for metrics/skill-metrics/tasks
      const rowTeam = row[type === "tasks" ? 2 : 1];
      if (!teamGroups[rowTeam]) teamGroups[rowTeam] = [];
      teamGroups[rowTeam].push(row);
    }

    const teamOrder = ["management", "design", "production"];
    for (const t of teamOrder) {
      const teamRows = teamGroups[t] ?? [];
      const sheetData = [headers, ...teamRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, ws, TEAM_LABELS[t] ?? t);
    }

    // If there are rows with unknown teams not in the standard list
    for (const [t, teamRows] of Object.entries(teamGroups)) {
      if (!teamOrder.includes(t)) {
        const sheetData = [headers, ...teamRows];
        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, TEAM_LABELS[t] ?? t);
      }
    }
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
