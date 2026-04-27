import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface UpdateBody {
  roleId: string;
}

function isSuperAdminWhitelisted(ucUserId: string): boolean {
  const ids = (process.env.SUPER_ADMIN_UC_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.includes(ucUserId);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [operator, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const { id } = await params;
  const rows = await db.select().from(userRoles).where(eq(userRoles.id, id));
  if (rows.length === 0) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const body = (await request.json()) as UpdateBody;
  if (!body.roleId) return NextResponse.json({ error: "roleId 必填" }, { status: 400 });

  const newRole = await db.select().from(roles).where(eq(roles.id, body.roleId));
  if (newRole.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 400 });

  if (isSuperAdminWhitelisted(rows[0].ucUserId) && newRole[0].name !== "super-admin") {
    return NextResponse.json(
      { error: "该用户在 SUPER_ADMIN_UC_IDS 白名单中,不能通过 UI 降级" },
      { status: 403 }
    );
  }

  const oldRole = await db.select().from(roles).where(eq(roles.id, rows[0].roleId));

  await db.update(userRoles).set({ roleId: body.roleId, updatedAt: new Date() }).where(eq(userRoles.id, id));

  await logAudit(request, operator, {
    action: "user.change_role",
    target: { type: "user", id: rows[0].ucUserId },
    details: {
      nickname: rows[0].nickname,
      from: oldRole[0]?.name ?? null,
      to: newRole[0].name,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [operator, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const { id } = await params;
  const rows = await db.select().from(userRoles).where(eq(userRoles.id, id));
  if (rows.length === 0) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  if (isSuperAdminWhitelisted(rows[0].ucUserId)) {
    return NextResponse.json({ error: "白名单用户不能通过 UI 解除角色" }, { status: 403 });
  }

  const defaultRole = await db.select().from(roles).where(eq(roles.name, "default"));
  if (defaultRole.length === 0) return NextResponse.json({ error: "默认角色缺失" }, { status: 500 });

  const oldRole = await db.select().from(roles).where(eq(roles.id, rows[0].roleId));

  await db
    .update(userRoles)
    .set({ roleId: defaultRole[0].id, updatedAt: new Date() })
    .where(eq(userRoles.id, id));

  await logAudit(request, operator, {
    action: "user.unassign",
    target: { type: "user", id: rows[0].ucUserId },
    details: {
      nickname: rows[0].nickname,
      from: oldRole[0]?.name ?? null,
      to: "default",
    },
  });

  return NextResponse.json({ ok: true });
}
