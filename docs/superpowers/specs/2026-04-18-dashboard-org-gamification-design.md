# AI Workforce Platform — 驾驶舱重设计 + 游戏化 + 组织架构重设计

**规格文档版本**：1.0  
**创建日期**：2026-04-18  
**范围**：三个方向，四个批次，逐步交付

---

## 目录

1. [项目背景与现状问题](#1-项目背景与现状问题)
2. [整体视觉风格](#2-整体视觉风格)
3. [批次一：AI 驾驶舱重设计](#3-批次一ai-驾驶舱重设计)
4. [批次二：游戏化系统](#4-批次二游戏化系统)
5. [批次三：组织架构重设计](#5-批次三组织架构重设计)
6. [批次四：联动跳转系统](#6-批次四联动跳转系统)
7. [不做的事情（显式延迟）](#7-不做的事情显式延迟)

---

## 1. 项目背景与现状问题

### 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 App Router + React 19 + TypeScript |
| 样式 | Tailwind CSS v4（`@theme inline`，无 tailwind.config.js）|
| UI 组件 | shadcn/ui（基于 `@base-ui/react`，非 Radix）|
| 图表 | ECharts via `echarts-for-react` |
| 流程图 | React Flow (`@xyflow/react`) |
| 数据库 | SQLite via `better-sqlite3` + Drizzle ORM，9 张表 |
| 员工规模 | 24 位 AI 员工，3 个团队（管理 10 人、设计 4 人、生产 10 人）|

### 现状问题

#### 驾驶舱 `/dashboard`

- 只使用了 9 张表中的 3 张（`employees` / `metrics` / `tasks`），大量数据未利用
- 6 个 KPI 卡片趋势数据全是**硬编码假数据**，与实际业务无关
- 热力图 `visualMap.max` 写死为 `10`，数据量大时溢出无渐变
- 布局为标准上下堆叠（6 KPI → 团队对比 → 热力图 + 任务），无主次层级
- `page.tsx` 与 API routes 查询逻辑重复，`props` 全用 `any` 类型
- 页面间零联动，用户无法从 KPI 追溯到具体数据

#### 组织架构 `/org`

- 仅 2 个文件（`page.tsx` 35 行 + `org-chart.tsx` 220 行），严重欠设计
- 未使用自定义节点组件，React Flow 默认节点仅显示员工姓名
- 查询了 `title`（职位）但**完全未渲染**
- **硬编码像素坐标**布局，团队区块会碰撞
- `inactive` 状态无颜色映射
- 缺少 `loading.tsx`

---

## 2. 整体视觉风格

### 主题方向

**浅色高级感（Light Premium）**：保持浅色基底，升级为 glassmorphism（磨砂玻璃卡片）+ 微妙渐变 + 精致阴影层次 + 流畅动效。

### 背景

```css
background: linear-gradient(135deg, #f0f4f8, #e8eef5);
```

### 卡片

```css
background: rgba(255, 255, 255, 0.75);
backdrop-filter: blur(12px);
border-radius: 16px;
box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
border: 1px solid rgba(255, 255, 255, 0.8);
```

### 色彩体系

| 用途 | 颜色 | Hex |
|---|---|---|
| 管理团队 | 紫色 | `#8b5cf6` |
| 设计团队 | 蓝色 | `#3b82f6` |
| 生产团队 | 绿色 | `#22c55e` |
| 强调色 | Indigo | `#6366f1` |
| 金色（成就/传奇） | 金色 | `#f59e0b` |
| 主文字 | 深蓝灰 | `#1e293b` |
| 辅助文字 | 灰 | `#64748b` |

### 动效原则

- 入场动画：`opacity 0→1` + `translateY 8px→0`，duration `300ms`，easing `ease-out`
- Hover 效果：`translateY -2px`，`box-shadow` 加深，`transition 200ms`
- 数字入场：`useCountUp` hook，duration `1200ms`
- 仪表盘呼吸：CSS `@keyframes pulse`，`opacity 0.6→1`，`scale 0.98→1`，duration `2s infinite`

---

## 3. 批次一：AI 驾驶舱重设计

### 3.1 布局：Bento Grid（不对称网格）

共 4 行，宽度比例见各行说明。整体 `grid` 容器，`gap-4`，`p-6`。

---

### Row 1 — Hero 区（全宽）

**分割比例**：左 60% + 右 40%

#### 左 60%：综合运营指数

**组件**：`OperationalIndexGauge`

- 大型**半圆仪表盘**（ECharts gauge 类型）
- 指针角度范围：`-180° ~ 0°`（标准半圆）
- 评分计算公式（加权平均）：

  ```
  综合运营指数 = qualityScore_avg × 0.5 + successRate × 0.3 + adoptionRate × 0.2
  ```

  - `qualityScore_avg`：`tasks` 表中 `status = 'completed'` 的 `AVG(qualityScore)`，归一化到 0-100
  - `successRate`：完成任务数 / 总任务数 × 100
  - `adoptionRate`：暂用 `active 员工数 / 24 × 100`（无专项数据时的合理近似）

- 仪表盘色带：`0-60` 红色渐变 → `60-80` 橙色渐变 → `80-100` 绿色渐变
- 中心大数字：评分值（如 `87.3`）+ 文字 "综合运营指数"
- 呼吸脉冲光晕：CSS `@keyframes` 作用于仪表盘外圈 `box-shadow`
- 仪表盘下方 3 个迷你统计（横排）：

  | 统计项 | 数据来源 |
  |---|---|
  | 本月任务数 | `metrics` 表当月 `taskCount` SUM |
  | 成功率 | 同上 successRate |
  | 节省人力成本 | `humanTimeSaved × costPerHour`（从 `metric_configs` 读取真实 `costPerHour`）|

#### 右 40%：团队状态概览

**组件**：`TeamStatusPanel`

- 3 个团队卡片竖排（管理 / 设计 / 生产）
- 每张卡片：

  ```
  [团队色左边框 4px] [团队名] [在线人数 "8/10 在线"]
  [健康度进度条，宽度 = active人数/总人数，颜色 = 团队色]
  ```

- **健康度**定义：`active 员工数 / 团队总人数`
- 点击任意团队卡片 → 导航至 `/org?team=<teamName>`，组织架构页高亮该团队

---

### Row 2 — KPI 卡片带

6 张等宽卡片，`grid-cols-6`。

每张卡片结构：

```
[emoji 图标，32px]  [指标名，12px 辅色]
[大数字，useCountUp，28px bold]
[趋势标签：↑/↓ N% 环比上月]
[SVG 迷你折线图，高 32px，宽 80px]
```

Hover 效果：`translateY -2px`，底部显示 "点击跳转 →" 文字（`text-xs text-indigo-500`）。

#### 6 个指标详细定义

| # | 指标名 | emoji | 数据来源 | 点击行为 | 趋势计算 |
|---|---|---|---|---|---|
| 1 | AI 员工 | 👥 | `employees` 表 `active` 人数 / 总人数（如 `"20/24"`）| `/roster` | 上月 active 人数对比 |
| 2 | 本月任务量 | 📋 | `metrics.taskCount` 当月 SUM | `/production` | 上月同期 taskCount 对比 |
| 3 | 节省成本（元） | 💰 | `metrics.humanTimeSaved` × `metric_configs.costPerHour` | `/dashboard`（滚动到成本区域）| 上月同期对比 |
| 4 | 平均质量分 | ⭐ | `tasks.qualityScore` 当月 AVG，`status=completed` | `/production?sort=quality` | 上月同期 AVG 对比 |
| 5 | 技能调用量 | ⚡ | `skill_metrics.invocationCount` 当月 SUM | 展开技能详情（Popover / Sheet）| 上月同期对比 |
| 6 | 产出物数量 | 📦 | `task_outputs` 当月 COUNT | 展开产出物详情（Popover / Sheet）| 上月同期对比 |

**趋势环比计算规则**：

```ts
// 获取当月和上月数据，计算环比变化率
const trendPct = ((current - prev) / prev) * 100
// 展示：正数绿色 ↑ N%，负数红色 ↓ N%，0 灰色 →
```

> 注意：所有趋势数据从数据库真实查询，不再使用任何硬编码值。

**SVG 迷你折线图**：取最近 6 个月数据，纯 SVG `<polyline>`，不引入额外图表库。

---

### Row 3 — 主分析区

**分割比例**：左 2/3 + 右 1/3

#### 左 2/3：团队效能对比

**组件**：`TeamEfficiencyChart`（ECharts grouped bar chart）

- X 轴：最近 5 个月（`YYYY-MM` 格式，从 `metrics` 表取）
- Y 轴：按团队分组的任务量（`taskCount`）
- 颜色：管理紫 / 设计蓝 / 生产绿
- **Cross-filtering**：点击某团队的柱状图 → 底部热力图（Row 4 左）过滤只显示该团队员工行
- 点击某团队柱状图 → 图表右上角出现 "查看 XX 团队组织架构 →" 链接，导航至 `/org?team=<teamName>`

#### 右 1/3：实时排行榜

**组件**：`LeaderboardPanel`

- 顶部 Tab：本周 / 本月（切换时重新排序）
- 列表：Top 5 员工

  每行结构：

  ```
  [排名号 1-5，1号金色加大] [头像圆圈，团队色边框] [姓名] [等级徽章 Lv.N] [XP 分数] [排名变化 ↑↓ 或 —]
  ```

- 排名变化：对比上周/上月排名（同期数据计算）
- 点击任意员工行 → 打开 `employee-detail-modal`，传入 `employeeId`
- 等级徽章样式：见 [4.1 等级体系](#41-xp-等级系统)

---

### Row 4 — 底部三栏

**分割比例**：1/3 + 1/3 + 1/3（`grid-cols-3`）

#### 左 1/3：30 天活跃热力图

**组件**：`ActivityHeatmap`（ECharts heatmap）

修复点：
- `visualMap.max` 改为**动态计算**：查询窗口期内最大单日任务数，取 `Math.max(maxCount, 1)`
- 日期范围：支持切换（最近 7 天 / 30 天 / 90 天）
- 查询优化：加 `WHERE startTime >= ? AND startTime < ?` 过滤，不再全量 fetch

交互：
- 点击某员工行 → 打开 `employee-detail-modal`，传入 `employeeId`
- 支持从团队效能图的 cross-filtering（接收 `selectedTeam` prop，过滤显示的员工行）

#### 中 1/3：成就动态 Feed

**组件**：`AchievementFeed`

- 最新 4-5 条成就动态
- 每条：

  ```
  [成就 emoji] [员工名，团队色] [成就名称] [获得时间，相对时间如"3天前"]
  ```

- 左边框颜色：员工所属团队色
- 成就数据：从成就计算函数动态生成（见 [4.3 成就徽章系统](#43-成就徽章系统)），取最近获得的 5 条
- 初始状态无成就时：显示 "暂无最新成就，努力完成任务吧！" 空态文案

#### 右 1/3：最近任务 Feed

**组件**：`TaskFeed`（增强版）

增强点：
- 添加 loading skeleton 和 error 状态
- 每条任务显示：任务名、状态标签、`qualityScore`（如 `⭐ 92`）、tokenUsage 估算 RMB（如 `≈ ¥0.12`）
- 点击任务 → 导航至 `/production?task=<taskId>`，生产看板高亮该任务

---

### 3.2 数据层改造

#### 共享数据函数

将数据查询逻辑从 `page.tsx` 和 API routes 中抽取为共享函数，放在 `src/lib/dashboard-data.ts`：

```ts
// 示例函数签名
export async function getDashboardSummary(month: string): Promise<DashboardSummary>
export async function getTeamStatusData(): Promise<TeamStatus[]>
export async function getKpiData(currentMonth: string, prevMonth: string): Promise<KpiData>
export async function getTeamEfficiencyTrend(months: string[]): Promise<TeamEfficiencyPoint[]>
export async function getHeatmapData(startDate: string, endDate: string): Promise<HeatmapEntry[]>
export async function getRecentAchievements(limit: number): Promise<AchievementEntry[]>
```

#### 类型定义

在 `src/lib/types.ts` 或 `src/lib/dashboard-types.ts` 中新增所有相关接口：

```ts
interface DashboardSummary {
  operationalIndex: number
  monthlyTaskCount: number
  successRate: number
  savedCost: number
}

interface TeamStatus {
  team: 'management' | 'design' | 'production'
  teamName: string // 中文名
  activeCount: number
  totalCount: number
  healthRate: number // 0-1
}

interface KpiData {
  employeeActive: { current: number; total: number; prevActive: number }
  taskCount: { current: number; prev: number }
  savedCost: { current: number; prev: number }
  avgQuality: { current: number; prev: number }
  skillInvocations: { current: number; prev: number }
  outputCount: { current: number; prev: number }
}

interface TeamEfficiencyPoint {
  month: string
  management: number
  design: number
  production: number
}

interface HeatmapEntry {
  employeeId: string
  employeeName: string
  team: string
  date: string
  count: number
}

interface AchievementEntry {
  employeeId: string
  employeeName: string
  team: string
  achievementKey: string
  achievementName: string
  achievementEmoji: string
  earnedAt: string // ISO date
}

// 全部移除 any，所有 props 使用明确类型
```

#### 消除重复逻辑

- `page.tsx`：调用 `getDashboardSummary()` 等共享函数，不直接写 SQL
- API routes（`/api/production-stats` 等）：同样调用共享函数
- `page.tsx` 不再 `fetch('/api/...')`，直接调用数据库函数（服务端组件优势）

---

## 4. 批次二：游戏化系统

> 核心原则：**所有游戏化数据从现有 9 张表动态计算，不新增任何数据库表**。XP、等级、Streak、成就均为派生值。

---

### 4.1 XP 等级系统

#### XP 计算公式

```ts
// XP 来源 1：任务完成奖励
const taskXp = completedTasks.reduce((sum, task) => {
  const base = 50
  const qualityBonus = base * (task.qualityScore / 100) // qualityScore 越高奖励越多
  return sum + base + qualityBonus
}, 0)

// XP 来源 2：连续活跃奖励（streak）
// 连续 1-6 天：+10 XP/天，连续 7+ 天：+20 XP/天
const streakXp = calculateStreakXp(activeDays) // activeDays: 按天去重的任务日期数组

// 总 XP
const totalXp = taskXp + streakXp
```

**数据来源**：

- 完成任务数：`tasks` 表，`WHERE employeeId = ? AND status = 'completed'`
- `qualityScore`：`tasks.qualityScore`
- 活跃天数：`tasks.startTime` 按天 `GROUP BY DATE(startTime)` 去重

#### 等级体系

升级公式：`xpForLevel(n) = 200 × 1.5^(n-1)`

| 等级范围 | 称号 | 图标 | 颜色 |
|---|---|---|---|
| Lv.1–3 | 新手 | 🌱 | `#94a3b8`（灰绿）|
| Lv.4–6 | 熟练 | ⚡ | `#3b82f6`（蓝）|
| Lv.7–9 | 精英 | 🔥 | `#f97316`（橙）|
| Lv.10–12 | 大师 | 💎 | `#8b5cf6`（紫）|
| Lv.13+ | 传奇 | 👑 | `#f59e0b`（金）|

#### 工具函数（`src/lib/gamification.ts`）

```ts
export function calculateXp(employeeId: string, tasks: CompletedTask[], activeDays: string[]): number
export function calculateLevel(xp: number): { level: number; title: string; emoji: string; color: string; progress: number; xpToNext: number }
export function xpForLevel(n: number): number
export function calculateStreak(activeDays: string[]): number
export function calculateAchievements(employee: Employee, tasks: Task[], skills: Skill[]): Achievement[]
```

#### 展示位置

| 位置 | 展示内容 |
|---|---|
| 员工头像外环 | SVG 等级进度环（渐变色，`progress` 百分比）|
| 驾驶舱排行榜 | 等级徽章（`Lv.N 🔥` 格式）|
| 组织架构节点 | SVG 等级进度环（同上，缩小版）|
| 花名册员工卡片 | 右上角等级徽章 pill |

---

### 4.2 Streak 连续活跃系统

#### 计算规则

```ts
// 员工当天有至少 1 个任务（startTime 当天）即算活跃
// 从最近一天向前连续计算，遇到断档即停止
function calculateStreak(activeDays: string[]): number {
  const sorted = [...activeDays].sort().reverse() // 从新到旧
  let streak = 0
  let expected = today()
  for (const day of sorted) {
    if (day === expected) {
      streak++
      expected = prevDay(expected)
    } else {
      break
    }
  }
  return streak
}
```

#### 展示格式

- `🔥 N 天`（streak ≥ 1）
- 灰色 `— 天`（streak = 0）

#### 展示位置

- 员工详情 modal 基本信息区
- 组织架构自定义节点徽章行
- 驾驶舱排行榜每行

---

### 4.3 成就徽章系统

8 个初始成就，全部**动态计算**，不需要新表。

| # | 成就名 | emoji | 判定规则 | 数据来源 |
|---|---|---|---|---|
| 1 | 首个满分 | 🎯 | 首次 `qualityScore = 100` | `tasks` |
| 2 | 七日之焰 | 🔥 | 连续 7 天活跃（streak ≥ 7）| `tasks.startTime` |
| 3 | 闪电手 | ⚡ | 单日完成 ≥ 5 个任务 | `tasks` GROUP BY DATE |
| 4 | 月度 MVP | 🏆 | 当月 XP 排行第一 | 动态计算所有员工 XP |
| 5 | 完美主义 | 💯 | 连续 10 个已完成任务 `qualityScore > 90` | `tasks` ORDER BY completedAt |
| 6 | 全能选手 | 🎨 | 拥有 ≥ 5 个技能（`skills` 表）| `skills` COUNT |
| 7 | 团队之星 | 🤝 | 暂缺跨团队协作数据 → 用任务多样性替代（参与 ≥ 3 种任务类型）| `tasks.taskType` |
| 8 | 成长飞速 | 📈 | 单月升 ≥ 3 级（月初 XP vs 月末 XP 对应等级差）| 历史 XP 计算 |

#### 成就判定函数

```ts
// 返回该员工已获得的成就列表（包含获得时间）
export function calculateAchievements(
  employee: Employee,
  allTasks: Task[],
  skills: Skill[]
): Achievement[]

interface Achievement {
  key: string        // e.g. "first_perfect"
  name: string       // e.g. "首个满分"
  emoji: string
  earnedAt: string   // ISO date（从任务数据推算首次满足条件的时间）
}
```

#### 展示位置

- 驾驶舱 Row 4 中间：最新 5 条成就 Feed
- 员工详情 modal：成就徽章栏（横排 pill 列表，已获得高亮，未获得灰显）

---

## 5. 批次三：组织架构重设计

### 5.1 页面结构

```
/org 页面
├── loading.tsx（新增，骨架屏）
├── page.tsx（服务端，查询员工+XP+Streak数据，传给 OrgClient）
└── components/
    ├── org-chart-client.tsx（"use client"，React Flow 画布）
    ├── employee-node.tsx（自定义节点组件）
    ├── org-controls.tsx（顶部控制栏）
    └── org-legend.tsx（底部图例）
```

### 5.2 顶部控制栏（`OrgControls`）

```
[标题：AI 团队组织架构] ←→ [视图切换：力导向图 ● | 网格视图（即将推出）] [缩放 + -] [筛选下拉：全部团队 / 管理 / 设计 / 生产] [状态筛选：全部 / 在职 / 培训中 / 规划中 / 离职]
```

- 视图切换：网格视图按钮禁用态，`tooltip="即将推出"`
- 缩放：调用 React Flow 的 `zoomIn()` / `zoomOut()` / `fitView()`
- 筛选：改变节点的 `opacity`（非选中：0.2，选中：1.0），不重新布局

### 5.3 布局算法

**替代硬编码坐标，使用逻辑分组布局**：

- 三团队形成三个自然聚类区域
- 布局策略：`d3-force` 力导向（如项目已有 d3 依赖）或手动分区布局（无需 d3 时的备选）
- 手动分区备选（`x` 按团队偏移，`y` 按职级偏移）：

  ```ts
  const TEAM_X = { management: 200, design: 700, production: 1200 }
  const LEVEL_Y = { manager: 100, lead: 250, member: 400, junior: 550 }
  // 同层员工水平排列，spacing = 160px
  ```

- 团队区域背景云：`<div>` 绝对定位，`opacity: 0.05`，`border-radius: 24px`，颜色为团队色，用 React Flow 的 `Background` 或自定义 panel 实现

**连线规则**：

| 连线类型 | 样式 |
|---|---|
| 团队内层级连线 | 实线，团队色，`strokeWidth: 1.5` |
| 跨团队协作连线 | 虚线 `strokeDasharray: "5,5"`，颜色 `#94a3b8`，`strokeWidth: 1` |
| 直属汇报线 | 实线加粗，`strokeWidth: 2` |

**节点大小三档**（通过 CSS class 控制）：

| 档位 | 条件 | 尺寸 |
|---|---|---|
| 大 | 管理团队核心（title 含"总监"/"负责人"）| `128px × 160px` |
| 中 | 一般员工 | `108px × 140px` |
| 小 | `status = 'planned'` | `88px × 120px` |

### 5.4 自定义节点组件（`EmployeeNode`）

**替代 React Flow 默认节点**，完整展示员工信息。

组件结构（从上到下）：

```
┌─────────────────────────────┐  ← glassmorphism 卡片，团队色边框 2px
│  [SVG 等级进度环]              │
│  ┌──────┐                    │
│  │ 头像 │  ← AiAvatar 组件    │
│  └──────┘                    │
│  [姓名，14px bold]             │
│  [职位，11px 辅色]             │
│  [状态点 ● + 状态文字，11px]   │
│  [Lv.N 徽章] [MBTI] [🔥N天]   │  ← 徽章行
│  [性格标签1] [性格标签2]       │  ← persona.personality 前2个
└─────────────────────────────┘
```

**状态点颜色映射**：

| status | 颜色 | 文字 |
|---|---|---|
| active | `#22c55e` | 在职 |
| developing | `#f59e0b` | 培训中 |
| planned | `#94a3b8` | 规划中 |
| inactive | `#ef4444` | 离职 |

**SVG 等级进度环**：

```tsx
// 使用 SVG circle + strokeDasharray 实现进度环
<svg viewBox="0 0 100 100" className="absolute -inset-1">
  <circle cx="50" cy="50" r="48" fill="none" stroke="#e2e8f0" strokeWidth="3" />
  <circle
    cx="50" cy="50" r="48" fill="none"
    stroke={levelColor}
    strokeWidth="3"
    strokeDasharray={`${progress * 301.6} 301.6`}
    strokeLinecap="round"
    transform="rotate(-90 50 50)"
  />
</svg>
// 301.6 ≈ 2π × 48
```

**数据字段**（节点 `data` prop）：

```ts
interface EmployeeNodeData {
  id: string
  name: string
  title: string
  team: 'management' | 'design' | 'production'
  status: 'active' | 'developing' | 'planned' | 'inactive'
  avatar: string | null
  persona: EmployeePersona | null
  xp: number
  level: number
  levelColor: string
  levelProgress: number  // 0-1，当前级别内进度
  streak: number
  monthlyTaskCount: number
}
```

### 5.5 交互行为

#### Hover

- 节点：`scale(1.05)`，`z-index` 提升，`transition 200ms`
- Tooltip（React Flow `NodeToolbar` 或自定义 `Popover`）显示：

  ```
  本月任务：N 个
  平均质量：N 分
  XP：N 分
  ```

#### 点击

- 打开 `employee-detail-modal`（复用花名册组件，提升为共享组件）
- 传入 `employeeId`

#### 拖拽

- React Flow 内置节点拖拽，启用 `draggable={true}`（默认已支持）
- 拖拽后其他节点通过力导向自然响应（如使用 d3-force 布局）
- 拖拽后位置存储在组件 state（不持久化）

#### 团队筛选

- 非选中团队节点：`opacity: 0.2`，`pointer-events: none`
- 选中团队节点：`opacity: 1`，`fitView({ padding: 0.2, nodes: selectedTeamNodes })`

#### URL 参数处理（从驾驶舱跳入）

- `/org?team=management`：自动筛选管理团队，fitView 居中
- `/org?highlight=<employeeId>`：高亮该员工节点（`border-color: #f59e0b`，轻微放大），自动 fitView 居中

### 5.6 底部图例（`OrgLegend`）

```
节点大小：● 核心管理层  · 普通员工  · 规划中
连线：—— 直属汇报  --- 协作关系
状态：● 在职  ● 培训中  ● 规划中  ● 离职
团队：■ 管理  ■ 设计  ■ 生产
```

### 5.7 loading.tsx

提供 `/org` 页面骨架屏：

- 控制栏骨架（灰色矩形）
- 画布区域：随机分布的员工节点骨架（圆角矩形，`animate-pulse`）
- 大约 8-10 个节点骨架，模拟力导向布局分布

### 5.8 数据查询扩展

原始查询只取 `id/name/title/team/status`，新增字段：

```ts
// page.tsx 服务端查询
const employees = await db.select({
  id: employees.id,
  name: employees.name,
  title: employees.title,
  team: employees.team,
  status: employees.status,
  avatar: employees.avatar,
  persona: employees.persona,  // 新增
}).from(employees)

// 额外查询：每位员工的完成任务、技能、活跃天数，用于计算 XP/streak
// 在 page.tsx 中并行查询，传给客户端组件
```

---

## 6. 批次四：联动跳转系统

### 6.1 跳转路径总表

#### 驾驶舱 → 其他页面

| 触发元素 | 目标 URL | 备注 |
|---|---|---|
| KPI 卡片 "AI 员工" | `/roster` | `router.push` |
| KPI 卡片 "本月任务量" | `/production` | `router.push` |
| KPI 卡片 "节省成本" | `/dashboard#cost-detail` | 页内滚动 |
| KPI 卡片 "平均质量分" | `/production?sort=quality` | searchParam |
| KPI 卡片 "技能调用量" | 展开 Sheet/Popover（无页面跳转）| 页内交互 |
| KPI 卡片 "产出物数量" | 展开 Sheet/Popover（无页面跳转）| 页内交互 |
| 团队状态卡（右 40% 区域）| `/org?team=<teamName>` | searchParam |
| 团队效能对比图（点击柱状）| `/org?team=<teamName>` | searchParam |
| 热力图某员工行点击 | 打开 `employee-detail-modal` | Modal，无跳转 |
| 排行榜某员工行点击 | 打开 `employee-detail-modal` | Modal，无跳转 |
| 最近任务某条点击 | `/production?task=<taskId>` | searchParam |

#### 其他页面 → 驾驶舱

| 触发元素 | 目标 | 备注 |
|---|---|---|
| 员工详情 modal 指标区域 | `/dashboard?focus=metrics&employee=<id>` | 可选：高亮该员工相关指标 |
| 生产看板顶部统计摘要 | `/dashboard` | 简单 `router.push` |

#### 跨页面联动

| 触发元素 | 目标 | 备注 |
|---|---|---|
| 组织架构节点点击 | 打开 `employee-detail-modal` | Modal，复用 |
| 花名册员工卡片 "查看任务" 按钮 | `/production?employee=<id>` | searchParam |
| 驾驶舱团队效能图 → 热力图 | cross-filtering（页内）| 无 URL 跳转，state 联动 |

### 6.2 employee-detail-modal 提升为共享组件

**当前位置**：`src/components/roster/employee-detail-modal.tsx`（推测）

**目标位置**：`src/components/shared/employee-detail-modal.tsx`

**改造要点**：

```ts
// 提升为接受 employeeId 的独立 Modal
interface EmployeeDetailModalProps {
  employeeId: string | null   // null = 关闭
  onClose: () => void
}

// 内部自行 fetch /api/employees/[id] 获取完整数据
// 不依赖外部传入 employee 对象（方便从任意页面调用）
```

**调用方式**（各页面通用模式）：

```tsx
const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

// 某处点击后：
setSelectedEmployeeId(employee.id)

// Modal 组件：
<EmployeeDetailModal
  employeeId={selectedEmployeeId}
  onClose={() => setSelectedEmployeeId(null)}
/>
```

### 6.3 searchParams 处理规范

**页面读取 searchParams**（服务端组件）：

```tsx
// page.tsx
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; highlight?: string; task?: string; sort?: string }>
}) {
  const { team, highlight } = await searchParams
  // 传给客户端组件做初始状态
}
```

**客户端导航**：

```tsx
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/org?team=management')  // SPA 跳转，不刷新页面
```

### 6.4 Cross-filtering 实现（驾驶舱内）

团队效能图 → 热力图的联动，通过**提升 state** 实现：

```tsx
// DashboardClient.tsx（顶层客户端组件）
const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

// 传给子组件
<TeamEfficiencyChart onTeamClick={setSelectedTeam} selectedTeam={selectedTeam} />
<ActivityHeatmap filterTeam={selectedTeam} />
```

---

## 7. 不做的事情（显式延迟）

以下功能**明确不在本次迭代范围内**，后续版本再议：

| 功能 | 原因 |
|---|---|
| 暗色主题 / 主题切换 | CLAUDE.md 说明暗色值尚未定义，基础工作未完成 |
| 天赋树系统 | 过重，需要独立功能规划 |
| 任务回放功能 | 需要额外数据记录，影响范围大 |
| 新增数据库表（XP 表、成就表、streak 表）| 所有数据从现有表动态计算，无需新表 |
| 数据管理中心侧边栏入口 | 不在本次范围，保持 sidebar 稳定 |
| 组织架构网格视图实现 | 视图切换按钮可放，但标记"即将推出"禁用态 |
| 员工详情 modal 的指标跳转驾驶舱 | 可选增强，不阻塞主线 |

---

## 附录：文件变更预期

### 批次一（驾驶舱）

| 文件 | 操作 |
|---|---|
| `src/app/dashboard/page.tsx` | 重写，调用共享数据函数 |
| `src/lib/dashboard-data.ts` | 新建，所有数据查询函数 |
| `src/lib/dashboard-types.ts` | 新建或合并进 `types.ts` |
| `src/components/dashboard/operational-index-gauge.tsx` | 新建 |
| `src/components/dashboard/team-status-panel.tsx` | 新建 |
| `src/components/dashboard/kpi-card.tsx` | 重写 |
| `src/components/dashboard/team-efficiency-chart.tsx` | 新建或重写 |
| `src/components/dashboard/leaderboard-panel.tsx` | 新建 |
| `src/components/dashboard/activity-heatmap.tsx` | 修改（修复 max、加过滤）|
| `src/components/dashboard/achievement-feed.tsx` | 新建 |
| `src/components/dashboard/task-feed.tsx` | 修改（增强）|

### 批次二（游戏化）

| 文件 | 操作 |
|---|---|
| `src/lib/gamification.ts` | 新建，所有 XP/Level/Streak/Achievement 函数 |

### 批次三（组织架构）

| 文件 | 操作 |
|---|---|
| `src/app/org/loading.tsx` | 新建 |
| `src/app/org/page.tsx` | 重写 |
| `src/components/org/org-chart-client.tsx` | 重写 `org-chart.tsx` |
| `src/components/org/employee-node.tsx` | 新建 |
| `src/components/org/org-controls.tsx` | 新建 |
| `src/components/org/org-legend.tsx` | 新建 |

### 批次四（联动）

| 文件 | 操作 |
|---|---|
| `src/components/shared/employee-detail-modal.tsx` | 移动 + 重构（自行 fetch）|
| 各页面引用 modal 的地方 | 更新 import 路径 |
| 各页面 searchParams 处理 | 按规范添加 |

---

*文档结束。下一步：确认批次一范围，开始实现数据层改造和 Bento Grid 布局。*
