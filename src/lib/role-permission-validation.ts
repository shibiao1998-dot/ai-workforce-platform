import { ACTIONS, MODULES, type Action, type Module } from "@/lib/authz-constants";

export interface PermissionInput {
  module: Module;
  action: Action;
}

export function validatePermissionInputs(value: unknown): PermissionInput[] {
  if (!Array.isArray(value)) {
    throw new Error("permissions 必须是数组");
  }

  const seen = new Set<string>();
  const permissions: PermissionInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      throw new Error("permissions 中每一项必须是对象");
    }
    const { module, action } = item as { module?: unknown; action?: unknown };
    if (!MODULES.includes(module as Module) || !ACTIONS.includes(action as Action)) {
      throw new Error(`非法权限: ${String(module)}.${String(action)}`);
    }
    const key = `${module}.${action}`;
    if (seen.has(key)) {
      throw new Error(`重复权限: ${key}`);
    }
    seen.add(key);
    permissions.push({ module: module as Module, action: action as Action });
  }

  return permissions;
}
