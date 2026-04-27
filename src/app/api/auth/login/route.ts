import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

/**
 * POST /api/auth/login
 * 接收客户端提交的 UC 用户信息，创建 session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, nickname, avatar, expiresIn } = body;

    if (!userId || !nickname) {
      return NextResponse.json(
        { error: "缺少必要的用户信息" },
        { status: 400 }
      );
    }

    // expiresIn 是秒数，默认 7 天
    const expiresInMs = (expiresIn || 7 * 24 * 3600) * 1000;

    const session = await createSession(
      { userId: String(userId), nickname, avatar: avatar || "" },
      expiresInMs
    );

    return NextResponse.json({
      success: true,
      user: {
        userId: session.userId,
        nickname: session.nickname,
        avatar: session.avatar,
      },
    });
  } catch (err) {
    console.error("登录 API 错误:", err);
    return NextResponse.json(
      { error: "登录处理失败" },
      { status: 500 }
    );
  }
}
