import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  title: text("title").notNull(),
  team: text("team", { enum: ["management", "design", "production"] }).notNull(),
  status: text("status", { enum: ["active", "developing", "planned"] }).notNull(),
  subTeam: text("sub_team"),
  soul: text("soul"),
  identity: text("identity"),
  description: text("description"),
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
  taskType: text("task_type").notNull(),
  humanBaseline: real("human_baseline").notNull(),
  costPerHour: real("cost_per_hour").notNull().default(46.875),
  description: text("description"),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
