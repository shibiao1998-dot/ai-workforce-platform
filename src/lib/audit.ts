import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

export const AUDIT_ACTIONS = [
  "role.create",
  "role.update",
  "role.delete",
  "user.add",
  "user.assign_role",
  "user.change_role",
  "user.unassign",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditTarget {
  type: "role" | "user";
  id: string;
}

export interface AuditEntry {
  action: AuditAction;
  target?: AuditTarget;
  details?: Record<string, unknown>;
}

function extractIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  return real ?? null;
}

/**
 * 写入权限变更审计日志。不抛错 — 审计失败不阻塞业务主流程。
 */
export async function logAudit(
  request: Request,
  operator: SessionUser,
  entry: AuditEntry
): Promise<void> {
  const ip = extractIp(request);
  const userAgent = request.headers.get("user-agent");
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      operatorUcId: operator.userId,
      operatorNickname: operator.nickname,
      action: entry.action,
      targetType: entry.target?.type ?? null,
      targetId: entry.target?.id ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ip,
      userAgent,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[audit] failed to log", err);
  }
}
