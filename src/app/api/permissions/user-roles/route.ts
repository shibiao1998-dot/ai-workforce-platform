import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface AddUserBody {
  ucUserId: string;
  nickname: string;
  avatar?: string;
  roleId?: string;
}

export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const rows = await db
    .select({
      id: userRoles.id,
      ucUserId: userRoles.ucUserId,
      nickname: userRoles.nickname,
      avatar: userRoles.avatar,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      lastLoginAt: userRoles.lastLoginAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .orderBy(userRoles.createdAt);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const [user, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const body = (await request.json()) as AddUserBody;
  if (!body.ucUserId || !/^\d+$/.test(body.ucUserId) || !body.nickname) {
    return NextResponse.json({ error: "ucUserId(数字) 和 nickname 必填" }, { status: 400 });
  }

  const existing = await db.select().from(userRoles).where(eq(userRoles.ucUserId, body.ucUserId));
  if (existing.length > 0) {
    return NextResponse.json({ error: "该用户已存在" }, { status: 409 });
  }

  let roleId = body.roleId;
  if (!roleId) {
    const defaultRole = await db.select().from(roles).where(eq(roles.name, "default"));
    roleId = defaultRole[0]?.id;
    if (!roleId) return NextResponse.json({ error: "默认角色不存在" }, { status: 500 });
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(userRoles).values({
    id,
    ucUserId: body.ucUserId,
    nickname: body.nickname,
    avatar: body.avatar ?? null,
    roleId,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit(request, user, {
    action: "user.add",
    target: { type: "user", id: body.ucUserId },
    details: { nickname: body.nickname, roleId },
  });

  return NextResponse.json({ id });
}
