import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const employee = await db.query.employees.findFirst({
    where: (e, { eq }) => eq(e.id, id),
  });

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (employee.avatar) {
    return NextResponse.json({ status: "completed", avatar: employee.avatar });
  }

  return NextResponse.json({ status: "generating" });
}
