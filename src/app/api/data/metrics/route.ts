import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { metrics, employees } from "@/db/schema";
import { eq, and, like, desc, asc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const team = searchParams.get("team") ?? "";
  const period = searchParams.get("period") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const sort = searchParams.get("sort") ?? "period";
  const order = searchParams.get("order") ?? "desc";

  const conditions = [];
  if (search) conditions.push(like(employees.name, `%${search}%`));
  if (team) conditions.push(eq(employees.team, team as "management" | "design" | "production"));
  if (period) conditions.push(eq(metrics.period, period));
  if (employeeId) conditions.push(eq(metrics.employeeId, employeeId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort column
  const sortableColumns: Record<string, unknown> = {
    period: metrics.period,
    taskCount: metrics.taskCount,
    adoptionRate: metrics.adoptionRate,
    accuracyRate: metrics.accuracyRate,
    humanTimeSaved: metrics.humanTimeSaved,
    employeeName: employees.name,
  };
  const sortCol = sortableColumns[sort] ?? metrics.period;
  const orderFn = order === "asc" ? asc : desc;

  const offset = (page - 1) * pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: metrics.id,
        employeeId: metrics.employeeId,
        employeeName: employees.name,
        employeeAvatar: employees.avatar,
        team: employees.team,
        period: metrics.period,
        periodType: metrics.periodType,
        taskCount: metrics.taskCount,
        adoptionRate: metrics.adoptionRate,
        accuracyRate: metrics.accuracyRate,
        humanTimeSaved: metrics.humanTimeSaved,
        customMetrics: metrics.customMetrics,
        createdAt: metrics.createdAt,
      })
      .from(metrics)
      .innerJoin(employees, eq(metrics.employeeId, employees.id))
      .where(whereClause)
      .orderBy(orderFn(sortCol as Parameters<typeof asc>[0]))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(metrics)
      .innerJoin(employees, eq(metrics.employeeId, employees.id))
      .where(whereClause),
  ]);

  const total = countRows[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({ data: rows, total, page, pageSize, totalPages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    employeeId,
    period,
    periodType = "monthly",
    taskCount,
    adoptionRate,
    accuracyRate,
    humanTimeSaved,
    customMetrics,
  } = body;

  if (!employeeId || !period) {
    return NextResponse.json({ error: "employeeId and period are required" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(metrics).values({
    id,
    employeeId,
    period,
    periodType,
    taskCount: taskCount ?? 0,
    adoptionRate: adoptionRate ?? null,
    accuracyRate: accuracyRate ?? null,
    humanTimeSaved: humanTimeSaved ?? null,
    customMetrics: customMetrics ?? null,
    createdAt: new Date(),
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  let deleted = 0;
  for (const id of ids) {
    await db.delete(metrics).where(eq(metrics.id, id));
    deleted++;
  }

  return NextResponse.json({ deleted });
}
