# 项目级指令

@AGENTS.md

## 项目概述

AI Workforce Platform 是一个中文内部管理面板，用于展示由 24 名 AI 员工组成的管理、设计和生产团队。项目使用 Next.js 16 App Router、React 19、TypeScript、Tailwind CSS v4 和 shadcn/ui。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:generate
npm run db:migrate
npm run db:seed
npm run generate:avatars
```

项目当前没有测试框架，也没有 Prettier。

`generate:avatars` 需要 `.env.local` 中配置 `IMAGE_API_GATEWAY_URL` 和 `IMAGE_API_KEY`，会通过兼容 OpenAI 的网关调用 `gpt-image-2`，生成 `public/avatars/` 下的横版写实人物头像。脚本每次运行都会重新生成全部头像。

## 架构

### 数据流

页面本身是异步服务端组件，通过 Drizzle ORM 直接读取 SQLite，再把数据以 props 形式传给客户端交互组件。位于 `src/app/api/` 下的 API 路由负责处理修改类请求和客户端数据获取。

### 数据库

- 使用 SQLite `local.db`，通过 `better-sqlite3` 与 Drizzle ORM 访问。
- 已启用 WAL 模式和外键约束。
- Schema 位于 `src/db/schema.ts`。
- 所有主键均为 `text("id")` 并使用 `randomUUID()` 生成。
- 所有外键均采用 `onDelete: "cascade"`。
- 当前没有使用 Drizzle `relations()`，仅使用列级 `.references()`。

### 路由

- `/` 会重定向到 `/roster`。
- `/dashboard` 是 KPI 仪表盘。
- `/roster` 是员工列表和详情弹窗。
- `/production` 是生产看板与任务详情。
- `/org` 是组织结构图。
- `/settings` 是员工、指标、帮助文档和数据管理中心。

### API 结构

API 路由集中在 `src/app/api/`，包括仪表盘、员工、任务、生产统计、指标配置、数据管理和帮助系统等接口。

静态 API 路径与动态路径不能作为同级冲突存在，例如 `/api/production-stats` 不能放在会被动态段吞掉的位置。

### 帮助系统

帮助中心是一个从侧边栏打开的滑出面板，主要组件位于 `src/components/help/`：

- `help-panel-context.tsx` 提供打开与关闭状态。
- `help-panel.tsx` 负责面板渲染与拖拽调整宽度。
- `tiptap-editor.tsx` 提供富文本编辑能力。
- `help-article-content.css` 提供文章渲染样式。

文章内容以 HTML 形式存储，展示前会通过 DOMPurify 清洗。帮助内容在 `/settings` 中管理。

## 部署

项目通过多阶段 Docker 构建生成镜像。

- `next.config.ts` 使用 `output: "standalone"`。
- SQLite 数据库会复制到容器内 `/app/data/local.db`。
- `src/db/index.ts` 支持通过 `DATABASE_PATH` 覆盖数据库路径。
- 在构建 Docker 镜像前，应先执行 `sqlite3 local.db "PRAGMA wal_checkpoint(TRUNCATE);"`，避免 WAL 数据未落回主库文件。

## 关键约定

- 所有用户可见文本必须使用中文。
- 页面文件 `page.tsx` 保持为服务端组件，交互逻辑拆到单独客户端组件中。
- 加载态使用 `loading.tsx` 骨架文件。
- 员工头像位于 `public/avatars/{name}.png`，缺失时由 `AiAvatar` 组件回退到程序生成的 SVG 机器人头像。
- `employees.persona` 字段存储 JSON 字符串，结构对应 `EmployeePersona`。
- 员工卡片采用大头像主导的展示布局，点击后通过 `Dialog` 打开详情，而不是跳转页面。
- 团队身份通过边框与渐变颜色表达，管理、设计、生产团队颜色不同。
- `skill_metrics` 表存储技能级月度指标。
- `employees.subTeam` 用于区分生产管理层与内容生产层。
- `metrics` 表中的月份使用 `YYYY-MM` 字符串。
- `task_steps` 表用于记录任务 SOP 步骤，运行中任务应保持恰好一个 `running` 状态步骤。
- `tasks.reflection` 存储 JSON 结构，而不是普通文本。
- `tasks.qualityScore`、`retryCount`、`tokenUsage` 主要用于已完成任务，界面中会把 token 使用量换算为估算人民币成本。

### 权限管控 (RBAC)

- 模块 × 动作:6 个模块(employees/production/org/dashboard/help/settings)× 3 个动作(read/write/delete)= 18 个原子权限
- 内置角色:super-admin / viewer / default 不可在 UI 编辑或删除;自定义角色在 `/settings/permissions` 管理
- 首任 super-admin:通过 `.env.local` 的 `SUPER_ADMIN_UC_IDS` 白名单赋予(逗号分隔的 UC userId)
- API route 第一行必须:`const [, err] = await requirePermission("<module>", "<action>", request); if (err) return err;`
- 页面 Server Component 第一行必须:`await requirePageReadAccess("<module>");`
- Client Component 按钮用 `{permissions.xxx.includes("delete") && <Button/>}` 隐藏,**不用 disabled**
- 新增页面上线 checklist:
  1. `src/proxy.ts` 的 `PATH_TO_MODULE` 加正则
  2. 页面 Server Component 顶部 `requirePageReadAccess`
  3. 对应 API 路由 handler 首行 `requirePermission`
  4. Sidebar 的 `NAV_ITEMS` 加 `module` 字段
- 权限变更审计:通过 `src/lib/audit.ts` 的 `logAudit()` 写入 `audit_logs` 表;业务数据 CRUD 不在当前审计范围
- 设计文档:`docs/superpowers/specs/2026-04-27-permission-management-design.md`
- 实施计划:`docs/superpowers/plans/2026-04-27-permission-management.md`

### Next.js 16 Client Component prop 约定

Next 16 对 `"use client"` 组件导出的 function props 强制命名规则(错误码 71007):必须以 `Action` 结尾或名为 `action`。例如:
- 自己声明的回调:`onCloseAction`、`onCreatedAction`、`onChangeAction`
- 库组件透传的 prop 不受此约束:Dialog 的 `onOpenChange`、Select 的 `onValueChange`、Checkbox 的 `onCheckedChange` 照常使用

## UI 与技术细节

- shadcn/ui 基于 `@base-ui/react`，不是 Radix。新增组件时不能误用 `@radix-ui`。
- `Button` 组件没有 `asChild` 属性，链接场景需要在外层包裹 `<a>`。
- 样式体系使用 Tailwind CSS v4 和 `globals.css` 中的 CSS 变量。
- 图表使用 `echarts-for-react`。
- 组织图使用 `@xyflow/react`。
- 富文本编辑使用 Tiptap。
- 如果涉及 Next.js 16 特有行为，应先查看 `node_modules/next/dist/docs/01-app/` 中对应文档，再决定实现方式。
