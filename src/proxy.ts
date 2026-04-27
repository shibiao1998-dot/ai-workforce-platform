import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";

/**
 * 公开路径白名单（不需要认证）
 */
const PUBLIC_PATHS = [
  "/login",
  "/login/callback",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * 静态资源路径（跳过 proxy）
 */
function isStaticPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/avatars/") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过静态资源
  if (isStaticPath(pathname)) {
    return NextResponse.next();
  }

  // 公开路径放行
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 验证 session
  const user = verifySessionFromRequest(request);
  if (!user) {
    // 未认证 → 重定向到 /login
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
