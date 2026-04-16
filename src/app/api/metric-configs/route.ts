import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = await db.select().from(metricConfigs);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();
  await db.insert(metricConfigs).values({
    id,
    employeeId: body.employeeId ?? null,
    taskType: body.taskType,
    humanBaseline: body.humanBaseline,
    costPerHour: body.costPerHour ?? 46.875,
    description: body.description ?? null,
    updatedAt: new Date(),
  });
  const created = await db.select().from(metricConfigs).where(eq(metricConfigs.id, id)).get();
  return NextResponse.json(created, { status: 201 });
}
