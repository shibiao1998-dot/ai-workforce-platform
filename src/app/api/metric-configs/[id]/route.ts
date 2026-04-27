import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("settings", "write", req);
  if (err) return err;
  const { id } = await params;
  const body = await req.json();
  await db
    .update(metricConfigs)
    .set({
      taskType: body.taskType,
      humanBaseline: body.humanBaseline,
      costPerHour: body.costPerHour,
      description: body.description,
      updatedAt: new Date(),
    })
    .where(eq(metricConfigs.id, id));
  const updated = await db.select().from(metricConfigs).where(eq(metricConfigs.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("settings", "delete", req);
  if (err) return err;
  const { id } = await params;
  await db.delete(metricConfigs).where(eq(metricConfigs.id, id));
  return new NextResponse(null, { status: 204 });
}
