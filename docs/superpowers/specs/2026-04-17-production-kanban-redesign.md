# 生产看板重构设计文档

## 概述

重构 `/production` 生产看板页面，从当前简单的卡片网格+历史表格升级为仪表盘+双面板布局，增加 SOP 执行流程可视化、任务质量指标、执行反思、产出预览、ECharts 数据看板等功能。

## 设计决策记录

| 决策项 | 选择 | 备选 |
|--------|------|------|
| 整体布局 | 仪表盘 + 双面板 | 看板列视图；可折叠 Dashboard + 网格 |
| 任务详情弹窗 | 精简指标 + Tab 分区 | 双栏布局弹窗 |
| SOP 数据存储 | 新建 task_steps 表 | 扩展 metadata JSON；纯前端模拟 |
| 数据看板图表 | 趋势+分布+排行（联动） | 热力图+趋势+分布 |

## 一、数据库变更

### 1.1 新增 `task_steps` 表

```typescript
export const taskSteps = sqliteTable("task_steps", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["pending", "running", "completed", "failed", "skipped"] }).notNull().default("pending"),
  thought: text("thought"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
```

### 1.2 扩展 `tasks` 表（新增列）

```typescript
qualityScore: integer("quality_score"),    // 0-100，完成后填入
retryCount: integer("retry_count").default(0),
tokenUsage: integer("token_usage"),        // token 消耗量
reflection: text("reflection"),            // 执行反思 JSON 字符串，结构为 { problems, lessons, improvements }，完成后 AI 自评
```

### 1.3 类型定义更新

在 `src/lib/types.ts` 中新增：

```typescript
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
```

扩展现有 `Task` 接口，增加 `qualityScore`、`retryCount`、`tokenUsage`、`reflection` 字段。

## 二、页面整体布局

### 2.1 页面结构（自上而下）

```
┌─────────────────────────────────────────────────────┐
│ 页头: 生产看板 + 副标题 + 时间范围选择器              │
├─────────────────────────────────────────────────────┤
│ Stat 行: [今日任务] [完成率] [执行中] [平均质量分]    │
├─────────────────────────────────────────────────────┤
│ Tab: [ 实时看板 | 数据面板 | 历史记录 ]              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tab 内容区（见各 Tab 详细设计）                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.2 时间范围选择器

- 位置：页头右侧
- 选项：今日 / 7日 / 30日
- 作用：控制 stat 行数据和数据面板图表的时间范围
- 实现：React state `timeRange: "today" | "7d" | "30d"`，通过 URL search params 或 state 传递

### 2.3 Stat 卡片行

4 个统计卡片横排，每个包含：
- 左侧图标（带主题色背景圆角方块）
- 右侧：数值（大字）+ 标签（小字）+ 趋势（↑↓ + 对比文字，如"较昨日 +3"）

| 卡片 | 图标 | 数值 | 趋势对比 |
|------|------|------|----------|
| 今日任务 | 📋 ClipboardList | count | 较昨日 |
| 完成率 | ✅ CheckCircle | percentage | 较昨日 |
| 执行中 | 🔄 Loader | count | 实时 |
| 平均质量分 | ⭐ Star | score/100 | 较上周 |

## 三、实时看板 Tab

### 3.1 布局

```
┌──────────────────────────┬─────────────────────┐
│ 执行中任务列表 (flex: 3) │ 侧栏数据 (flex: 2) │
│                          │                     │
│ [任务卡片]               │ [mini 产出趋势图]   │
│ [任务卡片]               │ [员工排行 top5]     │
│ [任务卡片]               │                     │
│ ...                      │                     │
└──────────────────────────┴─────────────────────┘
```

### 3.2 执行中任务卡片

每张卡片结构：
```
┌──────────────────────────────────────┐
│ 任务名称 #ID        [执行中] badge   │
│ AI员工名称 · 任务类型     进度 79%   │
│                                      │
│ ●──✓──✓──✓──●(蓝)──○──○             │
│         当前步骤: 数据汇总分析        │
└──────────────────────────────────────┘
```

- 顶部行：任务名称（font-semibold）+ ID 灰色小字 + 状态 Badge
- 第二行：AI 员工名 + 任务类型 pill + 右侧进度百分比大字
- Mini SOP stepper：水平排列的圆点+连线
  - 已完成步骤：绿色实心圆 ✓
  - 当前步骤：蓝色实心圆 + 脉冲动画（CSS `animate-pulse`）
  - 待执行步骤：灰色空心圆
- 最下方：当前步骤名称文字，蓝色
- 整张卡片 `cursor-pointer`，点击打开详情弹窗
- 卡片左侧边框颜色按团队区分（管理紫 / 设计蓝 / 生产绿）

### 3.3 侧栏

- **Mini 产出趋势**：小型柱状图（ECharts mini chart），最近 7 天每日完成任务数
- **员工排行 Top5**：水平进度条列表，显示员工名 + 产出数 + 进度条

### 3.4 空状态

当没有执行中任务时，显示居中的空状态插图 + 文字"当前没有执行中的任务"

## 四、任务详情弹窗

### 4.1 基本结构

- 组件：shadcn Dialog（居中弹窗）
- 宽度：`max-w-2xl`（~640px）
- 高度：`max-h-[80vh]`，内容区域可滚动
- 数据获取：从 `/api/tasks/[taskId]` 获取，API 需扩展返回 steps 数据

### 4.2 弹窗内部结构

```
┌─────────────────────────────────────────────┐
│ 任务名称 #895                    [已完成] ✕ │
│ AI绩效评估员 · 绩效评估                     │
├─────────────────────────────────────────────┤
│ [质量 92] [耗时 12m] [重试 0] [Token 3.2k]  │
├─────────────────────────────────────────────┤
│ [ 执行步骤 | 产出内容 | 执行反思 ]           │
├─────────────────────────────────────────────┤
│                                             │
│  Tab 内容区（可滚动）                        │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.3 指标行

