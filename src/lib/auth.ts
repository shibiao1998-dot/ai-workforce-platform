import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import CryptoJS from "crypto-js";

const SESSION_COOKIE_NAME = "ai-workforce-session";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production-32ch";

export interface SessionUser {
  userId: string;
  nickname: string;
  avatar: string;
  expiresAt: number; // unix timestamp ms
}

/**
 * Sign data with HMAC-SHA256
 */
function sign(data: string): string {
  return CryptoJS.HmacSHA256(data, SESSION_SECRET).toString(CryptoJS.enc.Base64);
}

/**
 * Create a signed session token from user data
 */
function encodeSession(user: SessionUser): string {
  const payload = JSON.stringify(user);
  const b64 = Buffer.from(payload, "utf-8").toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

/**
 * Decode and verify a signed session token
 * Returns null if invalid or expired
 */
function decodeSession(token: string): SessionUser | null {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const b64 = token.substring(0, dotIndex);
  const sig = token.substring(dotIndex + 1);

  // verify signature
  if (sign(b64) !== sig) return null;

  try {
    const payload = Buffer.from(b64, "base64url").toString("utf-8");
    const user = JSON.parse(payload) as SessionUser;

    // check expiration
    if (user.expiresAt < Date.now()) return null;

    return user;
  } catch {
    return null;
  }
}

/**
 * Set session cookie after successful login
 * Call from API route handler
 */
export async function createSession(user: Omit<SessionUser, "expiresAt">, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const session: SessionUser = {
    ...user,
    expiresAt: Date.now() + expiresInMs,
  };
  const token = encodeSession(session);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(expiresInMs / 1000),
  });
  return session;
}

/**
 * Get current user from session cookie (for Server Components / API Routes)
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (process.env.AUTH_DISABLED === "true") {
    return {
      userId: "dev-user",
      nickname: "开发者",
      avatar: "",
      expiresAt: Date.now() + 86400000,
    };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

/**
 * Verify session from a NextRequest (for Middleware - reads cookie directly)
 * Returns null if not authenticated
 */
export function verifySessionFromRequest(request: NextRequest): SessionUser | null {
  if (process.env.AUTH_DISABLED === "true") {
    return {
      userId: "dev-user",
      nickname: "开发者",
      avatar: "",
      expiresAt: Date.now() + 86400000,
    };
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return decodeSession(token);
}

/**
 * Destroy session cookie
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
