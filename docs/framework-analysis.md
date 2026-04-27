# AI Workforce Platform 框架分析文档

> 生成日期：2026-04-27 | 基于项目源码静态分析

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [路由与页面架构](#4-路由与页面架构)
5. [数据库与数据层](#5-数据库与数据层)
6. [API 路由设计](#6-api-路由设计)
7. [组件体系](#7-组件体系)
8. [样式系统](#8-样式系统)
9. [数据流模式](#9-数据流模式)
10. [部署架构](#10-部署架构)
11. [开发规范与约定](#11-开发规范与约定)
12. [架构图](#12-架构图)

---

## 1. 项目概览

**AI Workforce Platform** 是一个内部管理仪表盘，用于管理一个由 24 名 AI 员工组成的团队，涵盖管理层、设计层和生产层三条业务线。

| 属性 | 值 |
|------|----|
| 项目名 | `ai-workforce-platform` |
| 版本 | 0.1.0 |
| 框架 | Next.js 16.2.4 (App Router) |
| 语言 | TypeScript 5.x |
| UI 语言 | 中文 |
| 数据库 | SQLite (local.db) |
| 测试框架 | 无 |
| 代码格式化 | 无 Prettier |
| 包管理 | npm |

### 核心功能模块

- **驾驶舱 (Dashboard)** — KPI 仪表盘，包含热力图、团队对比、任务动态、排行榜、运营指数仪表盘
- **AI 花名册 (Roster)** — 员工网格展示，支持筛选，点击打开详情 Dialog
- **生产看板 (Production)** — 生产任务看板（实时/仪表盘/历史），任务卡片含 SOP 步骤器
- **组织架构 (Org)** — 基于 React Flow 的交互式组织架构图
- **系统设置 (Settings)** — 员工管理、指标配置、数据管理中心、帮助文档管理
- **帮助中心 (Help)** — 侧滑面板，Tiptap 富文本编辑器

---

## 2. 技术栈

### 核心框架

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.4 | 全栈框架 (App Router, RSC, API Routes) |
| React | 19.2.4 | UI 库 |
| TypeScript | 5.x | 类型安全 |

> ⚠️ **Next.js 16 警告**：此项目使用 Next.js 16，存在与早期版本的 Breaking Changes。编写 Next.js 相关代码前应参考 `node_modules/next/dist/docs/01-app/`。

### UI 层

| 技术 | 版本 | 用途 |
|------|------|------|
| Tailwind CSS | v4 | 原子化 CSS（`@theme inline` + `@custom-variant` 语法，无 tailwind.config.js） |
| shadcn/ui | 4.2.0 | 组件库（基于 `@base-ui/react`，**非 Radix**） |
| lucide-react | 1.8.0 | 图标库 |
| tw-animate-css | 1.4.0 | 动画工具类 |
| class-variance-authority | 0.7.1 | 变体样式管理 |
| clsx + tailwind-merge | — | 类名合并工具 (`cn()`) |

### 数据可视化

| 技术 | 版本 | 用途 |
|------|------|------|
| ECharts | 6.0.0 | 图表（热力图、趋势图、仪表盘、饼图等） |
| echarts-for-react | 3.0.6 | React 封装 |
| @xyflow/react | 12.10.2 | React Flow 组织架构图 |

### 数据层

| 技术 | 版本 | 用途 |
|------|------|------|
| better-sqlite3 | 12.9.0 | SQLite 驱动（WAL 模式） |
| Drizzle ORM | 0.45.2 | 类型安全 ORM |
| drizzle-kit | 0.31.10 | 数据库迁移工具 |

### 富文本

| 技术 | 版本 | 用途 |
|------|------|------|
| @tiptap/react | 3.22.4 | 富文本编辑器 |
| @tiptap/starter-kit | 3.22.4 | 基础扩展包 |
| @tiptap/extension-table | 3.22.4 | 表格扩展 |
| @tiptap/extension-highlight | 3.22.4 | 高亮扩展 |
| @tiptap/extension-underline | 3.22.4 | 下划线扩展 |
| @tiptap/extension-placeholder | 3.22.4 | 占位符扩展 |
| DOMPurify | 3.4.1 | HTML 消毒 |

### 其他

| 技术 | 版本 | 用途 |
|------|------|------|
| xlsx | 0.18.5 | Excel 导出 |
| next-themes | 0.4.6 | 主题切换（当前仅 Light） |
| tsx | 4.21.0 | TypeScript 脚本运行器 |

---

## 3. 项目结构

```
ai-workforce-platform/
├── Dockerfile                     # 三阶段 Docker 构建
├── drizzle.config.ts              # Drizzle ORM 配置
├── eslint.config.mjs              # ESLint v9 flat config
├── next.config.ts                 # Next.js 配置 (output: standalone)
├── package.json
├── postcss.config.mjs             # PostCSS → @tailwindcss/postcss
├── tsconfig.json                  # TypeScript 配置 (path alias @/* → ./src/*)
├── local.db                       # SQLite 数据库文件
│
├── docs/                          # 项目文档
├── public/avatars/                # AI 生成的员工头像 (1376×768 PNG)
├── scripts/
│   └── generate-avatars.ts        # Gemini API 批量生成头像脚本
│
└── src/
    ├── app/                       # Next.js App Router
    │   ├── globals.css            # Tailwind v4 主题 + CSS 变量
    │   ├── layout.tsx             # 根布局 (Sidebar + Main)
    │   ├── page.tsx               # / → redirect to /roster
    │   ├── api/                   # 23 个 API 路由
    │   ├── dashboard/             # 驾驶舱
    │   ├── org/                   # 组织架构
    │   ├── production/            # 生产看板
    │   ├── roster/                # AI 花名册
    │   └── settings/              # 系统设置
    │
    ├── components/                # ~60 个组件文件
    │   ├── dashboard/   (11)      # 仪表盘组件
    │   ├── help/        (4)       # 帮助系统组件
    │   ├── nav/         (1)       # 导航侧边栏
    │   ├── org/         (5)       # 组织架构组件
    │   ├── production/  (18)      # 生产看板组件 (含 charts/)
    │   ├── roster/      (7)       # 花名册组件 (含 tabs/)
    │   ├── settings/    (18)      # 设置组件 (含 data-management/)
    │   ├── shared/      (4)       # 共享组件
    │   └── ui/          (15)      # shadcn/ui 基础组件
    │
    ├── db/
    │   ├── index.ts               # 数据库连接
    │   ├── schema.ts              # 11 张表定义
    │   ├── seed.ts                # 数据种子脚本
    │   └── seed-help-docs.ts      # 帮助文档种子
    │
    ├── hooks/
    │   └── use-count-up.ts        # 数字递增动画 Hook
    │
    └── lib/
        ├── types.ts               # 全局类型定义 (219 行)
        ├── utils.ts               # cn() 工具函数
        └── avatar-generator.ts    # 单头像重新生成
```

### 数量统计

| 分类 | 数量 |
|------|------|
| 页面路由 | 8 (含 2 个动态路由) |
| API 路由 | 23 |
| 组件文件 | ~60 |
| shadcn/ui 基础组件 | 15 |
| 数据库表 | 11 |
| 自定义 Hook | 1 |
| Loading 骨架屏 | 3 |

---

## 4. 路由与页面架构

### 布局结构

根布局采用 `flex h-screen` 分栏：

```
┌────────┬─────────────────────────────────┐
│ Sidebar│         <main>                 │
│ (64px) │    flex-1 overflow-y-auto       │
│        │                                 │
│  图标   │      页面内容 (children)        │
│  导航   │                                 │
│        │                                 │
│ z-50   │                                 │
└────────┴─────────────────────────────────┘
                         ┌─────────────┐
                         │  HelpPanel  │  (侧滑面板, 半屏宽度)
                         └─────────────┘
```

全局 Provider 层级：`<html>` → `<body>` → `<TooltipProvider>` → `<HelpPanelProvider>` → Layout

### 侧边栏导航

| 图标 | 名称 | 路由 |
|------|------|------|
| LayoutDashboard | 驾驶舱 | `/dashboard` |
| Users | AI花名册 | `/roster` |
| Cpu | 生产看板 | `/production` |
| GitBranch | 组织架构 | `/org` |
| Settings | 系统设置 | `/settings` |
| HelpCircle | 帮助中心 | 切换侧滑面板 |

侧边栏宽w-16 (64px)，纯图标导航，悬停显示 Tooltip。活动状态：`bg-primary/20 text-primary`。

### 页面路由表

| 路径 | 类型 | 描述 |
|------|------|------|
| `/` | Server | 重定向到 `/roster` |
| `/dashboard` | Async Server | KPI 驾驶舱，通过 `Promise.all` 并行获取多组数据 |
| `/roster` | Async Server | 员工网格，Drizzle 直查员工和指标数据 |
| `/roster/[id]` | Server | 员工详情直链访问 |
| `/production` | Async Server | 生产看板，获取历史任务 (limit 200) |
| `/production/[taskId]` | Server | 任务详情直链访问 |
| `/org` | Server | React Flow 组织架构图 |
| `/settings` | Async Server | 4 Tab 设置页（员工/指标/数据/帮助文档） |

### Loading 骨架屏

| 页面 | 骨架样式 |
|------|----------|
| Dashboard | 标题 + 6列 KPI 网格 + 2列图表 + 全宽热力图 |
| Roster | 标题 + 4列 × 8张员工卡片 (h-400) |
| Org | 控制栏 + 3列节点网格 |

---

## 5. 数据库与数据层

### 连接配置

- **数据库**：SQLite，文件 `local.db`（项目根目录）
- **驱动**：`better-sqlite3`
- **ORM**：Drizzle ORM
- **WAL 模式**：已启用（`pragma journal_mode = WAL`）
- **外键**：已启用（`pragma foreign_keys = ON`）
- **环境变量**：`DATABASE_PATH` 可覆盖默认 db 路径（用于 Docker 部署）

### 数据库 Schema（11 张表）

统一约定：
- 所有主键为 `text("id")` + `randomUUID()`
- 所有外键使用 `onDelete: "cascade"`
- 不使用 Drizzle `relations()`，仅用列级 `.references()`

#### 核心业务表

```
employees              员工表
├── id               text PK
├── name             text NOT NULL
├── avatar           text (nullable, 头像路径)
├── title            text NOT NULL (职位)
├── team             enum: management | design | production
├── status           enum: active | developing | planned | inactive
├── subTeam          text (生产管理层 / 内容生产层)
├── soul             text
├── identity         text
├── description      text
├── avatarDescription text
├── persona          text (JSON: EmployeePersona)
├── createdAt        timestamp
└── updatedAt        timestamp

skills                 技能表
├── id               text PK
├── employeeId       FK → employees.id CASCADE
├── name             text NOT NULL
├── description      text
├── level            integer (default 3)
└── category         text

skill_metrics          技能指标表
├── id               text PK
├── skillId          FK → skills.id CASCADE
├── employeeId       FK → employees.id CASCADE
├── period           text (YYYY-MM)
├── invocationCount  integer
├── successRate      real
├── avgResponseTime  real
├── lastUsedAt       timestamp
└── createdAt        timestamp

metrics                综合指标表
├── id               text PK
├── employeeId       FK → employees.id CASCADE
├── period           text (YYYY-MM)
├── periodType       enum: daily | weekly | monthly
├── taskCount        integer
├── adoptionRate     real
├── accuracyRate     real
├── humanTimeSaved   real
├── customMetrics    text (JSON)
└── createdAt        timestamp
```

#### 任务域表

```
tasks                  任务表
├── id               text PK
├── employeeId       FK → employees.id CASCADE
├── team             enum: management | design | production
├── name             text NOT NULL
├── type             text NOT NULL
├── status           enum: running | completed | failed
├── progress         integer (0-100)
├── currentStep      text
├── startTime        timestamp
├── estimatedEndTime timestamp
├── actualEndTime    timestamp
├── metadata         text (JSON)
├── qualityScore     integer (0-100)
├── retryCount       integer
├── tokenUsage       integer
└── reflection       text (JSON: {problems, lessons, improvements})

task_steps             SOP 步骤表
├── id               text PK
├── taskId           FK → tasks.id CASCADE
├── stepOrder        integer
├── name             text NOT NULL
├── status           enum: pending | running | completed | failed | skipped
├── thought          text (COT 思维链)
├── startedAt        timestamp
└── completedAt      timestamp

task_outputs           任务产出表
├── id               text PK
├── taskId           FK → tasks.id CASCADE
├── type             enum: document | resource | report | media | other
├── title            text NOT NULL
├── content          text
├── url              text
└── createdAt        timestamp
```

#### 配置与内容表

```
version_logs           版本日志表
├── id               text PK
├── employeeId       FK → employees.id CASCADE
├── version          text
├── date             text
├── changelog        text
└── capabilities     text

metric_configs         指标配置表
├── id               text PK
├── employeeId       FK → employees.id CASCADE (nullable)
├── team             enum (nullable)
├── taskType         text NOT NULL
├── humanBaseline    real NOT NULL
├── costPerHour      real (default 46.875)
├── description      text
└── updatedAt        timestamp

help_categories        帮助分类表
├── id               text PK
├── name             text NOT NULL
├── icon             text
├── sortOrder        integer
├── createdAt        timestamp
└── updatedAt        timestamp

help_articles          帮助文章表
├── id               text PK
├── categoryId       FK → help_categories.id CASCADE
├── title            text NOT NULL
├── summary          text
├── content          text NOT NULL (Tiptap HTML)
├── sortOrder        integer
├── createdAt        timestamp
└── updatedAt        timestamp
```

### ER 关系图

```
employees 1──┬──N skills 1──N skill_metrics
          │
          ├──N metrics
          ├──N tasks 1──┬──N task_steps
          │            └──N task_outputs
          ├──N version_logs
          └──N metric_configs

help_categories 1──N help_articles
```

---

## 6. API 路由设计

共 **23 个 API 路由**，全部位于 `src/app/api/` 下，采用 Next.js App Router 的 `route.ts` 规范。

### 仪表盘 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/dashboard/summary` | GET | KPI 摘要数据 |
| `/api/dashboard/heatmap` | GET | 活动热力图数据 |
| `/api/dashboard/recent-tasks` | GET | 最近任务列表 |
| `/api/dashboard/team-comparison` | GET | 团队对比数据 |

### 员工 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/employees` | GET | 员工列表 |
| `/api/employees/[id]` | GET/PUT/DELETE | 员工 CRUD |
| `/api/employees/[id]/avatar` | POST | 头像上传/生成 |
| `/api/employees/[id]/avatar-status` | GET | 头像生成状态查询 |
| `/api/employees/[id]/skills` | GET/POST | 技能列表/添加 |
| `/api/employees/[id]/version-logs` | GET/POST | 版本日志 |

### 任务与生产 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/tasks` | GET | 任务列表 |
| `/api/tasks/[taskId]` | GET | 任务详情（含 SOP 步骤） |
| `/api/production-stats` | GET | 生产统计数据（支持 `timeRange` / `date` 参数） |

### 指标配置 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/metric-configs` | GET/POST | 指标配置列表/创建 |
| `/api/metric-configs/[id]` | PUT/DELETE | 指标配置修改/删除 |
| `/api/metric-configs/resolve` | GET | 解析有效配置 |

### 数据管理 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/data/metrics` | GET/POST | 综合指标 CRUD |
| `/api/data/metrics/[id]` | PUT/DELETE | 单条指标操作 |
| `/api/data/skill-metrics` | GET/POST | 技能指标 CRUD |
| `/api/data/skill-metrics/[id]` | PUT/DELETE | 单条技能指标操作 |
| `/api/data/tasks` | GET/POST | 任务数据 CRUD |
| `/api/data/tasks/[id]` | PUT/DELETE | 单条任务操作 |
| `/api/data/export` | GET | Excel 导出（`xlsx` 库） |

### 帮助系统 API

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/help/categories` | GET/POST | 帮助分类列表/创建 |
| `/api/help/categories/[id]` | PUT/DELETE | 单分类操作 |
| `/api/help/articles` | GET/POST | 帮助文章列表/创建 |
| `/api/help/articles/[id]` | PUT/DELETE | 单文章操作 |

### API 路由注意事项

> ⚠️ 静态 API 路由段（如 `/api/production-stats`）**不得**与动态段（如 `/api/tasks/[taskId]`）作为同级兄弟节点放置，否则动态段会捕获静态名称。应使用独立的顶级路径。

---

## 7. 组件体系

### 组件分层

```
shadcn/ui 基础层 (15)     ← @base-ui/react 原语
    ↑
共享组件层 (4)             ← 跨页面复用
    ↑
业务组件层 (~45)           ← 各功能模块专属
    ↑
页面层 (8 page.tsx)        ← Server Components，数据获取入口
```

### shadcn/ui 基础组件（15 个）

> 全部基于 `@base-ui/react`（**非 Radix**），Button 无 `asChild` prop。

| 组件 | 用途 |
|------|------|
| AlertDialog | 确认弹窗 |
| Badge | 状态标签 |
| Button | 按钮（无 asChild，需外包 `<a>`） |
| Card | 卡片容器 |
| Dialog | 模态弹窗 |
| Input | 输入框 |
| Label | 表单标签 |
| Progress | 进度条 |
| Select | 下拉选择 |
| Separator | 分隔线 |
| Skeleton | 骨架屏占位 |
| Table | 数据表格 |
| Tabs | 标签页切换 |
| Textarea | 多行输入 |
| Tooltip | 悬停提示 |

### 共享组件（4 个）

| 组件 | 文件 | 功能 |
|------|------|------|
| AiAvatar | `shared/ai-avatar.tsx` | AI 头像展示，支持 fixed-size/fill 模式，null 时降级为 SVG 机器人 |
| AvatarUpload | `shared/avatar-upload.tsx` | 头像上传 |
| EmployeeDetailModal | `shared/employee-detail-modal.tsx` | 员工详情居中 Dialog 弹窗 |
| MetricTooltip | `shared/metric-tooltip.tsx` | 指标数值悬停提示 |

### 业务组件一览

#### Dashboard（11 个）

`dashboard-shell.tsx` 为容器壳，内含：
- `kpi-section.tsx` / `kpi-card.tsx` — KPI 指标卡片网格
- `activity-heatmap.tsx` — 活动热力图（ECharts）
- `team-comparison-chart.tsx` — 团队对比图（ECharts）
- `team-status-panel.tsx` / `team-drawer.tsx` — 团队状态面板与抽屉
- `task-feed.tsx` / `achievement-feed.tsx` — 任务/成就动态流
- `leaderboard-panel.tsx` — 排行榜
- `operational-index-gauge.tsx` — 运营指数仪表盘（ECharts Gauge）

#### Production（18 个，含 charts/）

- `time-range-selector.tsx` → `ProductionClient` — 时间范围状态容器
- `production-stats.tsx` — 统计卡片
- `production-tabs.tsx` — 三 Tab 布局（实时/仪表盘/历史）
- `running-tasks-panel.tsx` / `running-task-card.tsx` — 实时任务面板
- `steps-stepper.tsx` — SOP 步骤器（迷你/完整两种模式）
- `task-detail-dialog.tsx` / `task-detail.tsx` — 任务详情弹窗
- `reflection-panel.tsx` — 执行反思面板
- `outputs-list.tsx` / `output-preview-dialog.tsx` — 产出列表与预览
- `task-history-table.tsx` — 历史任务表格
- `production-dashboard.tsx` — 生产仪表盘
- `charts/` — `trend-chart.tsx`、`type-distribution-chart.tsx`、`employee-ranking-chart.tsx`、`quality-gauge.tsx`

#### Roster（7 个，含 tabs/）

- `employee-grid.tsx` — 员工网格（含筛选逻辑）
- `employee-card.tsx` — 肖像化员工卡片（h-80 头像区 + 团队色渐变）
- `employee-detail.tsx` — 员工详情页
- `tabs/` — `profile-tab.tsx`、`skills-tab.tsx`、`metrics-tab.tsx`、`version-tab.tsx`

#### Settings（18 个，含 data-management/）

- `employee-manager.tsx` — 员工管理
- `employee-create-dialog.tsx` / `employee-edit-dialog.tsx` — 员工新建/编辑弹窗
- `metric-config-manager.tsx` — 指标配置管理器
- `metric-config-global.tsx` / `metric-config-team.tsx` / `metric-config-employee.tsx` — 三级配置
- `help-doc-manager.tsx` — 帮助文档管理
- `data-management/` — 数据管理中心（10 个文件）：面包屑、摘要卡片、工具栏、数据表格、记录弹窗、导出工具、三个 Tab

#### Org（5 个）

- `org-chart-client.tsx` — React Flow 画布容器
- `employee-node.tsx` — 自定义节点组件
- `org-controls.tsx` — 画布控制器
- `org-legend.tsx` — 图例
- `types.ts` — 节点/边类型定义

#### Help（4 个）

- `help-panel-context.tsx` — `HelpPanelProvider` + `useHelpPanel()` Hook
- `help-panel.tsx` — 侧滑面板（半屏宽，可拖拽调整）
- `tiptap-editor.tsx` — Tiptap 富文本编辑器（table/highlight/underline/placeholder）
- `help-article-content.css` — 文章渲染样式

---

## 8. 样式系统

### Tailwind CSS v4 配置

- **无 `tailwind.config.js`** — 使用 `@theme inline` 和 `@custom-variant` 新语法
- **PostCSS 插件**：`@tailwindcss/postcss`（非传统 `tailwindcss` 插件）
- **CSS 导入**：`tailwindcss` → `tw-animate-css` → `shadcn/tailwind.css`
- **暗色模式**：声明了 `@custom-variant dark (&:is(.dark *))`，但未定义暗色变量值

### 主题变量（CSS Variables）

定义在 `src/app/globals.css` 的 `:root` 中：

| 类别 | 关键变量 |
|------|----------|
| 基础色 | `--background` (hsl 0 0% 98%), `--foreground` (hsl 222 47% 11%) |
| 主色调 | `--primary` (hsl 217 91% 50%) — 蓝色系 |
| 语义色 | `--destructive`, `--muted`, `--accent`, `--secondary` |
| 圆角 | `--radius: 0.75rem`，派生 sm/md/lg/xl/2xl/3xl/4xl |
| 图表色 | `--chart-1` 到 `--chart-5`（蓝/绿/橙/紫/红） |
| 侧边栏 | `--sidebar`, `--sidebar-primary`, `--sidebar-accent` 等 |

### 排版

- **基础字号**：14px，行高 1.57（中文 SaaS 优化）
- **字体**：Geist Sans（`--font-geist-sans`）+ Geist Mono（`--font-geist-mono`）
- **抗锯齿**：`-webkit-font-smoothing: antialiased`

### 团队色彩标识

| 团队 | 左边框色 | 渐变背景 |
|------|----------|----------|
| 管理层 (management) | 紫色 | 紫色渐变 |
| 设计层 (design) | 蓝色 | 蓝色渐变 |
| 生产层 (production) | 绿色 | 绿色渐变 |

### 工具函数

```typescript
// src/lib/utils.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)) // clsx 条件合并 + tailwind-merge 去重
}
```

### 自定义动画

```css
@keyframes fade-in-up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
.animate-fade-in-up { animation: fade-in-up 0.4s ease-out both }
.animate-delay-100 ~ .animate-delay-500  /* 0.1s ~ 0.5s 阶梯延迟 */
```

---

## 9. 数据流模式

### 核心模式：Server Component + Client Component 分离

```
┌─────────────────────────────────────────────────────┐
│  page.tsx (Server Component, async)                 │
│                                                     │
│  1. 直接 import { db } from "@/db"                  │
│  2. await db.select()... (Drizzle ORM 查询)          │
│  3. 数据作为 props 传递给 Client Component            │
│                                                     │
│  return <ClientShell data={data} />                  │
└─────────────────────────────────────────────────────┘
         │ props (序列化数据)
         ▼
┌─────────────────────────────────────────────────────┐
│  client-shell.tsx ("use client")                     │
│                                                     │
│  - 接收 server 传来的数据                              │
│  - 管理交互状态 (useState, useEffect)                  │
│  - 需要写操作时 → fetch("/api/xxx") 调用 API Routes   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 读操作路径

```
用户请求 → Next.js Server Component → Drizzle ORM → SQLite → HTML 渲染
```

- 页面级数据获取发生在服务端，**无需客户端 fetch**
- `Promise.all` 并行化多个查询（见 Dashboard 页面）
- 数据通过 props 序列化传递到客户端组件

### 写操作路径

```
用户交互 → Client Component → fetch("/api/xxx") → API Route → Drizzle ORM → SQLite
```

- 所有 mutations 通过 API Routes 处理
- API Routes 位于 `src/app/api/` 下，使用 `NextRequest`/`NextResponse`

### 特殊数据流

#### 生产看板实时更新

```
ProductionClient (状态容器)
├── timeRange state
├── 传递 timeRange → ProductionStats（统计卡片）
└── 传递 timeRange → ProductionTabs
    ├── 实时 Tab: RunningTaskCard 自行 fetch /api/tasks/[id] 获取 SOP 步骤
    ├── 仪表盘 Tab: fetch /api/production-stats?timeRange=xxx
    └── 历史 Tab: 使用 server 传入的 historyTasks
```

#### 员工详情交互

```
EmployeeGrid → 点击卡片 → EmployeeDetailModal (Dialog)
                           ├── ProfileTab (server 数据)
                           ├── SkillsTab → fetch /api/employees/[id]/skills
                           ├── MetricsTab (server 数据)
                           └── VersionTab → fetch /api/employees/[id]/version-logs
```

---

## 10. 部署架构

### Docker 三阶段构建

```
┌─────────────────────────────────────────────────┐
│  Stage 1: deps (node:20-alpine)                 │
│  - 安装 python3/make/g++ (native deps 编译)      │
│  - npm ci                                       │
├─────────────────────────────────────────────────┤
│  Stage 2: builder                               │
│  - 复制 deps + 源码                               │
│  - npm run build                                │
├─────────────────────────────────────────────────┤
│  Stage 3: runner                                │
│  - 复制 .next/standalone + .next/static + public│
│  - 复制 local.db → /app/data/local.db           │
│  - 以 nextjs 用户运行，端口 3000                   │
└─────────────────────────────────────────────────┘
```

### 关键配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `next.config.ts` output | `"standalone"` | 生成独立部署产物 |
| `DATABASE_PATH` | `/app/data/local.db` | 容器内 DB 路径 |
| 运行用户 | `nextjs` | 非 root 运行 |
| 端口 | 3000 | 默认 HTTP 端口 |

### 部署前注意

构建 Docker 镜像前**必须**先 checkpoint WAL 文件：

```bash
sqlite3 local.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

WAL 数据不在 `.db` 主文件中，不 checkpoint 会导致数据丢失。

### NPM Scripts

```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run start            # 启动生产服务
npm run lint             # ESLint 检查 (flat config, v9)
npm run db:push          # 推送 schema 变更到 SQLite
npm run db:generate      # 生成 Drizzle 迁移文件
npm run db:migrate       # 执行 Drizzle 迁移
npm run db:seed          # 播种数据库 (tsx src/db/seed.ts)
npm run generate:avatars # Gemini API 批量生成头像
```

---

## 11. 开发规范与约定

### 核心约定

1. **所有用户可见文本必须为中文**
2. **Pages (`page.tsx`) 是 Server Components** — 不加 `"use client"`，交互部分拆到独立客户端组件
3. **Loading 状态使用 `loading.tsx` 骨架文件**（Dashboard / Roster / Org 已有）
4. **Path alias**：`@/*` 映射到 `./src/*`

### 员工头像

- AI 生成的横版肖像图 (1376×768 PNG)，存于 `public/avatars/{name}.png`
- `AiAvatar` 组件两种模式：fixed-size（`size` prop）和 fill（填充容器 + `object-cover`）
- 头像为 null 时降级为程序化生成的 SVG 机器人（基于员工 ID 确定性着色，颜色随团队）
- 生成脚本（`generate:avatars`）调用 Gemini 3.1 Flash，可断点续跑

### 员工卡片设计

- 大头像区 `h-80` + 团队色渐变背景 + 渐变融合到白色
- 状态徽章覆盖层
- 姓名 `text-lg font-bold` + 职位 + 描述 + 指标行
- 点击打开居中 Dialog 弹窗（非页面导航）

### 数据约定

| 字段 | 格式 | 说明 |
|------|------|------|
| `employees.persona` | JSON string → `EmployeePersona` | 含 age/gender/mbti/visualTraits 等 |
| `metrics.period` | `YYYY-MM` | 月度字符串 |
| `tasks.reflection` | JSON `{problems, lessons, improvements}` | 非纯文本 |
| `tasks.tokenUsage` | integer | UI 中显示为预估 RMB 成本 |
| `task_steps` 状态约束 | running 步骤唯一 | 之前的为 completed，之后为 pending |

### 团队标识

- 左边框色：紫(管理) / 蓝(设计) / 绿(生产)
- 生产层通过 `subTeam` 区分"生产管理层"和"内容生产层"

### 工具链配置

| 工具 | 配置文件 | 说明 |
|------|---------|------|
| ESLint | `eslint.config.mjs` | v9 flat config，extends core-web-vitals + typescript |
| PostCSS | `postcss.config.mjs` | 单一插件 `@tailwindcss/postcss` |
| Drizzle | `drizzle.config.ts` | dialect: sqlite, schema: `./src/db/schema.ts` |
| TypeScript | `tsconfig.json` | target ES2017, moduleResolution bundler |

---

## 12. 架构图

### 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React 19 Client Components                            │  │
│  │  (ECharts · React Flow · Tiptap · shadcn/ui)           │  │
│  └──────────────────┬─────────────────────────────────────┘  │
│                     │ fetch (mutations)                       │
└─────────────────────┼────────────────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────────────────┐
│  Next.js 16 Server  │                                        │
│                     ▼                                        │
│  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │  API Routes (23)                │  │  Server Components│  │
│  │  src/app/api/**                 │  │  page.tsx (async) │  │
│  │  (mutations + client fetches)   │  │  (reads)          │  │
│  └──────────────┬──────────────────┘  └────────┬─────────┘  │
│                 │                               │            │
│                 ▼                               ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Drizzle ORM (better-sqlite3)                        │   │
│  │  WAL mode · Foreign Keys · 11 tables                 │   │
│  └──────────────────────────┬───────────────────────────┘   │
│                             │                                │
│                             ▼                                │
│                      ┌──────────┐                            │
│                      │ local.db │ (SQLite)                   │
│                      └──────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

### 请求生命周期

```
读操作:  Browser → Server Component → Drizzle → SQLite → RSC HTML → Browser
写操作:  Browser → fetch() → API Route → Drizzle → SQLite → JSON Response → Browser
```

---

> 文档基于源码静态分析生成，如有架构变更请同步更新。
