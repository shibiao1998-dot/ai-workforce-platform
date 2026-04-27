import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs } from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requirePermission } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const [, err] = await requirePermission("settings", "read", req);
  if (err) return err;
  const { searchParams } = req.nextUrl;
  const level = searchParams.get("level");
  const team = searchParams.get("team");
  const employeeId = searchParams.get("employeeId");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  if (level === "global") {
    conditions.push(isNull(metricConfigs.employeeId));
    conditions.push(isNull(metricConfigs.team));
  } else if (level === "team") {
    conditions.push(isNull(metricConfigs.employeeId));
    conditions.push(isNotNull(metricConfigs.team));
    if (team) conditions.push(eq(metricConfigs.team, team as "management" | "design" | "production"));
  } else if (level === "employee") {
    conditions.push(isNotNull(metricConfigs.employeeId));
    if (employeeId) conditions.push(eq(metricConfigs.employeeId, employeeId));
  } else if (team) {
    conditions.push(eq(metricConfigs.team, team as "management" | "design" | "production"));
  }

  const rows =
    conditions.length > 0
      ? await db.select().from(metricConfigs).where(and(...conditions))
      : await db.select().from(metricConfigs);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const [, err] = await requirePermission("settings", "write", req);
  if (err) return err;
  const body = await req.json();
  const id = randomUUID();
  await db.insert(metricConfigs).values({
    id,
    employeeId: body.employeeId ?? null,
    team: body.team ?? null,
    taskType: body.taskType,
    humanBaseline: body.humanBaseline,
    costPerHour: body.costPerHour ?? 46.875,
    description: body.description ?? null,
    updatedAt: new Date(),
  });
  const created = await db.select().from(metricConfigs).where(eq(metricConfigs.id, id)).get();
  return NextResponse.json(created, { status: 201 });
}
