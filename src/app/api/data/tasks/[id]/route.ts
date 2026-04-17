import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { qualityScore, retryCount, tokenUsage, status } = body;

  const updateFields: Partial<typeof tasks.$inferInsert> = {};
  if (qualityScore !== undefined) updateFields.qualityScore = qualityScore;
  if (retryCount !== undefined) updateFields.retryCount = retryCount;
  if (tokenUsage !== undefined) updateFields.tokenUsage = tokenUsage;
  if (status !== undefined) updateFields.status = status;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(tasks).set(updateFields).where(eq(tasks.id, id));

  return NextResponse.json({ ok: true });
}