4 个 stat cell 等宽横排，分隔线分割：

| 指标 | 显示 | 辅助信息 | 颜色逻辑 |
|------|------|----------|----------|
| 质量评分 | 数字 0-100 | "↑ 高于均值" 或 "↓ 低于均值" | ≥80 绿，60-79 黄，<60 红 |
| 执行耗时 | Xm Xs | "预估 Ym" | 超时红，提前绿 |
| 重试次数 | 数字 | "一次通过" 或 "重试 N 次" | 0 绿，≥1 黄，≥3 红 |
| Token 用量 | X.Xk | "约 ¥X.XX" | 纯展示 |

执行中任务：质量评分显示"—"，其他实时更新。

### 4.4 执行步骤 Tab

垂直步骤条（Vertical Stepper），每步结构：

```
● 1. 数据收集                    2m 30s  ✓
│    从 metrics 表中提取近 3 个月数据...
│
│  ┌────────────────────────────────────┐
│  │ 💭 COT 思考（点击展开/折叠）         │
│  │ 需要综合考虑任务完成率和质量评分...   │
│  └────────────────────────────────────┘
│
● 2. 指标计算                    3m 15s  ✓
│
◉ 3. 数据汇总（当前步骤，蓝色脉冲）  执行中...
│
○ 4. 报告生成                    待执行
│
○ 5. 审核校验                    待执行
```

- 步骤圆点：已完成=绿色实心+✓，当前=蓝色+脉冲，待执行=灰色空心，失败=红色+✕，跳过=灰色+—
- 连接线：已完成段绿色，当前段蓝色，待执行段灰色虚线
- 步骤名称 + 右侧耗时（已完成步骤显示实际耗时，当前步骤显示"执行中..."）
- COT 思考：默认折叠，点击展开。灰底卡片样式，左侧 2px 灰色边框，💭 图标
- 当 thought 为 null 时不显示展开按钮

### 4.5 产出内容 Tab

列表展示，每条产出一行：

```
┌──────────────────────────────────────────────┐
│ 📄 绩效评估报告 v1.0    [document]  14:30    │
│                              [预览] [下载]   │
├──────────────────────────────────────────────┤
│ 📊 评估数据汇总表        [report]   14:28    │
│                              [预览] [下载]   │
├──────────────────────────────────────────────┤
│ 📝 原始访谈记录          [document]  14:25    │
│                              [预览]          │
└──────────────────────────────────────────────┘
```

- 图标按类型：document=📄 FileText，report=📊 BarChart，media=🎬 Film，resource=📁 FolderOpen，other=📎 Paperclip
- 类型 Badge（颜色区分）
- 操作按钮：
  - **预览**：点击打开嵌套弹窗
    - 纯文本内容（content 字段）：在弹窗中直接渲染文本
    - 文件类（url 字段）：iframe 预览或图片 lightbox
    - 视频类：video 标签播放
  - **下载**：仅在有 url 时显示，触发浏览器下载
- 空状态："暂无产出记录"

### 4.6 执行反思 Tab

仅已完成任务显示此 Tab（执行中/失败任务 Tab 灰显不可点）。

反思内容来自 `tasks.reflection` 字段（JSON 结构），解析为三个区块：

