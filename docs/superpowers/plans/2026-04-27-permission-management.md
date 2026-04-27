# 权限管控系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于已接入的 UC SSO,为平台的 CRUD 操作建立 RBAC 权限管控(6 模块 × 3 动作),支持自定义角色、用户授权、操作审计,并在 Proxy、API、UI 三层协同生效。

**Architecture:** 四张新表(roles / role_permissions / user_roles / audit_logs)承载 RBAC 模型;核心库 `src/lib/authz.ts` 暴露类型安全的权限常量与查询函数,用 React.cache 做请求级缓存;`src/proxy.ts` 做页面级粗粒度授权(PATH_TO_MODULE 映射),API route handler 里用 `requirePermission()` 显式做细粒度授权;前端通过 Server Component 一次性加载权限并作为 prop 下发给 Client Component,无权按钮 hidden。

**Tech Stack:** Next.js 16(App Router,`src/proxy.ts` 即 middleware)、React 19、TypeScript、Drizzle ORM、better-sqlite3、shadcn/ui(基于 @base-ui/react)、crypto-js(已有 HMAC session)、UC SDK(已接入)。

> **Next.js 16 约定提醒**:本项目使用 `src/proxy.ts`(非 `middleware.ts`),这是 Next 16 的新命名,功能等同于旧版 middleware。不要改文件名。

---

## 文件结构

### 新建

| 路径 | 职责 |
|---|---|
| `src/lib/authz.ts` | 权限常量(MODULES/ACTIONS)、类型、`getPermissions`、`can`、`requirePermission`(API 用)|
| `src/lib/authz-server.ts` | Server Component 辅助:`getCurrentUserWithPermissions`、`requirePageReadAccess` |
| `src/lib/audit.ts` | 审计日志工具 `logAudit(request, operator, action, target, details)` |
| `scripts/seed-permissions.ts` | 种入 3 个内置角色 + 其权限 |
| `src/app/403/page.tsx` | "无权访问"页面 |
| `src/app/api/permissions/roles/route.ts` | 角色 CRUD: GET(list) / POST(create) |
| `src/app/api/permissions/roles/[id]/route.ts` | 单角色: GET / PUT / DELETE |
| `src/app/api/permissions/user-roles/route.ts` | 用户-角色列表 GET、添加 POST |
| `src/app/api/permissions/user-roles/[id]/route.ts` | 单用户授权: PUT(改角色)/ DELETE(解除=回默认)|
| `src/app/api/permissions/audit-logs/route.ts` | 审计日志 GET(分页、筛选、CSV 导出)|
| `src/app/api/permissions/uc-user-lookup/route.ts` | 后端代调 UC SDK 验证 userId 存在 |
| `src/components/settings/permissions/permission-manager.tsx` | 权限管理页面外壳(3 tab)|
| `src/components/settings/permissions/role-manager.tsx` | Tab 1 角色管理 |
| `src/components/settings/permissions/role-permission-matrix.tsx` | 6×3 权限矩阵表单 |
| `src/components/settings/permissions/user-role-manager.tsx` | Tab 2 用户授权 |
| `src/components/settings/permissions/audit-log-viewer.tsx` | Tab 3 操作日志 |

### 修改

| 路径 | 改动 |
|---|---|
| `src/db/schema.ts` | 追加 4 张新表 + uniqueIndex |
| `src/app/api/auth/login/route.ts` | 登录成功后 upsert `user_roles` |
| `src/app/api/auth/me/route.ts` | 返回 `role` 和 `permissions` |
| `src/proxy.ts` | 加入 `PATH_TO_MODULE` 页面级授权 |
| `src/components/nav/sidebar.tsx` | `NAV_ITEMS` 标注 `module`,按权限过滤 |
| `src/components/nav/app-shell.tsx` | 接收 `permissions` prop 传给 sidebar |
| `src/app/layout.tsx` | 调用 `getCurrentUserWithPermissions` |
| `src/app/settings/page.tsx` | 新增"权限管理" tab,按 `settings.write` 条件显示 |
| `package.json` | 加 `db:seed:permissions` 脚本 |
| `.env.local` / `.env.example` | 加 `SUPER_ADMIN_UC_IDS` |

---

## 阶段概览

1. **阶段 1**:数据层(schema + migration + seed)
2. **阶段 2**:核心授权库(authz.ts / authz-server.ts / audit.ts)
3. **阶段 3**:登录流程改造 + `/api/auth/me` 扩展
4. **阶段 4**:Proxy 页面级授权 + `/403` 页面
5. **阶段 5**:API 路由加权限校验(26 路由 + 新 permissions API)
6. **阶段 6**:前端 UI 过滤(Sidebar / 按钮 hidden)
7. **阶段 7**:权限管理页面(3 tab)
8. **阶段 8**:审计日志埋点落地
9. **阶段 9**:端到端手工验收(12 项清单)

每个任务完成都要 commit 一次。项目没有测试框架,以**显式的验证步骤**(访问某页面、看某响应、查某 SQL)替代单元测试。

---

# 阶段 1:数据层

## Task 1:扩展 schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1:在 schema.ts 顶部 import 部分追加 `uniqueIndex`**

现有首行:
```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
```

改为:
```typescript
import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
```

- [ ] **Step 2:在文件末尾追加 4 张新表**

```typescript
export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    module: text("module", {
      enum: ["employees", "production", "org", "dashboard", "help", "settings"],
    }).notNull(),
    action: text("action", { enum: ["read", "write", "delete"] }).notNull(),
  },
  (t) => ({
    unq: uniqueIndex("role_perm_unq").on(t.roleId, t.module, t.action),
  })
);

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  ucUserId: text("uc_user_id").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar"),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "restrict" }),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  operatorUcId: text("operator_uc_id").notNull(),
  operatorNickname: text("operator_nickname").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: text("details"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 3:生成迁移文件**

Run: `npm run db:generate`
Expected: `drizzle/0001_<name>.sql` 被创建,包含 4 张新表的 CREATE TABLE 和一个 CREATE UNIQUE INDEX

- [ ] **Step 4:应用迁移到本地 sqlite**

Run: `npm run db:push`
Expected: 输出 "Changes applied"

- [ ] **Step 5:验证表已建**

Run: `sqlite3 local.db ".tables"`
Expected: 输出中包含 `roles`, `role_permissions`, `user_roles`, `audit_logs`

- [ ] **Step 6:Commit**

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(db): add RBAC tables (roles, role_permissions, user_roles, audit_logs)"
```

---

## Task 2:种子脚本 seed-permissions

**Files:**
- Create: `scripts/seed-permissions.ts`
- Modify: `package.json`

- [ ] **Step 1:创建 seed-permissions.ts**

```typescript
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { db } from "../src/db";
import { roles, rolePermissions } from "../src/db/schema";
import { eq } from "drizzle-orm";

type Module = "employees" | "production" | "org" | "dashboard" | "help" | "settings";
type Action = "read" | "write" | "delete";

const ALL_MODULES: Module[] = ["employees", "production", "org", "dashboard", "help", "settings"];
const ALL_ACTIONS: Action[] = ["read", "write", "delete"];
const BUSINESS_MODULES: Module[] = ["employees", "production", "org", "dashboard", "help"];

interface BuiltinRole {
  name: string;
  displayName: string;
  description: string;
  permissions: Array<{ module: Module; action: Action }>;
}

function buildBuiltins(): BuiltinRole[] {
  const allPerms = ALL_MODULES.flatMap((m) => ALL_ACTIONS.map((a) => ({ module: m, action: a })));
  const readAll = ALL_MODULES.map((m) => ({ module: m, action: "read" as Action }));
  const defaultPerms = BUSINESS_MODULES.map((m) => ({ module: m, action: "read" as Action }));

  return [
    {
      name: "super-admin",
      displayName: "超级管理员",
      description: "拥有全部 18 项原子权限,内置不可删",
      permissions: allPerms,
    },
    {
      name: "viewer",
      displayName: "查看者",
      description: "只读访问全部 6 个模块",
      permissions: readAll,
    },
    {
      name: "default",
      displayName: "默认用户",
      description: "新用户默认角色,只读访问 5 个业务模块",
      permissions: defaultPerms,
    },
  ];
}

async function main() {
  const builtins = buildBuiltins();
  const now = new Date();

  for (const b of builtins) {
    const existing = await db.select().from(roles).where(eq(roles.name, b.name));

    let roleId: string;
    if (existing.length === 0) {
      roleId = randomUUID();
      await db.insert(roles).values({
        id: roleId,
        name: b.name,
        displayName: b.displayName,
        description: b.description,
        isSystem: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`[seed] created role: ${b.name}`);
    } else {
      roleId = existing[0].id;
      await db
        .update(roles)
        .set({ displayName: b.displayName, description: b.description, isSystem: true, updatedAt: now })
        .where(eq(roles.id, roleId));
      // 清空旧权限,重写
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      console.log(`[seed] reset role: ${b.name}`);
    }

    for (const p of b.permissions) {
      await db.insert(rolePermissions).values({
        id: randomUUID(),
        roleId,
        module: p.module,
        action: p.action,
      });
    }
  }

  console.log("[seed] done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2:在 package.json 的 scripts 中加入**

找到 `"db:seed": "tsx src/db/seed.ts",`,在其后新增一行:

```json
    "db:seed:permissions": "tsx scripts/seed-permissions.ts",
