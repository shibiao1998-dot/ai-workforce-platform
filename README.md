# AI Workforce Platform

内部 AI 员工管理仪表盘，用于管理和监控 24 名 AI 员工的工作状态、绩效指标和任务执行情况。涵盖管理线、设计线、生产线三大业务线。

## 技术栈

- **框架：** Next.js 16 (App Router) + React 19 + TypeScript
- **样式：** Tailwind CSS v4 + shadcn/ui
- **数据库：** SQLite (better-sqlite3) + Drizzle ORM
- **图表：** ECharts
- **组织架构图：** React Flow (@xyflow/react)

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 数据看板 | `/dashboard` | KPI 总览、活跃热力图、团队对比、近期任务 |
| 员工花名册 | `/roster` | 员工卡片网格，支持按团队/状态筛选 |
| 员工详情 | `/roster/[id]` | 技能雷达、绩效趋势、版本日志 |
| 生产中心 | `/production` | 实时任务看板 + 历史任务表 |
| 任务详情 | `/production/[taskId]` | 任务进度、步骤、产出物 |
| 组织架构 | `/org` | 可交互的团队层级图，支持拖拽和缩放 |
| 系统设置 | `/settings` | 员工管理（增删改）、指标基线配置 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。

项目已包含预置的 SQLite 数据库（`local.db`），含 24 名 AI 员工的完整种子数据，无需额外操作即可直接运行。

### 重新生成数据库

如需重置数据库：

```bash
npm run db:push      # 推送 schema 到 SQLite
npm run db:seed      # 写入种子数据
```

## 项目结构

```
src/
├── app/                  # 页面路由（Server Components）
│   ├── api/              # API 路由（mutations）
│   ├── dashboard/        # 数据看板
│   ├── roster/           # 花名册 + 员工详情
│   ├── production/       # 生产中心 + 任务详情
│   ├── org/              # 组织架构
│   └── settings/         # 系统设置
├── components/
│   ├── ui/               # shadcn/ui 基础组件
│   ├── shared/           # 共享组件（AI 头像等）
│   ├── nav/              # 导航侧边栏
│   ├── dashboard/        # 看板组件
│   ├── roster/           # 花名册组件
│   ├── production/       # 生产中心组件
│   ├── org/              # 组织架构组件
│   └── settings/         # 设置组件
├── db/
│   ├── schema.ts         # Drizzle 表定义（7 张表）
│   ├── index.ts          # 数据库连接
│   └── seed.ts           # 种子数据
└── lib/
    └── utils.ts          # 工具函数
```

## 数据模型

- **employees** — 员工基本信息（名称、职位、团队、状态）
- **skills** — 员工技能（名称、等级 1-5、分类）
- **metrics** — 月度绩效指标（任务数、采纳率、准确率、节省人时）
- **tasks** — 任务记录（状态、进度、时间）
- **task_outputs** — 任务产出物（文档、报告等）
- **version_logs** — 员工版本迭代日志
- **metric_configs** — 指标基线配置（人工基准工时、时薪）

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run lint         # ESLint 检查
npm run db:push      # 推送 schema 变更
npm run db:generate  # 生成 Drizzle 迁移
npm run db:migrate   # 执行迁移
npm run db:seed      # 写入种子数据
```

## 团队构成

共 24 名 AI 员工，分布在三条业务线：

- **管理线（10 人）** — 审计、人力、决策、项目监控、合规、战略、质量、预算、知识、运营
- **设计线（4 人）** — 产品、UX、架构、测试
- **生产线（10 人）** — 编剧、角色设计、视频制作、音频、质检、资源管理、数据清洗、内容分发、效果分析、本地化
