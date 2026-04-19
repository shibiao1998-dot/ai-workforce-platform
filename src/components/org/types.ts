import type { TeamType, EmployeeStatus } from "@/lib/types"

export interface EmployeeNodeData {
  id: string
  name: string
  title: string
  team: TeamType
  status: EmployeeStatus
  avatar: string | null
  mbti: string | null
  personality: string[]
  xp: number
  level: number
  levelEmoji: string
  levelColor: string
  levelProgress: number
  streak: number
  monthlyTaskCount: number
}

export type NodeSize = "large" | "medium" | "small"

export function getNodeSize(title: string, status: EmployeeStatus): NodeSize {
  if (status === "planned") return "small"
  if (title.includes("总监") || title.includes("负责人")) return "large"
  return "medium"
}

export const NODE_WIDTH: Record<NodeSize, number> = { large: 140, medium: 120, small: 100 }
export const NODE_HEIGHT: Record<NodeSize, number> = { large: 180, medium: 155, small: 128 }