```

- [ ] **Step 3:运行种子脚本**

Run: `npm run db:seed:permissions`
Expected: 输出 3 行 `[seed] created role: ...` 和 `[seed] done`

- [ ] **Step 4:验证数据**

Run: `sqlite3 local.db "SELECT name, is_system FROM roles;"`
Expected: 输出三行 `super-admin|1`, `viewer|1`, `default|1`

Run: `sqlite3 local.db "SELECT r.name, COUNT(*) FROM roles r JOIN role_permissions p ON p.role_id=r.id GROUP BY r.name;"`
Expected: `super-admin|18`, `viewer|6`, `default|5`

- [ ] **Step 5:Commit**

```bash
git add scripts/seed-permissions.ts package.json
git commit -m "feat(db): add seed-permissions script for 3 built-in roles"
```

---

# 阶段 2:核心授权库

## Task 3:authz.ts 核心库

**Files:**
- Create: `src/lib/authz.ts`

- [ ] **Step 1:创建 authz.ts**

```typescript
import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, rolePermissions, roles } from "@/db/schema";
import { getCurrentUser, verifySessionFromRequest, type SessionUser } from "@/lib/auth";

export const MODULES = ["employees", "production", "org", "dashboard", "help", "settings"] as const;
export const ACTIONS = ["read", "write", "delete"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Module}.${Action}`;
export type UserPermissions = Record<Module, Action[]>;

export interface UserRoleInfo {
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  isSystem: boolean;
  permissions: UserPermissions;
}

function emptyPermissions(): UserPermissions {
  return {
    employees: [],
    production: [],
    org: [],
    dashboard: [],
    help: [],
    settings: [],
  };
}

/**
 * 加载某 UC 用户的角色和权限。
 * 用 React.cache 包装,单次请求内多次调用只查一次库。
 * 如果用户在 user_roles 中无记录(未登录过),返回 null。
 * AUTH_DISABLED=true 时返回 super-admin 等价的全权限。
 */
export const getUserRoleInfo = cache(async (ucUserId: string): Promise<UserRoleInfo | null> => {
  if (process.env.AUTH_DISABLED === "true") {
    const allPerms = emptyPermissions();
    for (const m of MODULES) allPerms[m] = [...ACTIONS];
    return {
      roleId: "dev-bypass",
      roleName: "super-admin",
      roleDisplayName: "超级管理员(开发模式)",
      isSystem: true,
      permissions: allPerms,
    };
  }

  const rows = await db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      isSystem: roles.isSystem,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.ucUserId, ucUserId));

  if (rows.length === 0) return null;
  const r = rows[0];

  const permRows = await db
    .select({ module: rolePermissions.module, action: rolePermissions.action })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, r.roleId));

  const permissions = emptyPermissions();
  for (const p of permRows) {
    permissions[p.module as Module].push(p.action as Action);
  }

  return {
    roleId: r.roleId,
    roleName: r.roleName,
    roleDisplayName: r.roleDisplayName,
    isSystem: r.isSystem,
    permissions,
  };
});

export function can(perms: UserPermissions, module: Module, action: Action): boolean {
  return perms[module]?.includes(action) ?? false;
}

/**
 * API route handler 中使用。
 * 未登录 → 抛 401;登录但无权限 → 抛 403。
 * 返回当前 SessionUser 便于后续埋点使用。
 * 因为 Next.js route handler 不能 throw Response,此函数返回元组 [user, errResponse]:
 *   const [user, err] = await requirePermission(request, "employees", "delete");
 *   if (err) return err;
 */
export async function requirePermission(
  module: Module,
  action: Action,
  request?: Request
): Promise<[SessionUser, null] | [null, NextResponse]> {
  let user: SessionUser | null;
  if (request && "cookies" in request && typeof (request as { cookies?: unknown }).cookies === "object") {
    // NextRequest 有 cookies 方法
    user = verifySessionFromRequest(request as unknown as import("next/server").NextRequest);
  } else {
    user = await getCurrentUser();
  }

  if (!user) {
    return [null, NextResponse.json({ error: "未认证" }, { status: 401 })];
  }

  const info = await getUserRoleInfo(user.userId);
  if (!info) {
    return [null, NextResponse.json({ error: "用户无角色,请联系管理员" }, { status: 403 })];
  }

  if (!can(info.permissions, module, action)) {
    return [
      null,
      NextResponse.json(
        { error: `无权限: ${module}.${action}`, required: `${module}.${action}` },
        { status: 403 }
      ),
    ];
  }

  return [user, null];
}
```

- [ ] **Step 2:类型检查通过**

Run: `npx tsc --noEmit`
Expected: 无 error(若有报错,先修复后再继续)

- [ ] **Step 3:Commit**

```bash
git add src/lib/authz.ts
git commit -m "feat(authz): add core authz library with permission types and requirePermission"
```

---

## Task 4:authz-server.ts(Server Component 辅助)

**Files:**
- Create: `src/lib/authz-server.ts`

- [ ] **Step 1:创建 authz-server.ts**

```typescript
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { getUserRoleInfo, type UserPermissions, type Module, type UserRoleInfo } from "@/lib/authz";

export interface CurrentUserWithPermissions extends SessionUser {
  role: { name: string; displayName: string; isSystem: boolean };
  permissions: UserPermissions;
}

/**
 * Server Component 用:读取当前用户 + 权限。
 * 单次请求内被多次调用只会真查一次库(React.cache)。
 * 未登录返回 null;登录但无角色(异常状态)也返回 null。
 */
export const getCurrentUserWithPermissions = cache(async (): Promise<CurrentUserWithPermissions | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const info: UserRoleInfo | null = await getUserRoleInfo(user.userId);
  if (!info) return null;

  return {
    ...user,
    role: {
      name: info.roleName,
      displayName: info.roleDisplayName,
      isSystem: info.isSystem,
    },
    permissions: info.permissions,
  };
});

/**
 * Server Component / Page 用:无 read 权限直接 redirect。
 * 使用场景:页面顶部 `await requirePageReadAccess("production")`。
 */
export async function requirePageReadAccess(module: Module): Promise<CurrentUserWithPermissions> {
  const me = await getCurrentUserWithPermissions();
  if (!me) redirect("/login");
  if (!me.permissions[module].includes("read")) redirect("/403");
  return me;
}

/**
 * Server Component 用:无 write 权限则 redirect /403。
 */
export async function requirePageWriteAccess(module: Module): Promise<CurrentUserWithPermissions> {
  const me = await getCurrentUserWithPermissions();
  if (!me) redirect("/login");
  if (!me.permissions[module].includes("write")) redirect("/403");
  return me;
}
```

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`
Expected: 无 error

- [ ] **Step 3:Commit**

```bash
git add src/lib/authz-server.ts
git commit -m "feat(authz): add server-side helpers (getCurrentUserWithPermissions, requirePageReadAccess)"
```

---

## Task 5:audit.ts 审计日志工具

**Files:**
- Create: `src/lib/audit.ts`

- [ ] **Step 1:创建 audit.ts**

```typescript
import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";

export interface AuditTarget {
  type: "role" | "user";
  id: string;
}

export interface AuditEntry {
  action: string;
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
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      operatorUcId: operator.userId,
      operatorNickname: operator.nickname,
      action: entry.action,
      targetType: entry.target?.type ?? null,
      targetId: entry.target?.id ?? null,
      details: entry.details ? JSON.stringify(entry.details) : null,
      ip: extractIp(request),
      userAgent: request.headers.get("user-agent"),
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[audit] failed to log", err);
  }
}
```

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`
Expected: 无 error

- [ ] **Step 3:Commit**

```bash
git add src/lib/audit.ts
git commit -m "feat(authz): add audit log helper"
```

---

# 阶段 3:登录流程改造

## Task 6:登录接口 upsert user_roles

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `.env.local`(本地开发环境)

**先读现有登录接口**:

- [ ] **Step 1:阅读现有 `src/app/api/auth/login/route.ts`,了解其入参和创建 session 的位置**

Run: `cat src/app/api/auth/login/route.ts`
期望看到 `createSession({ userId, nickname, avatar })` 调用。

- [ ] **Step 2:改写 login/route.ts,在 createSession 前 upsert user_roles**

将原文件整体替换为(保留现有接口语义,只增加 user_roles 逻辑):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { createSession } from "@/lib/auth";

interface LoginBody {
  userId: string;
  nickname: string;
  avatar: string;
  expiresIn?: number;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginBody;
  const { userId, nickname, avatar, expiresIn } = body;

