import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpCategories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("help", "write", req);
  if (err) return err;
  const { id } = await params;
  const body = await req.json();
  await db
    .update(helpCategories)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(helpCategories.id, id));
  const updated = await db.select().from(helpCategories).where(eq(helpCategories.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("help", "delete", req);
  if (err) return err;
  const { id } = await params;
  await db.delete(helpCategories).where(eq(helpCategories.id, id));
  return new NextResponse(null, { status: 204 });
}
