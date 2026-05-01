# 统一数据源与指标 Tooltip 设计文档

> 日期: 2026-04-22
> 状态: 已审批

## 背景

当前平台存在两个核心问题：
1. **数据源不统一**：`metrics` 表存储预聚合的月度指标（由 seed 脚本生成），与 `tasks` 表的实际任务记录完全脱节。Dashboard 的 KPI 来自 metrics 表，Production 页面的指标来自 tasks 表，两套数据互不关联。
2. **指标缺乏说明**：所有指标展示处均无 hover 提示，用户无法快速了解指标含义。

此外还有若干不一致：token 成本费率有两个版本（0.00005 vs 0.00015），costPerHour 有 3 处硬编码，4 个 `/api/dashboard/*` 路由是死代码，排行榜 rankChange 永远为 0。

## 方案

**方案 A（已选）：纯函数派生层** — 创建统一指标引擎 `src/lib/metric-engine.ts`，所有指标从 tasks 表实时计算。数据量小（24 员工、几百条任务），SQLite 聚合开销可忽略。

## 一、统一指标引擎

### 1.1 MetricDef 结构

```ts
interface MetricDef {
  key: string           // 唯一标识
  label: string         // 中文名称
  description: string   // tooltip 悬浮描述（说清 what）
  unit: string          // '%' | '个' | 'h' | '¥' | '分' | ''
  precision: number     // 小数位数
}
```

### 1.2 指标体系（全部从 tasks 表派生）

| key | 中文名 | 计算方式 | 来源 |
|---|---|---|---|
| `taskCount` | 任务总量 | COUNT(tasks) in range | tasks |
| `completionRate` | 完成率 | completed / (completed + failed) | tasks.status |
| `qualityScore` | 平均质量分 | AVG(qualityScore) of completed | tasks.qualityScore |
| `adoptionRate` | 采纳率 | completed / total (含 running) | tasks.status |
| `accuracyRate` | 准确率 | AVG(qualityScore) / 100 | tasks.qualityScore |
| `hoursSaved` | 节省人工时 | SUM(resolved humanBaseline) for completed | tasks + metricConfigs |
| `costSaved` | 节省人力成本 | hoursSaved × costPerHour | 派生 |
| `runningTasks` | 执行中 | COUNT where status='running' | tasks.status |
| `tokenCost` | Token 消耗成本 | SUM(tokenUsage) × 统一费率 | tasks.tokenUsage |
| `operationalIndex` | 综合运营指数 | (adoptionRate + accuracyRate) / 2 × 100 | 派生 |

**关键变化**：
- `adoptionRate`：从 metrics 表静态值 → 「已完成任务占全部任务的比率」
- `accuracyRate`：从 metrics 表静态值 → 「基于质量评分的准确程度」
- `hoursSaved`：从 metrics.humanTimeSaved → 按 taskType resolve metricConfigs.humanBaseline 累加
- token 成本：统一为单一费率常量

### 1.3 查询函数 API

```ts
// 核心聚合查询
getMetrics(options: {
  period?: string          // YYYY-MM 月度
  timeRange?: string       // today | 7d | 30d
  team?: string
  employeeId?: string
}): Promise<MetricValues>

// 环比趋势（给 KPI 卡片用）
getMetricsTrend(current: string, prev: string, scope?): Promise<KpiItem[]>

// 每日趋势（给生产看板图表用）
getDailyTrend(timeRange, scope?): Promise<DailyTrendPoint[]>

// 按月趋势（给员工详情趋势图用）
getMonthlyTrend(employeeId: string, months: string[]): Promise<MonthlyTrendPoint[]>

// 团队效率趋势（给 dashboard 趋势图用）
getTeamEfficiencyTrend(months: string[]): Promise<TeamEfficiencyPoint[]>

// 员工排行
getEmployeeRanking(timeRange, limit): Promise<RankEntry[]>
```

## 二、全局 Tooltip 系统

### 2.1 指标描述

| key | tooltip |
|---|---|
| `taskCount` | 所选时间范围内的任务总数 |
| `completionRate` | 已完成任务占已完成与失败任务之和的比率 |
| `qualityScore` | 已完成任务的质量评分平均值（满分100） |
| `adoptionRate` | 已完成任务占全部任务（含执行中）的比率 |
| `accuracyRate` | 基于质量评分的任务准确程度（满分100%） |
| `hoursSaved` | 按任务类型的人工基准耗时累计，AI完成所节省的工时 |
| `costSaved` | 节省工时折算的人力成本（基于配置的时薪） |
| `runningTasks` | 当前正在执行中的任务数量 |
| `tokenCost` | 任务消耗的 Token 折算费用 |
| `operationalIndex` | 采纳率与准确率的综合评分，反映整体运营健康度 |

### 2.2 MetricTooltip 组件

创建 `src/components/shared/metric-tooltip.tsx`：

```tsx
<MetricTooltip metricKey="adoptionRate">
  <span>采纳率</span>
</MetricTooltip>
```

- 基于已有的 `@base-ui/react` Tooltip 组件（`src/components/ui/tooltip.tsx`）
- 接收 `metricKey`，自动从 MetricDef 查 description
- 也支持 `description` prop 直接传入自定义文案
- `TooltipProvider` 在 root layout 包裹一次

### 2.3 需要添加 Tooltip 的组件

1. **Dashboard KpiCard** — 5 个 KPI 标签
2. **Dashboard OperationalIndexGauge** — 运营指数 + 3 个子指标
3. **Dashboard TeamStatusPanel** — 团队健康度
4. **Production ProductionStats** — 4 个统计卡片标签
5. **Production QualityGauge** — 质量评分标签
6. **Roster EmployeeCard** — 3 个指标标签
7. **Roster MetricsTab** — 4 个汇总卡片标签
8. **Dashboard TaskFeed** — token 成本
9. **Dashboard LeaderboardPanel** — XP / 等级

## 三、各页面改造

### 3.1 Dashboard

- KPI 卡片：5 个指标全部改为 engine 计算
- 运营指数：从 engine 获取 operationalIndex
- 团队状态：保持不变（来自 employees 表）
- 团队效率趋势：改为 engine 的 `getTeamEfficiencyTrend()`，从 tasks 按月聚合
- 热力图：保持不变（已从 tasks 查询）
- 任务 feed：统一 token 费率
- 游戏化/排行榜：保持不变（已从 tasks 派生）

### 3.2 Production

- `/api/production-stats` 内部改为调用 engine 函数
- 4 个 stat card 加 MetricTooltip
- QualityGauge 加 MetricTooltip

### 3.3 Roster

- `page.tsx` 改为调用 engine 按 employeeId 聚合当月 tasks
- EmployeeCard 指标改为 engine 值 + MetricTooltip
- MetricsTab 改为 engine 多月趋势数据
- `/api/employees/[id]` 返回 metrics 改为 engine 实时计算

### 3.4 Settings 数据管理

- metrics 表 CRUD 保留（历史归档）
- 不影响前台指标展示

## 四、清理

- 删除死 API 路由：`/api/dashboard/summary`、`/api/dashboard/heatmap`、`/api/dashboard/team-comparison`、`/api/dashboard/recent-tasks`
- `dashboard-data.ts`：保留 `getTeamStatus()`、`getHeatmapData()`、`getRecentTasks()`、游戏化函数；删除 `getDashboardSummary()`、`getKpiData()`、`getTeamEfficiencyTrend()`
- 统一 token 成本费率为单一常量

## 五、不改的部分

- 数据库 schema（不删 metrics 表，不做迁移）
- Help 系统
- Org 页面
- Seed 脚本
- metricConfigs 表和 3 层配置体系
