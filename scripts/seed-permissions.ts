import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../src/db";
import { roles, rolePermissions } from "../src/db/schema";
import { eq } from "drizzle-orm";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.warn("Warning: .env.local not found, relying on existing env vars");
    return;
  }
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

import { MODULES, ACTIONS, type Module, type Action } from "../src/lib/authz-constants";

// Keep as runtime arrays for flatMap / map usage
const ALL_MODULES: Module[] = [...MODULES];
const ALL_ACTIONS: Action[] = [...ACTIONS];
const BUSINESS_MODULES: Module[] = MODULES.filter((m) => m !== "settings");

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
