import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees, skills, versionLogs, skillMetrics } from "@/db/schema";
import { getMetrics, getMonthlyTrend } from "@/lib/metric-engine";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("employees", "read", _req);
  if (err) return err;
  const { id } = await params;

  const emp = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [empSkills, currentMetrics, monthlyTrend, empVersionLogs, empSkillMetrics] = await Promise.all([
    db.select().from(skills).where(eq(skills.employeeId, id)),
    getMetrics({ period: currentMonth, employeeId: id }),
    getMonthlyTrend(id, months),
    db.select().from(versionLogs).where(eq(versionLogs.employeeId, id)),
    db.select().from(skillMetrics).where(eq(skillMetrics.employeeId, id)),
  ]);

  const skillMetricsMap = new Map<string, typeof empSkillMetrics>();
  for (const sm of empSkillMetrics) {
    if (!skillMetricsMap.has(sm.skillId)) skillMetricsMap.set(sm.skillId, []);
    skillMetricsMap.get(sm.skillId)!.push(sm);
  }

  return NextResponse.json({
    ...emp,
    skills: empSkills.map(s => ({
      ...s,
      skillMetrics: skillMetricsMap.get(s.id) ?? [],
    })),
    currentMetrics: {
      taskCount: currentMetrics.taskCount,
      adoptionRate: currentMetrics.adoptionRate,
      accuracyRate: currentMetrics.accuracyRate,
      hoursSaved: currentMetrics.hoursSaved,
    },
    monthlyTrend,
    versionLogs: empVersionLogs,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("employees", "write", req);
  if (err) return err;
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
      subTeam: body.subTeam,
      soul: body.soul,
      identity: body.identity,
      description: body.description,
      avatarDescription: body.avatarDescription,
      persona: body.persona,
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("employees", "delete", _req);
  if (err) return err;
  const { id } = await params;
  await db.delete(employees).where(eq(employees.id, id));
  return new NextResponse(null, { status: 204 });
}
