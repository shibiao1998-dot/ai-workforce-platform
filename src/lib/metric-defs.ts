export interface MetricDef {
  key: string
  label: string
  description: string
  unit: string
  precision: number
}

export const METRIC_DEFS: Record<string, MetricDef> = {
  taskCount: { key: "taskCount", label: "任务总量", description: "所选时间范围内的任务总数", unit: "个", precision: 0 },
  completionRate: { key: "completionRate", label: "完成率", description: "已完成任务占已完成与失败任务之和的比率", unit: "%", precision: 1 },
  qualityScore: { key: "qualityScore", label: "平均质量分", description: "已完成任务的质量评分平均值（满分100）", unit: "分", precision: 0 },
  adoptionRate: { key: "adoptionRate", label: "采纳率", description: "已完成任务占全部任务（含执行中）的比率", unit: "%", precision: 1 },
  accuracyRate: { key: "accuracyRate", label: "准确率", description: "基于质量评分的任务准确程度（满分100%）", unit: "%", precision: 1 },
  hoursSaved: { key: "hoursSaved", label: "节省人工时", description: "按任务类型的人工基准耗时累计，AI完成所节省的工时", unit: "h", precision: 1 },
  costSaved: { key: "costSaved", label: "节省人力成本", description: "节省工时折算的人力成本（基于配置的时薪）", unit: "¥", precision: 0 },
  runningTasks: { key: "runningTasks", label: "执行中", description: "当前正在执行中的任务数量", unit: "", precision: 0 },
  tokenCost: { key: "tokenCost", label: "Token 消耗成本", description: "任务消耗的 Token 折算费用", unit: "¥", precision: 2 },
  operationalIndex: { key: "operationalIndex", label: "综合运营指数", description: "采纳率与准确率的综合评分，反映整体运营健康度", unit: "", precision: 0 },
  teamHealth: { key: "teamHealth", label: "团队健康度", description: "团队中在岗运行员工占全部员工的比率", unit: "%", precision: 0 },
  xp: { key: "xp", label: "经验值", description: "基于任务完成数量和质量累计的成长积分", unit: "XP", precision: 0 },
  level: { key: "level", label: "等级", description: "由经验值决定的成长阶段（新手→熟练→精英→大师→传奇）", unit: "", precision: 0 },
}

export const TOKEN_COST_RATE = 0.0001
