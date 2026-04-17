import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  generateAvatarDescription,
  generateSingleAvatar,
} from "@/lib/avatar-generator";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const employee = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const description =
    employee.avatarDescription ??
    generateAvatarDescription(employee.title, employee.team);

  // Fire-and-forget
  generateSingleAvatar(id, employee.name, description).catch((err) =>
    console.error(`[avatar] generation failed for ${employee.name}:`, err)
  );

  return NextResponse.json({ status: "generating" });
}
