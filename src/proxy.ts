import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";

/**
 * 公开路径白名单(不需要认证)
 */
const PUBLIC_PATHS = [
  "/login",
  "/login/callback",
  "/403",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
];

type Module = "employees" | "production" | "org" | "dashboard" | "help" | "settings";

/**
 * 页面路径到模块的正则映射。
 * 新增页面时必须在此登记,否则无法做页面级授权。
 */
const PATH_TO_MODULE: Array<[RegExp, Module]> = [
  [/^\/roster(\/|$)/, "employees"],
  [/^\/production(\/|$)/, "production"],
  [/^\/org(\/|$)/, "org"],
  [/^\/dashboard(\/|$)/, "dashboard"],
  [/^\/settings(\/|$)/, "settings"],
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

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

function matchModule(pathname: string): Module | null {
  for (const [regex, mod] of PATH_TO_MODULE) {
    if (regex.test(pathname)) return mod;
  }
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticPath(pathname)) return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const user = verifySessionFromRequest(request);
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // API 路由的授权交给 route handler 的 requirePermission(),proxy 不做 API 授权
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // 页面级 read 权限检查
  const mod = matchModule(pathname);
  if (!mod) return NextResponse.next(); // 未注册的页面(如 /)放行

  // Next.js Proxy 运行于 edge runtime,无法直接用 better-sqlite3。
  // 通过 fetch /api/auth/me 读取权限(官方 "optimistic check" 模式)。
  // Server Component 中 requirePageReadAccess() 是第二道防线,真正的授权判断在那里做,
  // Proxy 只是提前重定向,避免无权页面被渲染。
  //
  // 用 loopback + 当前请求端口自引用,避免走外部域名的 HTTPS 反代链(容器内无法 SSL 握手)。
  const internalBase = `http://127.0.0.1:${request.nextUrl.port || process.env.PORT || "3000"}`;
  const meResp = await fetch(`${internalBase}/api/auth/me`, {
    headers: { cookie: request.headers.get("cookie") || "" },
    cache: "no-store",
  });

  if (!meResp.ok) {
    return meResp.status === 401
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.redirect(new URL("/403", request.url));
  }

  const me = (await meResp.json()) as { permissions: Record<Module, string[]> };
  if (!me.permissions[mod]?.includes("read")) {
    return NextResponse.redirect(new URL("/403", request.url));
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
