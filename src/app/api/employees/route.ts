import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, metrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  const status = searchParams.get("status");

  const rows = await db.query.employees.findMany({
    where: (e, { and, eq: eqFn }) => {
      const conditions = [];
      if (team) conditions.push(eqFn(e.team, team as "management" | "design" | "production"));
      if (status) conditions.push(eqFn(e.status, status as "active" | "developing" | "planned"));
      return conditions.length > 0 ? and(...conditions) : undefined;
    },
    orderBy: (e, { asc }) => [asc(e.team), asc(e.name)],
  });

  // Get latest monthly metric per employee
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const metricRows = await db
    .select()
    .from(metrics)
    .where(eq(metrics.period, currentMonth));

  const metricMap = new Map(metricRows.map((m) => [m.employeeId, m]));

  const result = rows.map((emp) => {
    const m = metricMap.get(emp.id);
    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      description: emp.description ?? null,
      subTeam: emp.subTeam ?? null,
      monthlyTaskCount: m?.taskCount ?? 0,
      adoptionRate: m?.adoptionRate ?? null,
      accuracyRate: m?.accuracyRate ?? null,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date();
  const id = randomUUID();

  await db.insert(employees).values({
    id,
    name: body.name,
    avatar: body.avatar ?? null,
    title: body.title,
    team: body.team,
    status: body.status ?? "planned",
    soul: body.soul ?? null,
    identity: body.identity ?? null,
    description: body.description ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  return NextResponse.json(created, { status: 201 });
}
