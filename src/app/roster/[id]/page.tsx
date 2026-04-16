import { notFound } from "next/navigation";
import { db } from "@/db";
import { skills, metrics, versionLogs, skillMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EmployeeDetail } from "@/components/roster/employee-detail";
import { Employee } from "@/lib/types";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const emp = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  if (!emp) {
    notFound();
  }

  const [empSkills, empMetrics, empVersionLogs, empSkillMetrics] = await Promise.all([
    db.select().from(skills).where(eq(skills.employeeId, id)),
    db.select().from(metrics).where(eq(metrics.employeeId, id)),
    db.select().from(versionLogs).where(eq(versionLogs.employeeId, id)),
    db.select().from(skillMetrics).where(eq(skillMetrics.employeeId, id)),
  ]);

  const skillMetricsMap = new Map<string, typeof empSkillMetrics>();
  for (const sm of empSkillMetrics) {
    if (!skillMetricsMap.has(sm.skillId)) skillMetricsMap.set(sm.skillId, []);
    skillMetricsMap.get(sm.skillId)!.push(sm);
  }

  const employee: Employee = {
    ...emp,
    skills: empSkills.map(s => ({
      ...s,
      skillMetrics: skillMetricsMap.get(s.id) ?? [],
    })),
    metrics: empMetrics.map((m) => ({
      ...m,
      customMetrics: m.customMetrics
        ? (JSON.parse(m.customMetrics) as Record<string, unknown>)
        : null,
    })),
    versionLogs: empVersionLogs.map((v) => ({
      ...v,
      capabilities: v.capabilities
        ? (JSON.parse(v.capabilities) as Record<string, unknown>)
        : null,
    })),
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <EmployeeDetail employee={employee} />
    </main>
  );
}
