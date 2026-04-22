import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { eq, like, or, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const conditions = [];

  if (categoryId) {
    conditions.push(eq(helpArticles.categoryId, categoryId));
  }

  if (search) {
    conditions.push(
      or(
        like(helpArticles.title, `%${search}%`),
        like(helpArticles.summary, `%${search}%`)
      )
    );
  }

  const rows = await db
    .select({
      id: helpArticles.id,
      categoryId: helpArticles.categoryId,
      title: helpArticles.title,
      summary: helpArticles.summary,
      sortOrder: helpArticles.sortOrder,
      updatedAt: helpArticles.updatedAt,
    })
    .from(helpArticles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(helpArticles.sortOrder)
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date();
  const article = {
    id: randomUUID(),
    categoryId: body.categoryId,
    title: body.title,
    summary: body.summary ?? null,
    content: body.content,
    sortOrder: body.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(helpArticles).values(article);
  const created = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, article.id))
    .get();

  return NextResponse.json(created, { status: 201 });
}
