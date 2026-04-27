import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";

/**
 * GET /api/permissions/uc-user-lookup?userId=xxx
 * 只做格式校验(数字)。真实的 nickname/avatar 获取由前端通过 UC SDK 完成后提交。
 */
export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId || !/^\d+$/.test(userId)) {
    return NextResponse.json({ error: "userId 必须为数字" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId });
}
