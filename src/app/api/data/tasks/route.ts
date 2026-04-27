import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, employees } from "@/db/schema";
import { eq, and, like, desc, gte, lte, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const [, err] = await requirePermission("settings", "read", req);
  if (err) return err;
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const team = searchParams.get("team") ?? "";
  const status = searchParams.get("status") ?? "";
  const type = searchParams.get("type") ?? "";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";

  const conditions = [];
  if (search) conditions.push(like(tasks.name, `%${search}%`));
  if (team) conditions.push(eq(employees.team, team as "management" | "design" | "production"));
  if (status) conditions.push(eq(tasks.status, status as "running" | "completed" | "failed"));
  if (type) conditions.push(eq(tasks.type, type));
  if (employeeId) conditions.push(eq(tasks.employeeId, employeeId));
  // startTime is stored as integer timestamp (epoch ms via Drizzle timestamp mode)
  if (startDate) {
    const ts = new Date(startDate);
    conditions.push(gte(tasks.startTime, ts));
  }
  if (endDate) {
    const ts = new Date(endDate);
    conditions.push(lte(tasks.startTime, ts));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        employeeId: tasks.employeeId,
        employeeName: employees.name,
        employeeAvatar: employees.avatar,
        team: employees.team,
        name: tasks.name,
        type: tasks.type,
        status: tasks.status,
        qualityScore: tasks.qualityScore,
        tokenUsage: tasks.tokenUsage,
        retryCount: tasks.retryCount,
        startTime: tasks.startTime,
        actualEndTime: tasks.actualEndTime,
      })
      .from(tasks)
      .innerJoin(employees, eq(tasks.employeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(tasks.startTime))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(tasks)
      .innerJoin(employees, eq(tasks.employeeId, employees.id))
      .where(whereClause),
  ]);

  const total = countRows[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const data = rows.map((row) => ({
    ...row,
    estimatedCost: row.tokenUsage ? (row.tokenUsage * 0.00015).toFixed(4) : null,
  }));

  return NextResponse.json({ data, total, page, pageSize, totalPages });
}

export async function DELETE(req: NextRequest) {
  const [, err] = await requirePermission("settings", "delete", req);
  if (err) return err;
  const body = await req.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  let deleted = 0;
  for (const id of ids) {
    await db.delete(tasks).where(eq(tasks.id, id));
    deleted++;
  }

  return NextResponse.json({ deleted });
}
