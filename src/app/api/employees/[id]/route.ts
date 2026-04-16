import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, skills, metrics, versionLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const emp = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [empSkills, empMetrics, empVersionLogs] = await Promise.all([
    db.select().from(skills).where(eq(skills.employeeId, id)),
    db.select().from(metrics).where(eq(metrics.employeeId, id)),
    db.select().from(versionLogs).where(eq(versionLogs.employeeId, id)),
  ]);

  return NextResponse.json({
    ...emp,
    skills: empSkills,
    metrics: empMetrics,
    versionLogs: empVersionLogs,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const now = new Date();

  await db
    .update(employees)
    .set({
      name: body.name,
      avatar: body.avatar,
      title: body.title,
      team: body.team,
      status: body.status,
      soul: body.soul,
      identity: body.identity,
      description: body.description,
      updatedAt: now,
    })
    .where(eq(employees.id, id));

  const updated = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(employees).where(eq(employees.id, id));
  return new NextResponse(null, { status: 204 });
}
