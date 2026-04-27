import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  title: text("title").notNull(),
  team: text("team", { enum: ["management", "design", "production"] }).notNull(),
  status: text("status", { enum: ["active", "developing", "planned", "inactive"] }).notNull(),
  subTeam: text("sub_team"),
  soul: text("soul"),
  identity: text("identity"),
  description: text("description"),
  avatarDescription: text("avatar_description"),
  persona: text("persona"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  level: integer("level").notNull().default(3),
  category: text("category"),
});

export const skillMetrics = sqliteTable("skill_metrics", {
  id: text("id").primaryKey(),
  skillId: text("skill_id").notNull().references(() => skills.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  invocationCount: integer("invocation_count").notNull().default(0),
  successRate: real("success_rate"),
  avgResponseTime: real("avg_response_time"),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  periodType: text("period_type", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  taskCount: integer("task_count").notNull().default(0),
  adoptionRate: real("adoption_rate"),
  accuracyRate: real("accuracy_rate"),
  humanTimeSaved: real("human_time_saved"),
  customMetrics: text("custom_metrics"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  team: text("team", { enum: ["management", "design", "production"] }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["running", "completed", "failed"] }).notNull(),
  progress: integer("progress").notNull().default(0),
  currentStep: text("current_step"),
  startTime: integer("start_time", { mode: "timestamp" }),
  estimatedEndTime: integer("estimated_end_time", { mode: "timestamp" }),
  actualEndTime: integer("actual_end_time", { mode: "timestamp" }),
  metadata: text("metadata"),
  qualityScore: integer("quality_score"),
  retryCount: integer("retry_count").default(0),
  tokenUsage: integer("token_usage"),
  reflection: text("reflection"),
});

export const taskSteps = sqliteTable("task_steps", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed", "skipped"] }).notNull().default("pending"),
  thought: text("thought"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const taskOutputs = sqliteTable("task_outputs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["document", "resource", "report", "media", "other"] }).notNull(),
  title: text("title").notNull(),
  content: text("content"),
  url: text("url"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

export const versionLogs = sqliteTable("version_logs", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  date: text("date").notNull(),
  changelog: text("changelog").notNull(),
  capabilities: text("capabilities"),
});

export const metricConfigs = sqliteTable("metric_configs", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  team: text("team", { enum: ["management", "design", "production"] }),
  taskType: text("task_type").notNull(),
  humanBaseline: real("human_baseline").notNull(),
  costPerHour: real("cost_per_hour").notNull().default(46.875),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const helpCategories = sqliteTable("help_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const helpArticles = sqliteTable("help_articles", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => helpCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

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
  (t) => [uniqueIndex("role_perm_unq").on(t.roleId, t.module, t.action)]
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
