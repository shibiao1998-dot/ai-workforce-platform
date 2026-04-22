import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .get();

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (body.title !== undefined) updates.title = body.title;
  if (body.summary !== undefined) updates.summary = body.summary;
  if (body.content !== undefined) updates.content = body.content;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  await db.update(helpArticles).set(updates).where(eq(helpArticles.id, id));
  const updated = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(helpArticles).where(eq(helpArticles.id, id));
  return new NextResponse(null, { status: 204 });
}
