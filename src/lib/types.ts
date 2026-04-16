export type TeamType = "management" | "design" | "production";
export type EmployeeStatus = "active" | "developing" | "planned";
export type PeriodType = "daily" | "weekly" | "monthly";
export type TaskStatus = "running" | "completed" | "failed";
export type OutputType = "document" | "resource" | "report" | "media" | "other";

export interface Employee {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  team: TeamType;
  status: EmployeeStatus;
  subTeam: string | null;
  soul: string | null;
  identity: string | null;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  skills?: Skill[];
  metrics?: Metric[];
  versionLogs?: VersionLog[];
}

export interface Skill {
  id: string;
  employeeId: string;
  name: string;
  description: string | null;
  level: number;
  category: string | null;
  skillMetrics?: SkillMetric[];
}

export interface SkillMetric {
  id: string;
  skillId: string;
  employeeId: string;
  period: string;
  invocationCount: number;
  successRate: number | null;
  avgResponseTime: number | null;
  lastUsedAt: Date | null;
  createdAt: Date | null;
}

export interface Metric {
  id: string;
  employeeId: string;
  period: string;
  periodType: PeriodType;
  taskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  humanTimeSaved: number | null;
  customMetrics: Record<string, unknown> | null;
  createdAt: Date | null;
}

export interface Task {
  id: string;
  employeeId: string;
  team: TeamType;
  name: string;
  type: string;
  status: TaskStatus;
  progress: number;
  currentStep: string | null;
  startTime: Date | null;
  estimatedEndTime: Date | null;
  actualEndTime: Date | null;
  metadata: Record<string, unknown> | null;
}

export interface TaskOutput {
  id: string;
  taskId: string;
  type: OutputType;
  title: string;
  content: string | null;
  url: string | null;
  createdAt: Date | null;
}

export interface VersionLog {
  id: string;
  employeeId: string;
  version: string;
  date: string;
  changelog: string;
  capabilities: Record<string, unknown> | null;
}

export interface MetricConfig {
  id: string;
  employeeId: string | null;
  taskType: string;
  humanBaseline: number;
  costPerHour: number;
  description: string | null;
  updatedAt: Date | null;
}

// API response shapes
export interface EmployeeListItem {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  team: TeamType;
  status: EmployeeStatus;
  monthlyTaskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  description: string | null;
  subTeam: string | null;
}