  if (!userId || !nickname) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // --- upsert user_roles ---
  const superAdminIds = (process.env.SUPER_ADMIN_UC_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const existing = await db.select().from(userRoles).where(eq(userRoles.ucUserId, userId));
  const now = new Date();

  if (existing.length === 0) {
    const targetRoleName = superAdminIds.includes(userId) ? "super-admin" : "default";
    const roleRows = await db.select().from(roles).where(eq(roles.name, targetRoleName));
    if (roleRows.length === 0) {
      return NextResponse.json(
        { error: `系统未初始化内置角色 ${targetRoleName},请先运行 npm run db:seed:permissions` },
        { status: 500 }
      );
    }
    await db.insert(userRoles).values({
      id: randomUUID(),
      ucUserId: userId,
      nickname,
      avatar,
      roleId: roleRows[0].id,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // 白名单用户即使 role 不是 super-admin,也强制回写为 super-admin(env 是唯一真相源)
    const updates: Record<string, unknown> = {
      nickname,
      avatar,
      lastLoginAt: now,
      updatedAt: now,
    };

    if (superAdminIds.includes(userId)) {
      const adminRole = await db.select().from(roles).where(eq(roles.name, "super-admin"));
      if (adminRole.length > 0 && existing[0].roleId !== adminRole[0].id) {
        updates.roleId = adminRole[0].id;
      }
    }

    await db.update(userRoles).set(updates).where(eq(userRoles.ucUserId, userId));
  }

  // --- 原有 session cookie ---
  const expiresInMs = expiresIn ? expiresIn * 1000 : undefined;
  const session = await createSession({ userId, nickname, avatar }, expiresInMs);

  return NextResponse.json({ ok: true, user: { userId: session.userId, nickname: session.nickname, avatar: session.avatar } });
}
```

- [ ] **Step 3:在 `.env.local` 末尾加入 SUPER_ADMIN_UC_IDS**

用你自己的 UC userId(数字)替换下面示例。如果不确定 userId,登录一次看 `user_roles` 表就知道了。

编辑 `.env.local`,追加一行(示例用占位符,**实际运行要替换为真实 ID**):

```
# 首任超级管理员的 UC userId 白名单(逗号分隔)
SUPER_ADMIN_UC_IDS=
```

稍后在 Task 29(验收)之前,让用户填入真实 UC userId。

- [ ] **Step 4:类型检查**

Run: `npx tsc --noEmit`
Expected: 无 error

- [ ] **Step 5:本地验证**

先清空现有 user_roles(本地数据库):

Run: `sqlite3 local.db "DELETE FROM user_roles;"`

启动:`npm run dev`

登录一次(UC 回调走完),然后查:

Run: `sqlite3 local.db "SELECT uc_user_id, nickname, role_id FROM user_roles;"`
Expected: 有一行,role_id 对应 `default`(除非 SUPER_ADMIN_UC_IDS 里有该用户,则为 `super-admin`)

Run: `sqlite3 local.db "SELECT r.name FROM user_roles u JOIN roles r ON r.id=u.role_id;"`
Expected: 输出 `default` 或 `super-admin`

- [ ] **Step 6:Commit**

```bash
git add src/app/api/auth/login/route.ts .env.local
git commit -m "feat(auth): upsert user_roles on login, assign super-admin from env whitelist"
```

> 注意:`.env.local` 在 `.gitignore` 中的话,commit 不会带上它。如果被忽略,单独 commit 其他两个文件即可。

---

## Task 7:扩展 /api/auth/me 返回权限

**Files:**
- Modify: `src/app/api/auth/me/route.ts`

- [ ] **Step 1:整体替换 me/route.ts**

```typescript
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
```

- [ ] **Step 2:本地验证**

启动 `npm run dev`,登录,然后:

Run: `curl -s http://localhost:3000/api/auth/me -b "ai-workforce-session=$(sqlite3 /dev/null 2>/dev/null; echo 'paste-cookie-from-devtools')" | jq .`

(实际操作:打开 devtools → application → cookies,复制 ai-workforce-session 的值,或直接用浏览器访问 `/api/auth/me` 查看响应)

Expected 响应格式:
```json
{
  "userId": "...",
  "nickname": "...",
  "avatar": "...",
  "role": { "name": "default", "displayName": "默认用户", "isSystem": true },
  "permissions": {
    "employees": ["read"],
    "production": ["read"],
    "org": ["read"],
    "dashboard": ["read"],
    "help": ["read"],
    "settings": []
  }
}
```

- [ ] **Step 3:Commit**

```bash
git add src/app/api/auth/me/route.ts
git commit -m "feat(auth): /api/auth/me returns role and permissions"
```

---

# 阶段 4:Proxy 页面级授权 + /403 页面

## Task 8:创建 /403 页面

**Files:**
- Create: `src/app/403/page.tsx`

- [ ] **Step 1:创建 page.tsx**

```tsx
import Link from "next/link";
import { getCurrentUserWithPermissions } from "@/lib/authz-server";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage() {
  const me = await getCurrentUserWithPermissions();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
      <p className="text-xl">您没有访问该页面的权限</p>
      {me && (
        <p className="text-sm text-muted-foreground">
          当前账号: {me.nickname} · 角色: {me.role.displayName}
        </p>
      )}
      <p className="text-sm text-muted-foreground">如需开通权限,请联系系统管理员</p>
      <Link
        href="/roster"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        返回首页
      </Link>
    </div>
  );
}
```

- [ ] **Step 2:本地验证**

浏览器访问 `http://localhost:3000/403`,应看到"403"页面,若已登录会显示当前用户和角色。

- [ ] **Step 3:Commit**

```bash
git add src/app/403/page.tsx
git commit -m "feat(authz): add /403 forbidden page"
```

---

## Task 9:Proxy 页面级授权

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1:整体替换 proxy.ts**

```typescript
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

  // 在 Proxy 中不能调 Drizzle(用 better-sqlite3 的原生绑定,edge 不支持)。
  // 改为 fetch /api/auth/me 从响应中取 permissions。这等效于 Next 官方推荐的 "optimistic check" 模式。
  const meResp = await fetch(new URL("/api/auth/me", request.url), {
    headers: { cookie: request.headers.get("cookie") || "" },
    cache: "no-store",
  });

  if (!meResp.ok) {
    // 401 → 重定向登录;其他 → 403
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

> **关键说明**:Next.js Proxy 运行于 edge runtime,无法直接用 `better-sqlite3`。此处通过 fetch `/api/auth/me`(绕回 Node.js server)来读取权限。这是官方文档推荐的 "optimistic check" 模式。Server Component 中调用 `requirePageReadAccess()` 是第二道防线(实际的授权判断),Proxy 只是提前重定向,避免渲染无权页面。

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`
Expected: 无 error

- [ ] **Step 3:本地验证(双账号场景)**

1. 在 `.env.local` 临时将 `AUTH_DISABLED=true` 改为 `AUTH_DISABLED=false`(如果原本是 true)
2. 用一个非白名单账号登录(获得 default 角色)
3. 浏览器访问 `http://localhost:3000/settings` → 应被重定向到 `/403`
4. 访问 `/roster` → 正常打开
5. 访问未注册页面 `/nd-smoke` → 不做授权(放行)

- [ ] **Step 4:Commit**

```bash
git add src/proxy.ts
git commit -m "feat(authz): page-level authz in proxy via PATH_TO_MODULE regex map"
```

---

# 阶段 5:API 路由加权限校验

> **原则**:每个 route handler 的第一行调用 `requirePermission(module, action, request)`,有错就直接 return。GET 类 → `read`;POST/PUT/PATCH → `write`;DELETE → `delete`。特殊路径(如 `/api/data/export`)视业务语义判断。

## Task 10:统一在 employees API 路由加权限校验

**Files:**
- Modify: `src/app/api/employees/route.ts`
- Modify: `src/app/api/employees/[id]/route.ts`
- Modify: `src/app/api/employees/[id]/avatar/route.ts`
- Modify: `src/app/api/employees/[id]/avatar-status/route.ts`
- Modify: `src/app/api/employees/[id]/skills/route.ts`
- Modify: `src/app/api/employees/[id]/version-logs/route.ts`

- [ ] **Step 1:在每个 handler 函数首行插入权限检查**

对每个 `export async function GET/POST/PUT/DELETE(...)`,在函数体首行加:

```typescript
const [, err] = await requirePermission("employees", "<read|write|delete>", request);
if (err) return err;
```

并在文件顶部 import:

```typescript
import { requirePermission } from "@/lib/authz";
```

动作映射:
- GET → `read`
- POST / PUT / PATCH → `write`
- DELETE → `delete`

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`
Expected: 无 error

- [ ] **Step 3:本地验证**

用 default 账号登录后:

Run: `curl -s -b "ai-workforce-session=<cookie>" -X DELETE http://localhost:3000/api/employees/xxx | jq .`
Expected: `{"error":"无权限: employees.delete", ...}` 状态 403

Run: `curl -s -b "ai-workforce-session=<cookie>" http://localhost:3000/api/employees | jq '.[0].name'`
Expected: 返回正常(有 read 权限)

- [ ] **Step 4:Commit**

```bash
git add src/app/api/employees/
git commit -m "feat(authz): guard employees API routes with requirePermission"
```

---

## Task 11:在 tasks / production-stats API 加权限校验

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/[taskId]/route.ts`
- Modify: `src/app/api/production-stats/route.ts`

- [ ] **Step 1:同 Task 10 方式为每个 handler 加 `requirePermission("production", <action>, request)`**

- [ ] **Step 2:类型检查 + 本地验证**

Run: `npx tsc --noEmit`

用 default 账号测 DELETE /api/tasks/xxx → 403;GET /api/tasks → 200

- [ ] **Step 3:Commit**

```bash
git add src/app/api/tasks/ src/app/api/production-stats/
git commit -m "feat(authz): guard production API routes"
```

---

## Task 12:在 help API 加权限校验

**Files:**
- Modify: `src/app/api/help/articles/route.ts`
- Modify: `src/app/api/help/articles/[id]/route.ts`
- Modify: `src/app/api/help/categories/route.ts`
- Modify: `src/app/api/help/categories/[id]/route.ts`

- [ ] **Step 1:同方式加 `requirePermission("help", <action>, request)`**

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 3:Commit**

```bash
git add src/app/api/help/
git commit -m "feat(authz): guard help API routes"
```

---

## Task 13:在 metric-configs 和 data API 加权限校验

**Files:**
- Modify: `src/app/api/metric-configs/route.ts`
- Modify: `src/app/api/metric-configs/[id]/route.ts`
- Modify: `src/app/api/metric-configs/resolve/route.ts`
- Modify: `src/app/api/data/metrics/route.ts`
- Modify: `src/app/api/data/metrics/[id]/route.ts`
- Modify: `src/app/api/data/skill-metrics/route.ts`
- Modify: `src/app/api/data/skill-metrics/[id]/route.ts`
- Modify: `src/app/api/data/tasks/route.ts`
- Modify: `src/app/api/data/tasks/[id]/route.ts`
- Modify: `src/app/api/data/export/route.ts`

- [ ] **Step 1:这批 API 都归属 `settings` 模块**

加 `requirePermission("settings", <action>, request)`。

对 `/api/data/export`(GET 导出 CSV),语义是读导出 → `read`。

`/api/metric-configs/resolve` 是 GET 查询基准 → `read`。

- [ ] **Step 2:类型检查 + 本地验证**

Run: `npx tsc --noEmit`

用 default 账号(无 settings 权限)测 GET /api/metric-configs → 403

- [ ] **Step 3:Commit**

```bash
git add src/app/api/metric-configs/ src/app/api/data/
git commit -m "feat(authz): guard metric-configs and data API routes"
```

---

# 阶段 6:前端 UI 过滤

## Task 14:Layout 传递 permissions 给 AppShell

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/nav/app-shell.tsx`
- Modify: `src/components/nav/sidebar.tsx`

- [ ] **Step 1:改 layout.tsx,调用 getCurrentUserWithPermissions**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HelpPanelProvider } from "@/components/help/help-panel-context";
import { HelpPanel } from "@/components/help/help-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentUserWithPermissions } from "@/lib/authz-server";
import { AppShell } from "@/components/nav/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Workforce Platform",
  description: "AI员工管理与价值展示平台",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUserWithPermissions();

  return (
    <html
      lang="zh"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <TooltipProvider delay={300}>
          <HelpPanelProvider>
            <AppShell
              user={me ? { nickname: me.nickname, avatar: me.avatar } : null}
              permissions={me?.permissions ?? null}
              roleDisplayName={me?.role.displayName ?? null}
            >
              {children}
            </AppShell>
            <HelpPanel />
          </HelpPanelProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2:改 app-shell.tsx,接收并下传 permissions**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/nav/sidebar";
import type { UserPermissions } from "@/lib/authz";

export function AppShell({
  children,
  user,
  permissions,
  roleDisplayName,
}: {
  children: React.ReactNode;
  user: { nickname: string; avatar: string } | null;
  permissions: UserPermissions | null;
  roleDisplayName: string | null;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname.startsWith("/login");

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar user={user} permissions={permissions} roleDisplayName={roleDisplayName} />
      <main className="ml-16 h-dvh overflow-y-auto">{children}</main>
    </>
  );
}
```

> **注意**:客户端组件接收 `UserPermissions` 类型是纯类型信息,不会引入 server-only 的 authz.ts 运行时代码。TypeScript 会把类型擦除。

- [ ] **Step 3:改 sidebar.tsx,NAV_ITEMS 标注 module + 过滤**

将文件顶部 `NAV_ITEMS` 定义改为(保留其余代码):

```typescript
import type { UserPermissions, Module } from "@/lib/authz";

const NAV_ITEMS: Array<{ href: string; label: string; icon: typeof LayoutDashboard; module: Module }> = [
  { href: "/dashboard", label: "驾驶舱", icon: LayoutDashboard, module: "dashboard" },
  { href: "/roster", label: "AI花名册", icon: Users, module: "employees" },
  { href: "/production", label: "生产看板", icon: Cpu, module: "production" },
  { href: "/org", label: "组织架构", icon: GitBranch, module: "org" },
  { href: "/settings", label: "系统设置", icon: Settings, module: "settings" },
];
```

函数签名改为(接收 permissions):

```typescript
export function Sidebar({
  user: initialUser,
  permissions,
  roleDisplayName,
}: {
  user?: { nickname: string; avatar: string } | null;
  permissions?: UserPermissions | null;
  roleDisplayName?: string | null;
}) {
```

在渲染 nav 之前过滤:

```typescript
const visibleItems = permissions
  ? NAV_ITEMS.filter((item) => permissions[item.module]?.includes("read"))
  : NAV_ITEMS;
```

并将原来渲染 `NAV_ITEMS.map(...)` 的位置改为 `visibleItems.map(...)`(若变量名不同,按实际代码调整)。

如果希望在用户头像悬浮框中展示角色:

```typescript
{roleDisplayName && (
  <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border">
    {roleDisplayName}
  </div>
)}
```

- [ ] **Step 4:类型检查**

Run: `npx tsc --noEmit`
Expected: 无 error

- [ ] **Step 5:本地验证**

用 default 账号登录 → Sidebar 应不显示"系统设置"
用 super-admin 账号登录 → Sidebar 应显示全部 5 项

- [ ] **Step 6:Commit**

```bash
git add src/app/layout.tsx src/components/nav/
git commit -m "feat(authz): filter sidebar by permissions"
```

---

## Task 15:页面级 requirePageReadAccess 护栏

**Files:**
- Modify: `src/app/roster/page.tsx`
- Modify: `src/app/production/page.tsx`
- Modify: `src/app/org/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1:在每个页面组件函数首行加护栏**

例:`src/app/roster/page.tsx` 在原 `export default async function RosterPage()` 函数体的第一行加:

```typescript
await requirePageReadAccess("employees");
```

文件顶部 import:

```typescript
import { requirePageReadAccess } from "@/lib/authz-server";
```

各页面对应模块:
- roster → `employees`
- production → `production`
- org → `org`
- dashboard → `dashboard`
- settings → `settings`

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 3:本地验证**

用 default 账号登录,浏览器直接访问 `http://localhost:3000/settings` → 重定向到 `/403`

(Proxy 和 Server Component 双重护栏,任何一道都会拦截)

- [ ] **Step 4:Commit**

```bash
git add src/app/roster/page.tsx src/app/production/page.tsx src/app/org/page.tsx src/app/dashboard/page.tsx src/app/settings/page.tsx
git commit -m "feat(authz): add requirePageReadAccess guards to 5 top-level pages"
```

---

# 阶段 7:权限管理页面

## Task 16:UC 用户查询 API

**Files:**
- Create: `src/app/api/permissions/uc-user-lookup/route.ts`

UC SDK 主要是前端 SDK(`"use client"`),后端拿不到 `getAccountInfo(userId)`。改为**只做最小校验**:确认 userId 是纯数字字符串。让前端在"添加用户"时先调 UC SDK 获取 nickname/avatar,然后把这些字段也传给后端一起入库。

- [ ] **Step 1:创建 route.ts**

```typescript
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
```

- [ ] **Step 2:Commit**

```bash
git add src/app/api/permissions/uc-user-lookup/
git commit -m "feat(permissions): add uc-user-lookup validation endpoint"
```

---

## Task 17:角色 CRUD API

**Files:**
- Create: `src/app/api/permissions/roles/route.ts`
- Create: `src/app/api/permissions/roles/[id]/route.ts`

- [ ] **Step 1:创建 roles/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, rolePermissions, userRoles } from "@/db/schema";
import { requirePermission, MODULES, ACTIONS, type Module, type Action } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface CreateRoleBody {
  name: string;
  displayName: string;
  description?: string;
  permissions: Array<{ module: Module; action: Action }>;
}

export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const rows = await db
    .select({
      id: roles.id,
      name: roles.name,
      displayName: roles.displayName,
      description: roles.description,
      isSystem: roles.isSystem,
      userCount: sql<number>`(SELECT COUNT(*) FROM ${userRoles} WHERE ${userRoles.roleId} = ${roles.id})`,
    })
    .from(roles)
    .orderBy(roles.createdAt);

  const permsByRole = new Map<string, Array<{ module: Module; action: Action }>>();
  const allPerms = await db.select().from(rolePermissions);
  for (const p of allPerms) {
    if (!permsByRole.has(p.roleId)) permsByRole.set(p.roleId, []);
    permsByRole.get(p.roleId)!.push({ module: p.module as Module, action: p.action as Action });
  }

  return NextResponse.json(
    rows.map((r) => ({ ...r, permissions: permsByRole.get(r.id) ?? [] }))
  );
}

export async function POST(request: NextRequest) {
  const [user, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const body = (await request.json()) as CreateRoleBody;
  if (!body.name || !body.displayName) {
    return NextResponse.json({ error: "name 和 displayName 必填" }, { status: 400 });
  }

  // 校验 permissions 字段
  for (const p of body.permissions ?? []) {
    if (!MODULES.includes(p.module) || !ACTIONS.includes(p.action)) {
      return NextResponse.json({ error: `非法权限: ${p.module}.${p.action}` }, { status: 400 });
    }
  }

  // 唯一性检查
  const existing = await db.select().from(roles).where(eq(roles.name, body.name));
  if (existing.length > 0) {
    return NextResponse.json({ error: "角色名已存在" }, { status: 409 });
  }

  const id = randomUUID();
  const now = new Date();

  await db.insert(roles).values({
    id,
    name: body.name,
    displayName: body.displayName,
    description: body.description ?? null,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });

  for (const p of body.permissions ?? []) {
    await db.insert(rolePermissions).values({
      id: randomUUID(),
      roleId: id,
      module: p.module,
      action: p.action,
    });
  }

  await logAudit(request, user, {
    action: "role.create",
    target: { type: "role", id },
    details: { name: body.name, permissions: body.permissions },
  });

  return NextResponse.json({ id });
}
```

- [ ] **Step 2:创建 roles/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { roles, rolePermissions, userRoles } from "@/db/schema";
import { requirePermission, MODULES, ACTIONS, type Module, type Action } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface UpdateRoleBody {
  displayName?: string;
  description?: string;
  permissions?: Array<{ module: Module; action: Action }>;
}

async function loadRolePerms(roleId: string): Promise<Array<{ module: Module; action: Action }>> {
  const rows = await db
    .select({ module: rolePermissions.module, action: rolePermissions.action })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((r) => ({ module: r.module as Module, action: r.action as Action }));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const { id } = await params;
  const rows = await db.select().from(roles).where(eq(roles.id, id));
  if (rows.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

  return NextResponse.json({ ...rows[0], permissions: await loadRolePerms(id) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const { id } = await params;
  const existing = await db.select().from(roles).where(eq(roles.id, id));
  if (existing.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  if (existing[0].isSystem) return NextResponse.json({ error: "内置角色不可修改" }, { status: 403 });

  const body = (await request.json()) as UpdateRoleBody;
  const beforePerms = await loadRolePerms(id);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.displayName) updates.displayName = body.displayName;
  if (body.description !== undefined) updates.description = body.description;

  await db.update(roles).set(updates).where(eq(roles.id, id));

  if (body.permissions) {
    // 校验
    for (const p of body.permissions) {
      if (!MODULES.includes(p.module) || !ACTIONS.includes(p.action)) {
        return NextResponse.json({ error: `非法权限: ${p.module}.${p.action}` }, { status: 400 });
      }
    }
    // 同事务:删除旧 + 插入新
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    for (const p of body.permissions) {
      await db.insert(rolePermissions).values({
        id: randomUUID(),
        roleId: id,
        module: p.module,
        action: p.action,
      });
    }
  }

  await logAudit(request, user, {
    action: "role.update",
    target: { type: "role", id },
    details: {
      before: { permissions: beforePerms },
      after: { displayName: body.displayName, permissions: body.permissions },
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [user, err] = await requirePermission("settings", "delete", request);
  if (err) return err;

  const { id } = await params;
  const existing = await db.select().from(roles).where(eq(roles.id, id));
  if (existing.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  if (existing[0].isSystem) return NextResponse.json({ error: "内置角色不可删除" }, { status: 403 });

  const userCountResult = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(userRoles)
    .where(eq(userRoles.roleId, id));
  if (userCountResult[0].c > 0) {
    return NextResponse.json(
      { error: `该角色下有 ${userCountResult[0].c} 个用户,请先解除关联` },
      { status: 409 }
    );
  }

  await db.delete(roles).where(eq(roles.id, id));
  await logAudit(request, user, {
    action: "role.delete",
    target: { type: "role", id },
    details: { name: existing[0].name },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 4:Commit**

```bash
git add src/app/api/permissions/roles/
git commit -m "feat(permissions): role CRUD API with audit logging"
```

---

## Task 18:用户-角色授权 API

**Files:**
- Create: `src/app/api/permissions/user-roles/route.ts`
- Create: `src/app/api/permissions/user-roles/[id]/route.ts`

- [ ] **Step 1:创建 user-roles/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface AddUserBody {
  ucUserId: string;
  nickname: string;
  avatar?: string;
  roleId?: string; // 可选,默认 default 角色
}

export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const rows = await db
    .select({
      id: userRoles.id,
      ucUserId: userRoles.ucUserId,
      nickname: userRoles.nickname,
      avatar: userRoles.avatar,
      roleId: userRoles.roleId,
      roleName: roles.name,
      roleDisplayName: roles.displayName,
      lastLoginAt: userRoles.lastLoginAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .orderBy(userRoles.createdAt);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const [user, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const body = (await request.json()) as AddUserBody;
  if (!body.ucUserId || !/^\d+$/.test(body.ucUserId) || !body.nickname) {
    return NextResponse.json({ error: "ucUserId(数字) 和 nickname 必填" }, { status: 400 });
  }

  const existing = await db.select().from(userRoles).where(eq(userRoles.ucUserId, body.ucUserId));
  if (existing.length > 0) {
    return NextResponse.json({ error: "该用户已存在" }, { status: 409 });
  }

  let roleId = body.roleId;
  if (!roleId) {
    const defaultRole = await db.select().from(roles).where(eq(roles.name, "default"));
    roleId = defaultRole[0]?.id;
    if (!roleId) return NextResponse.json({ error: "默认角色不存在" }, { status: 500 });
  }

  const id = randomUUID();
  const now = new Date();
  await db.insert(userRoles).values({
    id,
    ucUserId: body.ucUserId,
    nickname: body.nickname,
    avatar: body.avatar ?? null,
    roleId,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit(request, user, {
    action: "user.add",
    target: { type: "user", id: body.ucUserId },
    details: { nickname: body.nickname, roleId },
  });

  return NextResponse.json({ id });
}
```

- [ ] **Step 2:创建 user-roles/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, roles } from "@/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface UpdateBody {
  roleId: string;
}

function isSuperAdminWhitelisted(ucUserId: string): boolean {
  const ids = (process.env.SUPER_ADMIN_UC_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return ids.includes(ucUserId);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [operator, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const { id } = await params;
  const rows = await db.select().from(userRoles).where(eq(userRoles.id, id));
  if (rows.length === 0) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const body = (await request.json()) as UpdateBody;
  if (!body.roleId) return NextResponse.json({ error: "roleId 必填" }, { status: 400 });

  const newRole = await db.select().from(roles).where(eq(roles.id, body.roleId));
  if (newRole.length === 0) return NextResponse.json({ error: "角色不存在" }, { status: 400 });

  // 白名单用户不允许被降级:只允许切到 super-admin(等于没变)
  if (isSuperAdminWhitelisted(rows[0].ucUserId) && newRole[0].name !== "super-admin") {
    return NextResponse.json(
      { error: "该用户在 SUPER_ADMIN_UC_IDS 白名单中,不能通过 UI 降级" },
      { status: 403 }
    );
  }

  const oldRole = await db.select().from(roles).where(eq(roles.id, rows[0].roleId));

  await db.update(userRoles).set({ roleId: body.roleId, updatedAt: new Date() }).where(eq(userRoles.id, id));

  await logAudit(request, operator, {
    action: "user.change_role",
    target: { type: "user", id: rows[0].ucUserId },
    details: {
      nickname: rows[0].nickname,
      from: oldRole[0]?.name ?? null,
      to: newRole[0].name,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [operator, err] = await requirePermission("settings", "write", request);
  if (err) return err;

  const { id } = await params;
  const rows = await db.select().from(userRoles).where(eq(userRoles.id, id));
  if (rows.length === 0) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  if (isSuperAdminWhitelisted(rows[0].ucUserId)) {
    return NextResponse.json({ error: "白名单用户不能通过 UI 解除角色" }, { status: 403 });
  }

  const defaultRole = await db.select().from(roles).where(eq(roles.name, "default"));
  if (defaultRole.length === 0) return NextResponse.json({ error: "默认角色缺失" }, { status: 500 });

  const oldRole = await db.select().from(roles).where(eq(roles.id, rows[0].roleId));

  await db
    .update(userRoles)
    .set({ roleId: defaultRole[0].id, updatedAt: new Date() })
    .where(eq(userRoles.id, id));

  await logAudit(request, operator, {
    action: "user.unassign",
    target: { type: "user", id: rows[0].ucUserId },
    details: {
      nickname: rows[0].nickname,
      from: oldRole[0]?.name ?? null,
      to: "default",
    },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 4:Commit**

```bash
git add src/app/api/permissions/user-roles/
git commit -m "feat(permissions): user-role assignment API with whitelist protection"
```

---

## Task 19:审计日志 API

**Files:**
- Create: `src/app/api/permissions/audit-logs/route.ts`

- [ ] **Step 1:创建 route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requirePermission } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const [, err] = await requirePermission("settings", "read", request);
  if (err) return err;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));
  const action = searchParams.get("action");
  const operator = searchParams.get("operator");
  const from = searchParams.get("from"); // ISO date
  const to = searchParams.get("to");
  const format = searchParams.get("format"); // "csv" 时返回 CSV

  const where = [];
  if (action) where.push(eq(auditLogs.action, action));
  if (operator) where.push(eq(auditLogs.operatorUcId, operator));
  if (from) where.push(gte(auditLogs.createdAt, new Date(from)));
  if (to) where.push(lte(auditLogs.createdAt, new Date(to)));

  const whereClause = where.length ? and(...where) : undefined;

  if (format === "csv") {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(10000);
    const header = "时间,操作者UC,操作者昵称,动作,目标类型,目标ID,详情,IP,UA\n";
    const body = rows
      .map((r) =>
        [
          r.createdAt?.toISOString() ?? "",
          r.operatorUcId,
          r.operatorNickname,
          r.action,
          r.targetType ?? "",
          r.targetId ?? "",
          (r.details ?? "").replace(/"/g, '""'),
          r.ip ?? "",
          r.userAgent ?? "",
        ]
          .map((s) => `"${s}"`)
          .join(",")
      )
      .join("\n");
    return new NextResponse(header + body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="audit-logs.csv"`,
      },
    });
  }

  const totalRow = await db.select({ c: sql<number>`COUNT(*)` }).from(auditLogs).where(whereClause);
  const rows = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    items: rows,
    page,
    pageSize,
    total: totalRow[0].c,
  });
}
```

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 3:Commit**

```bash
git add src/app/api/permissions/audit-logs/
git commit -m "feat(permissions): audit log query API with CSV export"
```

---

## Task 20:权限矩阵组件(被后续 tab 引用)

**Files:**
- Create: `src/components/settings/permissions/role-permission-matrix.tsx`

- [ ] **Step 1:创建 role-permission-matrix.tsx**

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Module = "employees" | "production" | "org" | "dashboard" | "help" | "settings";
type Action = "read" | "write" | "delete";

const MODULES: Array<{ key: Module; label: string }> = [
  { key: "employees", label: "员工管理" },
  { key: "production", label: "生产看板" },
  { key: "org", label: "组织架构" },
  { key: "dashboard", label: "KPI 仪表盘" },
  { key: "help", label: "帮助文档" },
  { key: "settings", label: "系统设置" },
];

const ACTIONS: Array<{ key: Action; label: string }> = [
  { key: "read", label: "查看" },
  { key: "write", label: "编辑" },
  { key: "delete", label: "删除" },
];

export type PermissionSet = Array<{ module: Module; action: Action }>;

export function RolePermissionMatrix({
  value,
  onChange,
  disabled,
}: {
  value: PermissionSet;
  onChange: (v: PermissionSet) => void;
  disabled?: boolean;
}) {
  const has = (m: Module, a: Action) => value.some((p) => p.module === m && p.action === a);

  const toggle = (m: Module, a: Action) => {
    if (disabled) return;
    const exists = has(m, a);
    if (exists) {
      onChange(value.filter((p) => !(p.module === m && p.action === a)));
    } else {
      onChange([...value, { module: m, action: a }]);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>模块</TableHead>
          {ACTIONS.map((a) => (
            <TableHead key={a.key} className="text-center">
              {a.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {MODULES.map((m) => (
          <TableRow key={m.key}>
            <TableCell className="font-medium">{m.label}</TableCell>
            {ACTIONS.map((a) => (
              <TableCell key={a.key} className="text-center">
                <Checkbox
                  checked={has(m.key, a.key)}
                  onCheckedChange={() => toggle(m.key, a.key)}
                  disabled={disabled}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2:检查 shadcn Checkbox 和 Table 是否已存在**

Run: `ls src/components/ui/checkbox.tsx src/components/ui/table.tsx`

如果不存在,按 shadcn 惯例添加最小实现。如果存在则跳到 Step 3。

(如果缺失,命令示例 - 项目已安装 `@base-ui/react`,复用该库 API;仓库之前 shadcn 组件本身可能是基于 `@base-ui/react` 的自定义,所以查看 src/components/ui 里已有组件做参考)

- [ ] **Step 3:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 4:Commit**

```bash
git add src/components/settings/permissions/role-permission-matrix.tsx
git commit -m "feat(permissions): role-permission matrix component (6x3)"
```

---

## Task 21:Tab 1 — 角色管理

**Files:**
- Create: `src/components/settings/permissions/role-manager.tsx`

- [ ] **Step 1:创建 role-manager.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RolePermissionMatrix, type PermissionSet } from "./role-permission-matrix";

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  userCount: number;
  permissions: PermissionSet;
}

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftPerms, setDraftPerms] = useState<PermissionSet>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  async function loadRoles() {
    const res = await fetch("/api/permissions/roles", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as Role[];
      setRoles(data);
      if (!selectedId && data.length) setSelectedId(data[0].id);
    }
  }

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setDraftDisplayName(selected.displayName);
    setDraftDescription(selected.description ?? "");
    setDraftPerms(selected.permissions);
  }, [selected?.id]);

  async function save() {
    if (!selected || selected.isSystem) return;
    setSaving(true);
    const res = await fetch(`/api/permissions/roles/${selected.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: draftDisplayName,
        description: draftDescription,
        permissions: draftPerms,
      }),
    });
    setSaving(false);
    if (res.ok) {
      await loadRoles();
      alert("已保存");
    } else {
      const err = await res.json();
      alert(err.error ?? "保存失败");
    }
  }

  async function remove() {
    if (!selected || selected.isSystem) return;
    if (selected.userCount > 0) {
      alert(`该角色下有 ${selected.userCount} 个用户,请先解除关联`);
      return;
    }
    if (!confirm(`确认删除角色「${selected.displayName}」?`)) return;
    const res = await fetch(`/api/permissions/roles/${selected.id}`, { method: "DELETE" });
    if (res.ok) {
      setSelectedId(null);
      await loadRoles();
    } else {
      const err = await res.json();
      alert(err.error ?? "删除失败");
    }
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6">
      <div className="border-r border-border pr-4">
        <Button size="sm" className="mb-3 w-full" onClick={() => setShowCreate(true)}>
          + 新建角色
        </Button>
        <div className="flex flex-col gap-1">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedId === r.id ? "bg-primary/10 font-medium" : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{r.displayName}</span>
                {r.isSystem ? (
                  <span className="text-xs text-muted-foreground">内置</span>
                ) : (
                  <span className="text-xs text-muted-foreground">{r.userCount} 人</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        {selected ? (
          <div className="flex flex-col gap-4">
            <div>
              <Label>角色名</Label>
              <div className="mt-1 text-sm text-muted-foreground">{selected.name}</div>
            </div>
            <div>
              <Label>显示名</Label>
              <Input
                value={draftDisplayName}
                onChange={(e) => setDraftDisplayName(e.target.value)}
                disabled={selected.isSystem}
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                disabled={selected.isSystem}
              />
            </div>
            <div>
              <Label>权限</Label>
              <RolePermissionMatrix
                value={draftPerms}
                onChange={setDraftPerms}
                disabled={selected.isSystem}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={selected.isSystem || saving}>
                保存
              </Button>
              <Button variant="destructive" onClick={remove} disabled={selected.isSystem}>
                删除
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">请从左侧选择角色</div>
        )}
      </div>

      {showCreate && (
        <CreateRoleDialog
          onClose={() => setShowCreate(false)}
          onCreated={async (id) => {
            setShowCreate(false);
            await loadRoles();
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}

function CreateRoleDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name || !displayName) {
      alert("请填写 name 和 displayName");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/permissions/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, displayName, description, permissions: [] }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      onCreated(data.id);
    } else {
      const err = await res.json();
      alert(err.error ?? "创建失败");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建角色</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>角色 name(英文小写,创建后不可改)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. production-lead" />
          </div>
          <div>
            <Label>显示名</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="生产主管" />
          </div>
          <div>
            <Label>描述</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2:确认所需 UI 组件已存在**

Run: `ls src/components/ui/dialog.tsx src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/textarea.tsx src/components/ui/button.tsx`

缺失的组件需先添加(参考现有组件风格)。

- [ ] **Step 3:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 4:Commit**

```bash
git add src/components/settings/permissions/role-manager.tsx
git commit -m "feat(permissions): RoleManager tab (list + detail + create/edit/delete)"
```

---

## Task 22:Tab 2 — 用户授权

**Files:**
- Create: `src/components/settings/permissions/user-role-manager.tsx`

- [ ] **Step 1:创建 user-role-manager.tsx**

```tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getUcUserInfo, getAvatarURL } from "@/lib/uc-client";

interface UserRoleRow {
  id: string;
  ucUserId: string;
  nickname: string;
  avatar: string | null;
  roleId: string;
  roleName: string;
  roleDisplayName: string;
  lastLoginAt: string | null;
}

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
}

export function UserRoleManager() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    const [rowsRes, rolesRes] = await Promise.all([
      fetch("/api/permissions/user-roles", { cache: "no-store" }),
      fetch("/api/permissions/roles", { cache: "no-store" }),
    ]);
    if (rowsRes.ok) setRows(await rowsRes.json());
    if (rolesRes.ok) {
      const data = (await rolesRes.json()) as Array<RoleOption>;
      setRoles(data);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.nickname.toLowerCase().includes(q) || r.ucUserId.includes(q)
    );
  }, [rows, search]);

  async function changeRole(id: string, roleId: string) {
    const res = await fetch(`/api/permissions/user-roles/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleId }),
    });
    if (res.ok) {
      await load();
    } else {
      const err = await res.json();
      alert(err.error ?? "修改失败");
    }
  }

  async function unassign(id: string) {
    if (!confirm("确认解除角色?(将重置为默认用户)")) return;
    const res = await fetch(`/api/permissions/user-roles/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else {
      const err = await res.json();
      alert(err.error ?? "解除失败");
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder="搜索昵称或 UC ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setShowAdd(true)}>+ 添加用户</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>头像</TableHead>
            <TableHead>昵称</TableHead>
            <TableHead>UC ID</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>最后登录</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                让新用户先登录一次系统,再回此处分配角色
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.avatar ? (
                    <img src={r.avatar} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted" />
                  )}
                </TableCell>
                <TableCell>{r.nickname}</TableCell>
                <TableCell className="font-mono text-xs">{r.ucUserId}</TableCell>
                <TableCell>
                  <Select value={r.roleId} onValueChange={(v) => changeRole(r.id, v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("zh-CN") : "—"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => unassign(r.id)}>
                    解除
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showAdd && (
        <AddUserDialog
          roles={roles}
          onClose={() => setShowAdd(false)}
          onAdded={async () => {
            setShowAdd(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function AddUserDialog({
  roles,
  onClose,
  onAdded,
}: {
  roles: RoleOption[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [ucUserId, setUcUserId] = useState("");
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => r.name === "default")?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function tryAutofill() {
    if (!/^\d+$/.test(ucUserId)) {
      alert("UC ID 必须是数字");
      return;
    }
    try {
      // 调 UC SDK(前端侧)获取头像 URL。昵称无法单独根据 userId 查,需用户手填。
      const url = getAvatarURL(Number(ucUserId));
      setAvatar(url);
    } catch (err) {
      console.warn(err);
    }
  }

  async function submit() {
    if (!ucUserId || !nickname) {
      alert("UC ID 和昵称必填");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/permissions/user-roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ucUserId, nickname, avatar, roleId: roleId || undefined }),
    });
    setSubmitting(false);
    if (res.ok) onAdded();
    else {
      const err = await res.json();
      alert(err.error ?? "添加失败");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加用户</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label>UC userId(数字)</Label>
            <div className="flex gap-2">
              <Input value={ucUserId} onChange={(e) => setUcUserId(e.target.value)} />
              <Button variant="outline" onClick={tryAutofill}>
                查头像
              </Button>
            </div>
          </div>
          <div>
            <Label>昵称</Label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} />
          </div>
          <div>
            <Label>角色</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

> **说明**:UC SDK `getAvatarURL(accountId)` 仅需 userId 即可返回头像 URL,无需完整账户数据,因此 AddUserDialog 中"查头像"按钮可只调这一个接口。`getUcUserInfo()` 需依赖当前登录态,不能用于查他人,所以昵称必须人工输入。

- [ ] **Step 2:import `getUcUserInfo` 实际上未用到,移除该 import 避免 lint 报错**

(上面 import 列表里的 `getUcUserInfo` 删除,只保留 `getAvatarURL`)

- [ ] **Step 3:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 4:Commit**

```bash
git add src/components/settings/permissions/user-role-manager.tsx
git commit -m "feat(permissions): UserRoleManager tab (list + role switch + add/unassign)"
```

---

## Task 23:Tab 3 — 审计日志查看器

**Files:**
- Create: `src/components/settings/permissions/audit-log-viewer.tsx`

- [ ] **Step 1:创建 audit-log-viewer.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AuditLog {
  id: string;
  operatorUcId: string;
  operatorNickname: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

interface ListResponse {
  items: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
}

export function AuditLogViewer() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState("");
  const [filterOperator, setFilterOperator] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (filterAction) params.set("action", filterAction);
    if (filterOperator) params.set("operator", filterOperator);
    const res = await fetch(`/api/permissions/audit-logs?${params}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
  }, [page, filterAction, filterOperator]);

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (filterAction) params.set("action", filterAction);
    if (filterOperator) params.set("operator", filterOperator);
    window.location.href = `/api/permissions/audit-logs?${params}`;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="筛选动作 (如 role.create)"
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="筛选操作者 UC ID"
          value={filterOperator}
          onChange={(e) => {
            setFilterOperator(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={exportCsv}>
          导出 CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>时间</TableHead>
            <TableHead>操作者</TableHead>
            <TableHead>动作</TableHead>
            <TableHead>目标</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>详情</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                暂无操作日志
              </TableCell>
            </TableRow>
          ) : (
            data?.items.map((log) => (
              <>
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{new Date(log.createdAt).toLocaleString("zh-CN")}</TableCell>
                  <TableCell>{log.operatorNickname}</TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-xs">
                    {log.targetType}:{log.targetId}
                  </TableCell>
                  <TableCell className="text-xs">{log.ip ?? "—"}</TableCell>
                  <TableCell>
                    {log.details && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        {expanded === log.id ? "收起" : "展开"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {expanded === log.id && log.details && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <pre className="rounded bg-muted p-2 text-xs">
                        {JSON.stringify(JSON.parse(log.details), null, 2)}
                      </pre>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))
          )}
        </TableBody>
      </Table>

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            共 {data.total} 条,第 {data.page} / {Math.ceil(data.total / data.pageSize)} 页
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

> **注意**:`<></>` Fragment 在 map 里需要 key。实际使用时把 `<>` 改为 `<React.Fragment key={log.id}>`:

```tsx
import React from "react";
// ...
{data?.items.map((log) => (
  <React.Fragment key={log.id}>
    <TableRow>...</TableRow>
    {expanded === log.id && ...}
  </React.Fragment>
))}
```

实现时请采用 Fragment + key 形式。

- [ ] **Step 2:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 3:Commit**

```bash
git add src/components/settings/permissions/audit-log-viewer.tsx
git commit -m "feat(permissions): AuditLogViewer tab with filters and CSV export"
```

---

## Task 24:Permission Manager 外壳 + 集成到 Settings 页

**Files:**
- Create: `src/components/settings/permissions/permission-manager.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1:创建 permission-manager.tsx**

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleManager } from "./role-manager";
import { UserRoleManager } from "./user-role-manager";
import { AuditLogViewer } from "./audit-log-viewer";

export function PermissionManager() {
  return (
    <Tabs defaultValue="roles">
      <TabsList>
        <TabsTrigger value="roles">角色管理</TabsTrigger>
        <TabsTrigger value="users">用户授权</TabsTrigger>
        <TabsTrigger value="audit">操作日志</TabsTrigger>
      </TabsList>
      <TabsContent value="roles" className="mt-4">
        <RoleManager />
      </TabsContent>
      <TabsContent value="users" className="mt-4">
        <UserRoleManager />
      </TabsContent>
      <TabsContent value="audit" className="mt-4">
        <AuditLogViewer />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2:修改 src/app/settings/page.tsx 加入"权限管理" tab**

阅读现有 settings page,在文件顶部 imports 追加:

```typescript
import { getCurrentUserWithPermissions } from "@/lib/authz-server";
import { PermissionManager } from "@/components/settings/permissions/permission-manager";
```

在 `getData()` 函数调用处之前(或之后)加:

```typescript
const me = await getCurrentUserWithPermissions();
const canManagePermissions = me?.permissions.settings.includes("write") ?? false;
```

在现有 TabsList 中追加:

```tsx
{canManagePermissions && <TabsTrigger value="permissions">权限管理</TabsTrigger>}
```

在现有 TabsContent 列表末尾追加:

```tsx
{canManagePermissions && (
  <TabsContent value="permissions">
    <PermissionManager />
  </TabsContent>
)}
```

- [ ] **Step 3:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 4:本地验证**

- super-admin 登录 → `/settings` → 看到"权限管理" tab,三个子 tab 可用
- default 账号登录 → `/settings` 被 Proxy 拦到 /403(default 无 settings.read)
- 创建一个 viewer 角色用户(通过 super-admin 手动分配) → 登录 → `/settings` 可访问(viewer 有 settings.read)但没有"权限管理" tab(因为没 settings.write)

- [ ] **Step 5:Commit**

```bash
git add src/components/settings/permissions/permission-manager.tsx src/app/settings/page.tsx
git commit -m "feat(permissions): integrate PermissionManager into /settings"
```

---

# 阶段 8:无权限按钮 hidden(示例点 + 约定)

## Task 25:Button 隐藏约定 + 一个示例改造

**Files:**
- Modify:选一个代表性页面,例如 `src/components/production/*` 或 `src/components/settings/data-management/*` 中的 CRUD 按钮

- [ ] **Step 1:盘点项目中"删除/编辑/新增"按钮所在的 Client Component**

Run: `grep -rn "variant=\"destructive\"\|删除\|新建\|编辑" src/components/ | head -30`

挑 3-5 个关键操作点:
- 员工删除按钮
- 任务删除按钮
- 帮助文档删除按钮
- 指标配置编辑按钮

- [ ] **Step 2:在对应 Page(Server Component)中读取 permissions,作为 prop 下发**

在 Page 中:
```typescript
const me = await getCurrentUserWithPermissions();
// 传给 client component
<SomeClientComponent canDelete={me?.permissions.employees.includes("delete") ?? false} />
```

Client Component 内:
```tsx
{canDelete && <Button variant="destructive">删除</Button>}
```

- [ ] **Step 3:逐个应用到上面盘点出的按钮**

每改一处 → 本地 default 账号登录看按钮是否隐藏,super-admin 账号看是否可见。

- [ ] **Step 4:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 5:Commit**

```bash
git add src/components/ src/app/
git commit -m "feat(authz): hide CRUD buttons based on user permissions"
```

> **约定**:后续新增功能按钮,一律 `{can && <Button/>}` 模式,**不用 disabled**。

---

# 阶段 9:端到端验收

## Task 26:运行完整 12 项验收清单

**前置准备:**

- [ ] **Step 1:确认 `.env.local` 的 `SUPER_ADMIN_UC_IDS` 填入真实的你自己的 UC userId**

编辑 `.env.local`,形如:
```
SUPER_ADMIN_UC_IDS=你的真实UC_ID
```

- [ ] **Step 2:清空本地测试数据**

Run: `sqlite3 local.db "DELETE FROM user_roles; DELETE FROM audit_logs;"`

- [ ] **Step 3:重启 dev server**

Run: `npm run dev`

**执行验收**(逐项确认,失败即修复后再继续):

- [ ] **验收 1**:用 SUPER_ADMIN_UC_IDS 中的 ID 登录 → Sidebar 5 项全显示 → `/settings` 可访问 → "权限管理" tab 可见

- [ ] **验收 2**:清空 user_roles,用非白名单账号登录 → Sidebar 不显示"系统设置" → 直接访问 `/settings` → 跳 `/403`

- [ ] **验收 3**:super-admin 进 Tab 1 新建 "生产主管" 角色,勾选 `production.{read,write,delete}` → 保存成功 → 列表显示

- [ ] **验收 4**:super-admin 在 Tab 2 把 default 账号切到 "生产主管" → default 账号重新登录 → Sidebar 只显示"生产看板"

- [ ] **验收 5**:生产主管用户在 production 看板点"删除任务" → 成功(有 delete)

- [ ] **验收 6**:生产主管用户浏览器访问 `/roster` → 重定向 `/403`

- [ ] **验收 7**:生产主管 curl `DELETE /api/employees/xxx` → 返回 403

- [ ] **验收 8**:super-admin 打开"默认用户"角色 → 矩阵全置灰 → 保存/删除按钮不可点(内置)

- [ ] **验收 9**:super-admin 删"生产主管"(仍有 1 个关联用户)→ 提示"有 1 个用户,请先解除"→ 阻止删除

- [ ] **验收 10**:super-admin 进 Tab 3 → 看到上述 role.create / user.change_role 等记录

- [ ] **验收 11**:`.env.local` 设 `AUTH_DISABLED=true` → 重启 → 任何操作都直接通过(开发模式)

- [ ] **验收 12**:`.env.local` 设 `AUTH_DISABLED=false` → 重启 → 验收 1-10 全通过

- [ ] **Step 4:整理回归点**

- 原 `/login` 登录流程正常
- Sidebar 头像展示不破坏
- 现有业务 API 对 super-admin 账号 100% 放行

- [ ] **Step 5:Commit(如果前面任务有任何补丁)**

```bash
git status
# 若有变动:
git add .
git commit -m "fix(authz): verification fixes"
```

---

## Task 27:文档更新

**Files:**
- Modify: `CLAUDE.md`(简短)

- [ ] **Step 1:在 CLAUDE.md "关键约定" 段追加**

```markdown
- 权限管控(RBAC):6 模块(employees/production/org/dashboard/help/settings)× 3 动作(read/write/delete),详见 docs/superpowers/specs/2026-04-27-permission-management-design.md
- API route 第一行必须 `await requirePermission(module, action, request)`;Client Component 按钮用 `{can.xxx.yyy && <Button/>}` 隐藏,不 disabled
- 新增页面上线 checklist:①`PATH_TO_MODULE` 加正则 ②API 加 requirePermission ③Sidebar 配置 module
- 内置角色(super-admin/viewer/default)不可改;自定义角色在 /settings/permissions 管理
- 首任 super-admin 通过 `.env` 的 `SUPER_ADMIN_UC_IDS` 白名单产生
```

- [ ] **Step 2:Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add RBAC conventions to CLAUDE.md"
```

---

## 自我审查(inline)

### 1. Spec 覆盖度扫描

| Spec 章节 | 覆盖任务 |
|---|---|
| § 2 权限模型(MODULES/ACTIONS)| Task 3 authz.ts |
| § 2.3 内置 3 角色 | Task 2 seed-permissions |
| § 2.4 SUPER_ADMIN_UC_IDS 白名单 | Task 6 login 改造 |
| § 3 四张表 | Task 1 schema |
| § 4.1 getPermissions / can / requirePermission | Task 3 |
| § 4.2 PATH_TO_MODULE + proxy | Task 9 |
| § 4.3 API handler 埋点 | Task 10-13 |
| § 5.1 /api/auth/me 扩展 | Task 7 |
| § 5.2 Server Component 辅助 | Task 4 authz-server |
| § 5.3 按钮 hidden | Task 25 |
| § 5.4 Sidebar 过滤 | Task 14 |
| § 5.5 /403 | Task 8 |
| § 5.6 角色变更需重登录 | Task 18 已通过 UI 提示(toast 在 change_role 处待实现)|
| § 6 UI 3 tab | Task 20-24 |
| § 7 登录流程 upsert user_roles | Task 6 |
| § 8 seed | Task 2 |
| § 9 审计日志埋点 | Task 17, 18(role/user API)|
| § 10 12 项验收 | Task 26 |
| § 12 已知限制 | Task 27 文档 |

**缺口修正**:§ 5.6 明确要求"UI 在角色变更 toast 中提示需重新登录"。Task 22 的 `changeRole` 在成功后没有提示。补充如下:

### 对 Task 22 `changeRole` 函数的补丁(已纳入):

在 Task 22 的 `changeRole` 成功分支 `await load()` 后增加提示:

```typescript
if (res.ok) {
  await load();
  alert("角色已更新,该用户需重新登录才能生效");
}
```

请在实施 Task 22 时采用带此 alert 的版本。

### 2. 占位符扫描

已检查,所有任务都含具体代码。唯一模糊的是 Task 25(按钮隐藏)列的是"代表性改造",本质上这是一个"随功能迭代持续落实"的约定,spec 也明确了"本次范围不含全部按钮全扫"。保留此模糊但明示范围。

### 3. 类型一致性

- `Module` / `Action` 类型在 authz.ts 定义,matrix 组件里独立定义了一份同名类型。**矛盾点**:matrix.tsx 里的 Module/Action 如果和 authz.ts 的 union 不同步,会出现类型漂移。

**修正**:Task 20 的 matrix.tsx 应从 `@/lib/authz` import:

```typescript
import { MODULES, ACTIONS, type Module, type Action } from "@/lib/authz";
```

> 但 `MODULES/ACTIONS` 是 `as const` 数组,在 "use client" 组件中可以安全使用(纯数据),**只要 authz.ts 没有副作用的顶层代码**。我们的 authz.ts 有 `import "server-only"` —— 这会让 Client Component 导入时报错。

**解决方案**:把 MODULES/ACTIONS 常量和 Module/Action 类型单独抽到 `src/lib/authz-constants.ts`(无 server-only),authz.ts / matrix.tsx 都从这里 import。

**新增 Task 3.5(紧接 Task 3 之后插入)**:

---

## Task 3.5:拆分 authz-constants.ts(类型/常量不含 server 副作用)

**Files:**
- Create: `src/lib/authz-constants.ts`
- Modify: `src/lib/authz.ts`(去掉这些常量,改为 re-export)

- [ ] **Step 1:创建 authz-constants.ts**

```typescript
export const MODULES = ["employees", "production", "org", "dashboard", "help", "settings"] as const;
export const ACTIONS = ["read", "write", "delete"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type Permission = `${Module}.${Action}`;
export type UserPermissions = Record<Module, Action[]>;

export const MODULE_LABELS: Record<Module, string> = {
  employees: "员工管理",
  production: "生产看板",
  org: "组织架构",
  dashboard: "KPI 仪表盘",
  help: "帮助文档",
  settings: "系统设置",
};

export const ACTION_LABELS: Record<Action, string> = {
  read: "查看",
  write: "编辑",
  delete: "删除",
};
```

- [ ] **Step 2:改 authz.ts 的顶部**

去掉本地的 MODULES / ACTIONS / Module / Action / Permission / UserPermissions 定义,改为:

```typescript
import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoles, rolePermissions, roles } from "@/db/schema";
import { getCurrentUser, verifySessionFromRequest, type SessionUser } from "@/lib/auth";

export { MODULES, ACTIONS } from "./authz-constants";
export type { Module, Action, Permission, UserPermissions } from "./authz-constants";

import type { Module, Action, UserPermissions } from "./authz-constants";
```

(其余函数实现不变)

- [ ] **Step 3:matrix / sidebar / app-shell 等 Client 组件的 import 改为**:

```typescript
import { MODULES, ACTIONS, MODULE_LABELS, ACTION_LABELS, type Module, type Action, type UserPermissions } from "@/lib/authz-constants";
```

(原计划从 `@/lib/authz` 导入的地方,全部换源。对 Client 组件很关键:不能依赖 `server-only` 模块。)

- [ ] **Step 4:类型检查**

Run: `npx tsc --noEmit`

- [ ] **Step 5:Commit**

```bash
git add src/lib/authz-constants.ts src/lib/authz.ts
git commit -m "refactor(authz): split constants into authz-constants.ts to avoid server-only leak in client components"
```

> **覆盖关系提示**:后续 Task 14(sidebar)、Task 20(matrix)、Task 22(user-role manager)引用 Module/UserPermissions 类型时,**必须 from `@/lib/authz-constants`,不能 from `@/lib/authz`**。

---

完成类型一致性修正。Plan 定稿。

---

# 执行方式选择

**Plan 已写完,保存路径:`docs/superpowers/plans/2026-04-27-permission-management.md`**

两种执行方式:

1. **Subagent 驱动(推荐)**:每个 Task 派发一个独立 subagent 实现,主 agent 负责 review + 提交。任务间清理上下文,避免串扰,速度快。
2. **Inline 执行**:在当前会话按顺序跑完所有 Task,每完成一个阶段暂停给你 review。

你选哪种?