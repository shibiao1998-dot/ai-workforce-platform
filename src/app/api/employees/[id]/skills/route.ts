import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { randomUUID } from "crypto";
import { requirePermission } from "@/lib/authz";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("employees", "write", req);
  if (err) return err;
  const { id } = await params;
  const body = await req.json();

  const employee = await db.query.employees.findFirst({
    where: (e, { eq }) => eq(e.id, id),
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const skillList: Array<{
    name: string;
    level?: number;
    category?: string;
    description?: string;
  }> = body.skills ?? [];

  if (skillList.length === 0) {
    return NextResponse.json({ created: 0 });
  }

  const rows = skillList.map((s) => ({
    id: randomUUID(),
    employeeId: id,
    name: s.name,
    level: s.level ?? 3,
    category: s.category ?? null,
    description: s.description ?? null,
  }));

  await db.insert(skills).values(rows);

  return NextResponse.json({ created: rows.length }, { status: 201 });
}
