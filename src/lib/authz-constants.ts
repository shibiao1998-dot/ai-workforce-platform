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
