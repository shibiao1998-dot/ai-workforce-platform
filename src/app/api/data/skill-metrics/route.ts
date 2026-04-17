import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { skillMetrics, employees, skills } from "@/db/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const team = searchParams.get("team") ?? "";
  const period = searchParams.get("period") ?? "";
  const employeeId = searchParams.get("employeeId") ?? "";
  const category = searchParams.get("category") ?? "";

  const conditions = [];
  if (search) conditions.push(like(employees.name, `%${search}%`));
  if (team) conditions.push(eq(employees.team, team as "management" | "design" | "production"));
  if (period) conditions.push(eq(skillMetrics.period, period));
  if (employeeId) conditions.push(eq(skillMetrics.employeeId, employeeId));
  if (category) conditions.push(eq(skills.category, category));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * pageSize;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: skillMetrics.id,
        employeeId: skillMetrics.employeeId,
        employeeName: employees.name,
        employeeAvatar: employees.avatar,
        team: employees.team,
        skillId: skillMetrics.skillId,
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
      .orderBy(desc(skillMetrics.period))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(skillMetrics)
      .innerJoin(employees, eq(skillMetrics.employeeId, employees.id))
      .innerJoin(skills, eq(skillMetrics.skillId, skills.id))
      .where(whereClause),
  ]);

  const total = countRows[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json({ data: rows, total, page, pageSize, totalPages });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { skillId, employeeId, period, invocationCount, successRate, avgResponseTime } = body;

  if (!skillId || !employeeId || !period) {
    return NextResponse.json(
      { error: "skillId, employeeId and period are required" },
      { status: 400 }
    );
  }

  const id = randomUUID();
  await db.insert(skillMetrics).values({
    id,
    skillId,
    employeeId,
    period,
    invocationCount: invocationCount ?? 0,
    successRate: successRate ?? null,
    avgResponseTime: avgResponseTime ?? null,
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
    await db.delete(skillMetrics).where(eq(skillMetrics.id, id));
    deleted++;
  }

  return NextResponse.json({ deleted });
}
