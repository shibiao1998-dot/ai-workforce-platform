import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/**
 * POST /api/auth/logout
 * 清除 session cookie
 */
export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}
