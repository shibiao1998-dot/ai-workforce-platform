import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { metricConfigs, employees } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const taskType = searchParams.get("taskType");
  const employeeId = searchParams.get("employeeId");

  if (!taskType || !employeeId) {
    return NextResponse.json(
      { error: "taskType and employeeId are required" },
      { status: 400 }
    );
  }

  // 1. Look up employee's team
  const employee = await db
    .select({ team: employees.team })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .get();

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // 2. Employee-level override
  const employeeConfig = await db
    .select()
    .from(metricConfigs)
    .where(
      and(
        eq(metricConfigs.employeeId, employeeId),
        eq(metricConfigs.taskType, taskType)
      )
    )
    .get();

  if (employeeConfig) {
    return NextResponse.json({ ...employeeConfig, resolvedFrom: "employee" });
  }

  // 3. Team-level override
  const teamConfig = await db
    .select()
    .from(metricConfigs)
    .where(
      and(
        eq(metricConfigs.team, employee.team),
        eq(metricConfigs.taskType, taskType),
        isNull(metricConfigs.employeeId)
      )
    )
    .get();

  if (teamConfig) {
    return NextResponse.json({ ...teamConfig, resolvedFrom: "team" });
  }

  // 4. Global baseline
  const globalConfig = await db
    .select()
    .from(metricConfigs)
    .where(
      and(
        isNull(metricConfigs.employeeId),
        isNull(metricConfigs.team),
        eq(metricConfigs.taskType, taskType)
      )
    )
    .get();

  if (globalConfig) {
    return NextResponse.json({ ...globalConfig, resolvedFrom: "global" });
  }

  return NextResponse.json({ error: "No config found" }, { status: 404 });
}
