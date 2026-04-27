import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requirePermission } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const action = searchParams.get("action");
  const operator = searchParams.get("operator");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format");

  const where = [];
  if (action) where.push(eq(auditLogs.action, action));
  if (operator) where.push(eq(auditLogs.operatorUcId, operator));
  if (from) where.push(gte(auditLogs.createdAt, new Date(from)));
  if (to) where.push(lte(auditLogs.createdAt, new Date(to)));

  const whereClause = where.length ? and(...where) : undefined;

  if (format === "csv") {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10000);
    const header = "时间,操作者UC,操作者昵称,动作,目标类型,目标ID,详情,IP,UA\n";
    const body = rows
      .map((r) =>
        [
          r.createdAt?.toISOString() ?? "",
          r.operatorUcId,
          r.operatorNickname,
          r.action,
          r.targetType ?? "",
          r.targetId ?? "",
          (r.details ?? "").replace(/"/g, '""'),
          r.ip ?? "",
          r.userAgent ?? "",
        ]
          .map((s) => `"${s}"`)
          .join(",")
      )
      .join("\n");
    return new NextResponse(header + body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="audit-logs.csv"`,
      },
    });
  }

  const totalRow = await db.select({ c: sql<number>`COUNT(*)` }).from(auditLogs).where(whereClause);
  const rows = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    items: rows,
    page,
    pageSize,
    total: totalRow[0].c,
  });
}
