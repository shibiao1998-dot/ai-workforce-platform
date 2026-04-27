import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/auth/me
 * 返回当前登录用户信息
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "未认证" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    userId: user.userId,
    nickname: user.nickname,
    avatar: user.avatar,
  });
}
