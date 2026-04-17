import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skillMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { invocationCount, successRate, avgResponseTime } = body;

  await db
    .update(skillMetrics)
    .set({
      invocationCount: invocationCount ?? undefined,
      successRate: successRate ?? undefined,
      avgResponseTime: avgResponseTime ?? undefined,
    })
    .where(eq(skillMetrics.id, id));

  return NextResponse.json({ ok: true });
}
