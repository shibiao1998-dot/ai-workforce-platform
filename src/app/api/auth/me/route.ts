import { NextResponse } from "next/server";
import { getCurrentUserWithPermissions } from "@/lib/authz-server";

/**
 * GET /api/auth/me
 * 返回当前登录用户、角色和权限
 */
export async function GET() {
  const me = await getCurrentUserWithPermissions();

  if (!me) {
    return NextResponse.json({ error: "未认证" }, { status: 401 });
  }

  return NextResponse.json({
    userId: me.userId,
    nickname: me.nickname,
    avatar: me.avatar,
    role: me.role,
    permissions: me.permissions,
  });
}
