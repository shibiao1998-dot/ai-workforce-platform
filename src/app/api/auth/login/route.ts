import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { verifyUcLoginBody } from "@/lib/uc-server";

/**
 * POST /api/auth/login
 * 接收客户端提交的 UC 用户信息，upsert user_roles，创建 session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const verifiedLogin = await verifyUcLoginBody(body, new URL(request.url).origin).catch((err) => {
      console.warn("[auth] UC login verification failed", err);
      return null;
    });

    if (!verifiedLogin) {
      return NextResponse.json({ error: "登录凭据校验失败" }, { status: 401 });
    }

    // --- upsert user_roles ---
    const { userId: ucUserId, nickname, avatar, expiresIn } = verifiedLogin;
    const superAdminIds = (process.env.SUPER_ADMIN_UC_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const existing = await db.select().from(userRoles).where(eq(userRoles.ucUserId, ucUserId));
    const now = new Date();

    if (existing.length === 0) {
      const targetRoleName = superAdminIds.includes(ucUserId) ? "super-admin" : "default";
      const roleRows = await db.select().from(roles).where(eq(roles.name, targetRoleName));
      if (roleRows.length === 0) {
        return NextResponse.json(
          { error: `系统未初始化内置角色 ${targetRoleName},请先运行 npm run db:seed:permissions` },
          { status: 500 }
        );
      }
      await db.insert(userRoles).values({
        id: randomUUID(),
        ucUserId,
        nickname,
        avatar: avatar || "",
        roleId: roleRows[0].id,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // 白名单用户即使 role 不是 super-admin，也强制回写为 super-admin（env 是唯一真相源）
      const updates: Record<string, unknown> = {
        nickname,
        avatar: avatar || "",
        lastLoginAt: now,
        updatedAt: now,
      };

      if (superAdminIds.includes(ucUserId)) {
        const adminRole = await db.select().from(roles).where(eq(roles.name, "super-admin"));
        if (adminRole.length > 0 && existing[0].roleId !== adminRole[0].id) {
          updates.roleId = adminRole[0].id;
        }
      }

      await db.update(userRoles).set(updates).where(eq(userRoles.ucUserId, ucUserId));
    }

    // --- 原有 session cookie ---
    // expiresIn 是秒数，默认 7 天
    const expiresInMs = (expiresIn || 7 * 24 * 3600) * 1000;

    const session = await createSession(
      { userId: ucUserId, nickname, avatar: avatar || "" },
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
