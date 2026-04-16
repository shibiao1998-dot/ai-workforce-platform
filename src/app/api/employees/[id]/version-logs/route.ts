import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { versionLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const newLog = {
    id: randomUUID(),
    employeeId: id,
    version: body.version as string,
    date: body.date as string,
    changelog: body.changelog as string,
    capabilities: null,
  };

  await db.insert(versionLogs).values(newLog);

  const created = await db.query.versionLogs.findFirst({
    where: (v, { eq: eqFn }) => eqFn(v.id, newLog.id),
  });

  if (!created) {
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json(created, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logs = await db
    .select()
    .from(versionLogs)
    .where(eq(versionLogs.employeeId, id));
  return NextResponse.json(logs);
}