```json
{
  "problems": "发现的问题文本...",
  "lessons": "踩的坑和经验教训...",
  "improvements": "后续改进建议..."
}
```

UI 呈现为三个折叠卡片，默认展开：

```
┌─ ⚠️ 发现的问题 ──────────────────────────┐
│ (黄色左边框)                              │
│ 部分员工的历史数据存在缺失，导致绩效计算   │
│ 时需要额外的数据补全处理...               │
└───────────────────────────────────────────┘

┌─ 🔴 踩过的坑 ─────────────────────────────┐
│ (红色左边框)                              │
│ 初始方案中使用了简单平均，未考虑到不同     │
│ 指标的权重差异，导致结果偏差...           │
└───────────────────────────────────────────┘

┌─ 💡 改进建议 ─────────────────────────────┐
│ (绿色左边框)                              │
│ 1. 建议增加数据完整性校验步骤             │
│ 2. 引入加权评分模型替代简单平均           │
│ 3. 为异常数据增加标注机制                 │
└───────────────────────────────────────────┘
```

## 五、数据面板 Tab

### 5.1 布局

```
┌───────────────────────────────┬───────────────────┐
│ 堆叠柱状图 (flex: 3)         │ 饼图 (flex: 2)    │
│ 任务产出趋势（按团队）        │ 任务类型分布       │
│                               │                   │
│                               ├───────────────────┤
│                               │ 仪表盘 Gauge      │
│                               │ 平均质量评分       │
├───────────────────────────────┴───────────────────┤
│ 水平柱状图（全宽）                                 │
│ 员工产出排行 Top 10                                │
└───────────────────────────────────────────────────┘
```

### 5.2 图表详细规格

**堆叠柱状图（主图）：**
- X 轴：日期（根据时间范围动态）
- Y 轴：任务完成数
- 系列：管理团队（紫 #8b5cf6）、设计团队（蓝 #3b82f6）、生产团队（绿 #22c55e）
- 交互：点击某天的柱子 → 更新 `selectedDate` state → 饼图和排行图联动到该日数据
- ECharts 配置：`series.type: 'bar'`, `stack: 'total'`, `emphasis.focus: 'series'`

**环形饼图：**
- 数据：任务类型分布（绩效评估、内容生产、审核审批、需求分析、其他）
- 中心显示总数
- 响应 `selectedDate` 联动
- ECharts 配置：`series.type: 'pie'`, `radius: ['40%', '70%']`

**仪表盘 Gauge：**
- 数值：平均质量评分（0-100）
- 渐变色条：红(<60) → 黄(60-80) → 绿(>80)
- 显示数值 + 趋势（较上周 ↑/↓）
- 响应 `selectedDate` 联动
- ECharts 配置：`series.type: 'gauge'`

**水平柱状图：**
- 数据：员工产出数排行 Top 10
- 柱子颜色按团队（紫/蓝/绿）
- 显示员工名 + 产出数
- 交互：点击某员工柱子 → 更新 `selectedEmployee` state → 在实时看板 Tab 中筛选该员工任务
- 响应 `selectedDate` 联动
- ECharts 配置：`series.type: 'bar'`, `orient: 'horizontal'`

### 5.3 联动机制

```typescript
// 数据面板状态
interface DashboardState {
  selectedDate: string | null;     // 点击柱状图某天
  selectedEmployee: string | null; // 点击排行某员工
}
```

- 堆叠柱状图 `click` → set `selectedDate` → 饼图/Gauge/排行图用该日数据重新请求或前端过滤
- 排行柱状图 `click` → set `selectedEmployee` → 切换到实时看板 Tab 并按该员工筛选
- 时间范围选择器变更 → 所有图表重新获取数据，清空联动状态
- 再次点击已选中的柱子 → 取消选中，恢复全量数据

## 六、历史记录 Tab

保留现有 `TaskHistoryTable` 的筛选+表格功能，增强：
- 行点击 → 打开任务详情弹窗（共用弹窗组件），不再跳转 `/production/[taskId]`
- 新增质量评分列
- 保留 `/production/[taskId]` 路由作为直接访问入口（SEO/分享），但常规交互使用弹窗

## 七、API 变更

### 7.1 扩展 `GET /api/tasks`

响应增加 `qualityScore`、`retryCount`、`tokenUsage` 字段。

新增查询参数：
- `dateStart`、`dateEnd`：时间范围过滤
- `employeeId`：按员工过滤

### 7.2 扩展 `GET /api/tasks/[taskId]`

响应增加：
- `steps: TaskStep[]`（按 stepOrder 排序）
- `qualityScore`、`retryCount`、`tokenUsage`、`reflection` 字段

