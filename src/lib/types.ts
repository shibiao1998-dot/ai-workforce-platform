export type TeamType = "management" | "design" | "production";
export type EmployeeStatus = "active" | "developing" | "planned" | "inactive";
export type PeriodType = "daily" | "weekly" | "monthly";
export type TaskStatus = "running" | "completed" | "failed";
export type OutputType = "document" | "resource" | "report" | "media" | "other";

export type TaskStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface TaskStep {
  id: string;
  taskId: string;
  stepOrder: number;
  name: string;
  status: TaskStepStatus;
  thought: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface EmployeePersona {
  age: number;
  gender: "male" | "female";
  personality: string[];
  catchphrase: string;
  backstory: string;
  workStyle: string;
  interests: string[];
  fashionStyle: string;
  mbti: string;
  visualTraits: string;
  sceneDescription: string;
}

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
  avatarDescription: string | null;
  persona: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  skills?: Skill[];
  metrics?: Metric[];
  versionLogs?: VersionLog[];
  currentMetrics?: {
    taskCount: number
    adoptionRate: number
    accuracyRate: number
    hoursSaved: number
  }
  monthlyTrend?: {
    period: string
    taskCount: number
    adoptionRate: number
    accuracyRate: number
    hoursSaved: number
  }[]
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
  qualityScore: number | null;
  retryCount: number | null;
  tokenUsage: number | null;
  reflection: string | null;
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
  team: TeamType | null;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DataMetricRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string | null;
  team: TeamType;
  period: string;
  periodType: PeriodType;
  taskCount: number;
  adoptionRate: number | null;
  accuracyRate: number | null;
  humanTimeSaved: number | null;
}

export interface DataSkillMetricRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string | null;
  team: TeamType;
  skillId: string;
  skillName: string;
  category: string | null;
  period: string;
  invocationCount: number;
  successRate: number | null;
  avgResponseTime: number | null;
}

export interface DataTaskRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string | null;
  team: TeamType;
  name: string;
  type: string;
  status: TaskStatus;
  qualityScore: number | null;
  tokenUsage: number | null;
  estimatedCost: number | null;
  retryCount: number | null;
  startTime: Date | null;
  actualEndTime: Date | null;
}
