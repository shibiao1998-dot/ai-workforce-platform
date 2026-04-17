import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metrics } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { taskCount, adoptionRate, accuracyRate, humanTimeSaved } = body;

  await db
    .update(metrics)
    .set({
      taskCount: taskCount ?? undefined,
      adoptionRate: adoptionRate ?? undefined,
      accuracyRate: accuracyRate ?? undefined,
      humanTimeSaved: humanTimeSaved ?? undefined,
    })
    .where(eq(metrics.id, id));

  return NextResponse.json({ ok: true });
}