### 7.3 新增 `GET /api/tasks/stats`

用于 stat 卡片行和数据面板图表数据：

```typescript
// 查询参数: timeRange=today|7d|30d, date=YYYY-MM-DD (可选，联动用)
{
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    runningTasks: number;
    avgQualityScore: number;
    trends: { /* 对比数据 */ }
  },
  dailyTrend: Array<{ date: string; management: number; design: number; production: number }>,
  typeDistribution: Array<{ type: string; count: number }>,
  employeeRanking: Array<{ employeeId: string; name: string; team: string; count: number }>,
}
```

## 八、种子数据

需为新增结构生成模拟数据（在 `src/db/seed.ts` 中扩展）：

### 8.1 task_steps 数据

为每个现有任务生成 3-7 个 SOP 步骤：
- 已完成任务：所有步骤 status="completed"，填入 thought 和时间
- 执行中任务：前 N 步 completed，当前步 running，其余 pending
- 失败任务：前 N 步 completed，某步 failed，其余 skipped

步骤名称按任务类型生成中文名（如绩效评估类："数据收集" → "指标计算" → "综合评分" → "报告生成" → "审核校验"）。

COT 思考内容：每步 1-3 句中文，描述该步骤的思考过程。

### 8.2 tasks 扩展字段数据

- `quality_score`：已完成任务随机 70-98，失败任务 null
- `retry_count`：大部分 0，少量 1-2
- `token_usage`：1000-8000 随机
- `reflection`：已完成任务生成 JSON 格式反思文本（problems/lessons/improvements 三段），30% 任务有 reflection

### 8.3 task_outputs 补充数据

为已完成任务生成 1-4 个产出：
- 类型分布：document (40%)、report (30%)、resource (15%)、media (10%)、other (5%)
- title：中文标题
- content：文本产出填入 200-500 字中文模拟内容
- url：文件类产出填入模拟文件路径

## 九、新增组件清单

| 组件 | 路径 | 类型 | 职责 |
|------|------|------|------|
| ProductionStats | `src/components/production/production-stats.tsx` | client | Stat 卡片行 |
| ProductionTabs | `src/components/production/production-tabs.tsx` | client | Tab 切换容器 |
| RunningTaskCard | `src/components/production/running-task-card.tsx` | client | 执行中任务卡片（含 mini stepper） |
| TaskDetailDialog | `src/components/production/task-detail-dialog.tsx` | client | 任务详情弹窗 |
| StepsStepper | `src/components/production/steps-stepper.tsx` | client | 垂直步骤条 |
| OutputsList | `src/components/production/outputs-list.tsx` | client | 产出内容列表 |
| OutputPreviewDialog | `src/components/production/output-preview-dialog.tsx` | client | 产出预览嵌套弹窗 |
| ReflectionPanel | `src/components/production/reflection-panel.tsx` | client | 执行反思区域 |
| ProductionDashboard | `src/components/production/production-dashboard.tsx` | client | 数据面板（ECharts 容器） |
| TrendChart | `src/components/production/charts/trend-chart.tsx` | client | 堆叠柱状图 |
| TypeDistributionChart | `src/components/production/charts/type-distribution-chart.tsx` | client | 环形饼图 |
| QualityGauge | `src/components/production/charts/quality-gauge.tsx` | client | 质量仪表盘 |
| EmployeeRankingChart | `src/components/production/charts/employee-ranking-chart.tsx` | client | 员工排行柱状图 |

## 十、需改造的现有文件

| 文件 | 变更 |
|------|------|
| `src/db/schema.ts` | 新增 taskSteps 表，tasks 表增加 4 列 |
| `src/lib/types.ts` | 新增 TaskStep 接口，扩展 Task 接口 |
| `src/app/production/page.tsx` | 重构页面布局，使用新组件 |
| `src/components/production/running-tasks-panel.tsx` | 重构为带 mini stepper 的卡片列表 |
| `src/components/production/task-history-table.tsx` | 行点击改为打开弹窗 |
| `src/components/production/task-detail.tsx` | 可保留用于 `/production/[taskId]` 路由 |
| `src/app/api/tasks/route.ts` | 扩展查询参数和响应字段 |
| `src/app/api/tasks/[taskId]/route.ts` | 响应增加 steps 数据 |
| `src/db/seed.ts` | 扩展种子数据生成逻辑 |

## 十一、不在范围内

- 拖拽排序 / 看板列间拖拽
- WebSocket / SSE 实时推送（继续使用轮询）
- 暗色模式适配
- 移动端响应式
- 任务创建/编辑功能
- 权限控制
