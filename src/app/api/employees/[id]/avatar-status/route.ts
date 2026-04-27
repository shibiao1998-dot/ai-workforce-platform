import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requirePermission } from "@/lib/authz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, err] = await requirePermission("employees", "read", _req);
  if (err) return err;
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
