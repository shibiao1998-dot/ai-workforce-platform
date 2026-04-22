import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpCategories, helpArticles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = await db
    .select({
      id: helpCategories.id,
      name: helpCategories.name,
      icon: helpCategories.icon,
      sortOrder: helpCategories.sortOrder,
      createdAt: helpCategories.createdAt,
      updatedAt: helpCategories.updatedAt,
      articleCount: sql<number>`(SELECT COUNT(*) FROM help_articles WHERE help_articles.category_id = ${helpCategories.id})`,
    })
    .from(helpCategories)
    .orderBy(helpCategories.sortOrder);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();
  await db.insert(helpCategories).values({
    id,
    name: body.name,
    icon: body.icon ?? null,
    sortOrder: body.sortOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const created = await db.select().from(helpCategories).where(eq(helpCategories.id, id)).get();
  return NextResponse.json(created, { status: 201 });
}
