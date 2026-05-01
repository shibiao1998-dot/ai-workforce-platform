# AIproject Agent Notes

> 生成时间：2026-04-30  
> 适用目录：`/Users/bill_huang/workspace/claudecode/myproject/AIproject`  
> 目的：给后续开发代理快速恢复项目上下文。本文以当前本地源码、`local.db`、`package.json`、`CLAUDE.md` 和实际命令输出为事实源。历史计划文档可参考，但不要直接当成当前状态。

## 1. 项目定位

本项目是 **AI Workforce Platform**，一个中文内部管理面板，用于展示和管理 24 名 AI 员工组成的管理、设计、生产团队。项目此前由 Claude Code 持续开发，并已经部署到生产环境；当前本地工作区仍在做新需求迭代，尤其是 dashboard 的 NetDragon 视觉体系改造。

核心模块：

- `/dashboard`：驾驶舱，KPI、团队状态、产线流转、排行榜、热力图、最近任务与成就。
- `/roster`：AI 员工花名册，员工卡片、筛选、详情弹窗。
- `/production`：生产看板，实时任务、数据面板、历史任务、任务详情。
- `/org`：组织架构，基于 React Flow 的团队层级图。
- `/settings`：员工管理、指标配置、数据管理、帮助文档、权限管理。
- 全局帮助中心：侧边栏入口打开滑出面板，内容由帮助文档表驱动。

## 2. 当前技术栈

- Next.js `16.2.4`，App Router，`src/proxy.ts` 作为 Proxy/Middleware。
- React `19.2.4`。
- TypeScript `5.x`，`strict: true`，路径别名 `@/* -> ./src/*`。
- Tailwind CSS v4，主题变量集中在 `src/app/globals.css`。
- shadcn/ui `4.2.0`，底层是 `@base-ui/react`，不是 Radix。
- SQLite `local.db` + `better-sqlite3` + Drizzle ORM。
- ECharts `6.0.0` + `echarts-for-react`。
- React Flow：`@xyflow/react`。
- Tiptap 3 + DOMPurify，用于帮助文档编辑/渲染。
- `xlsx` 用于 CSV/Excel 导出。
- `@sdp.nd/nd-uc-sdk` 用于 UC SSO。

## 3. 必须遵守的开发约束

- 默认中文 UI 文案；用户可见文字保持中文。
- 修改前先检查工作区状态，不覆盖已有协作者变更。
- 当前 Next.js 不是旧版本经验里的 Next.js。写 Next 相关代码前，先查 `node_modules/next/dist/docs/` 中对应文档。
- 页面 `page.tsx` 优先保持 Server Component；交互拆到独立 Client Component。
- 新增 Client Component 导出的函数型 props，按 Next 16 规则命名为 `xxxAction` 或 `action`。库组件透传的 `onOpenChange`、`onValueChange` 等按库原名。
- shadcn/ui 组件不要引入 `@radix-ui`；现有组件在 `src/components/ui/`。
- `Button` 当前没有 `asChild`，链接场景使用外层 `<a>` 或按现有模式处理。
- API route 第一行应做权限检查：`const [, err] = await requirePermission("<module>", "<action>", request); if (err) return err;`
- 页面 Server Component 顶部应做：`await requirePageReadAccess("<module>");`
- 权限按钮按权限隐藏，不用 disabled 暴露能力。

## 4. 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed:permissions
npm run generate:avatars
npm run nd:generate
npm run nd:postprocess
npm run nd:budget-check
```

当前没有测试框架，也没有 Prettier。

## 5. 当前验证基线

本地 2026-04-30 实测：

- `npm run build`：通过。Next build 输出 32 个 API route，页面均为 dynamic server-rendered。
- `npm run nd:budget-check`：通过。扫描 36 个 WebP，其中 34 个计入预算、2 个 smoke-test 豁免，计入预算总量约 3.48 MB。
- `npm run lint`：失败。不要误判为本次改动导致，当前基线已有问题：
  - ESLint 扫到了 `.worktrees/light-theme-trend-chart/.next/...`，因为 `eslint.config.mjs` 只 ignore 根 `.next/**`，没有 ignore `.worktrees/**`。
  - React 19 lint 规则报 `Date.now()` render purity、effect 中同步 setState、render 期间创建组件等问题。
  - Next lint 报 `<a>` 应使用 `<Link />`、`<img>` 警告。
  - 若需要修 lint，应单独开任务处理，避免夹带到业务需求里。

## 6. Git 与工作区现状

当前分支：`main`，远端：`origin https://github.com/shibiao1998-dot/ai-workforce-platform.git`。本地 `main` 当前领先 `origin/main` 62 个提交。

当前已有未提交修改，视为协作者/既有迭代状态，不要回退：

- 已修改：`.dockerignore`、`Dockerfile`、`local.db`、多个 `public/netdragon/hero/*.webp`、`scripts/nd-prompts/family-hero.txt`、dashboard/NetDragon/metric 相关源码。
- 未跟踪：`docs/file/...0415.md`、若干 `docs/superpowers` 计划与设计、`docs/产品与数据指标说明.md`、`lighthouse-dashboard*.json`、`scripts/seed-demo-data.ts`、`src/components/netdragon/nd-sparkline.tsx`。
- 本文件 `agent.md` 是新增开发上下文文档。

## 7. 源码结构

关键目录：

```text
src/app/                 Next App Router 页面、API、全局样式
src/app/api/             API route handlers
src/components/ui/       shadcn/base-ui 基础组件
src/components/nav/      AppShell 与 Sidebar
src/components/dashboard/驾驶舱组件
src/components/netdragon/NetDragon 视觉体系组件与素材原语
src/components/roster/   花名册与员工详情
src/components/production/生产看板与任务详情
src/components/org/      React Flow 组织架构
src/components/settings/ 设置、数据管理、权限管理
src/components/help/     帮助中心面板、Tiptap 编辑器与文章样式
src/components/shared/   头像、员工详情弹窗、指标 tooltip
src/db/                  Drizzle schema、连接、seed
src/lib/                 auth/authz、指标引擎、dashboard 查询、头像生成等
scripts/                 seed、头像生成、NetDragon 素材生成/后处理/预算检查
docs/                    历史方案与产品说明
public/avatars/          24 个员工头像 PNG
public/netdragon/        NetDragon 视觉素材 PNG/WebP/SVG fallback
```

当前静态盘点：`src/app` 约 50 个文件，`src/app/api` 有 32 个 `route.ts`，`src/components` 约 100 个文件，`src/components/ui` 16 个基础组件。

## 8. 数据流与架构模式

主要模式：

- 页面是异步 Server Component，直接通过 Drizzle 读 SQLite。
- 需要交互的部分拆到 Client Component，初始数据通过 props 下发。
- 修改类请求和客户端动态数据通过 `src/app/api/**/route.ts`。
- 数据库连接在 `src/db/index.ts`，默认 `process.cwd()/local.db`，生产可用 `DATABASE_PATH` 覆盖。
- 应用启动时在 Node 进程里启用 SQLite `journal_mode = WAL` 和 `foreign_keys = ON`。
- `src/proxy.ts` 只做认证与页面 read 权限预检查；API 权限由 route handler 自己做。

## 9. 数据库现状

Schema 在 `src/db/schema.ts`。当前共有 15 张表：

- `employees`
- `skills`
- `skill_metrics`
- `metrics`
- `tasks`
- `task_steps`
- `task_outputs`
- `version_logs`
- `metric_configs`
- `help_categories`
- `help_articles`
- `roles`
- `role_permissions`
- `user_roles`
- `audit_logs`

当前 `local.db` 数据量：

| 表 | 行数 |
|---|---:|
| employees | 24 |
| skills | 113 |
| skill_metrics | 678 |
| metrics | 144 |
| tasks | 888 |
| task_steps | 3705 |
| task_outputs | 1417 |
| version_logs | 24 |
| metric_configs | 14 |
| help_categories | 4 |
| help_articles | 14 |
| roles | 3 |
| role_permissions | 29 |
| user_roles | 1 |
| audit_logs | 1 |

员工分布：

- design：4 人。
- management：10 人。
- production：10 人。
- production 下有 `生产管理层` 5 人、`内容生产层` 5 人。

任务状态：

- completed：708。
- running：180。

内置角色：

- `super-admin`：超级管理员。
- `viewer`：查看者。
- `default`：默认用户。

注意：老文档里仍有 “9 张表” 或 “11 张表” 的说法，已过期。以后以 `src/db/schema.ts` 和实际 DB 为准。

## 10. 关键数据模型约定

- 所有主键基本为 `text("id")`，用 `randomUUID()` 生成。
- 外键大多 `onDelete: "cascade"`；`user_roles.roleId` 是 `onDelete: "restrict"`。
- `employees.persona` 是 JSON 字符串，对应 `EmployeePersona`。
- `tasks.reflection` 是 JSON 字符串，不是普通纯文本。
- `metrics.period` 通常是 `YYYY-MM`，`periodType` 支持 daily/weekly/monthly。
- `metric_configs` 用于人工基准工时和时薪，默认 `costPerHour` 是 `46.875`。
- `task_steps` 是任务 SOP 步骤；运行中任务通常应只有一个 `running` 步骤。
- `tasks.tokenUsage` 用于估算 token 成本，当前 `src/lib/metric-defs.ts` 的 `TOKEN_COST_RATE = 0.0001`。部分导出代码仍有 `0.00015` 的旧口径，改指标时要统一核对。

## 11. 路由与 API

页面：

- `/` 重定向到 `/roster`。
- `/login`、`/login/callback` 是 UC 登录入口与回调。
- `/403` 是无权限页。
- `/dashboard`、`/roster`、`/production`、`/org`、`/settings` 是主业务页。
- `/roster/[id]`、`/production/[taskId]` 支持详情直链。

API 分组：

- `auth`：`/api/auth/login`、`logout`、`me`。
- `employees`：员工列表、详情、创建、更新、删除、头像、头像状态、技能、版本日志。
- `tasks` 与 `production-stats`：生产看板任务和统计。
- `metric-configs`：指标基准配置与 resolve。
- `data`：指标、技能指标、任务数据管理与导出。
- `help`：帮助分类和文章 CRUD。
- `permissions`：角色、用户授权、审计日志、UC userId 格式校验。

新增 API 时必须明确模块归属，并在 route handler 顶部调用 `requirePermission`。

## 12. 认证与 RBAC

认证：

- `src/lib/uc-client.ts` 负责浏览器侧 UC SDK 登录与回调处理。
- `src/app/api/auth/login/route.ts` 接收 UC 用户信息，upsert `user_roles`，创建 HMAC 签名 cookie。
- Session cookie 名为 `ai-workforce-session`。
- `SESSION_SECRET` 如果未配置，会退回默认值 `dev-secret-change-in-production-32ch`。生产必须配置真实随机值。
- `AUTH_DISABLED=true` 时跳过认证，返回开发用户，并在 authz 中等价 super-admin。

授权：

- 权限模型是 6 个模块 × 3 个动作：
  - 模块：`employees`、`production`、`org`、`dashboard`、`help`、`settings`。
  - 动作：`read`、`write`、`delete`。
- 类型与标签在 `src/lib/authz-constants.ts`。
- `getCurrentUserWithPermissions`、页面 read guard 在 `src/lib/authz-server.ts`。
- API guard 在 `src/lib/authz.ts`。
- 首任管理员由 `.env.local` 的 `SUPER_ADMIN_UC_IDS` 白名单决定。
- 权限变更审计通过 `src/lib/audit.ts` 写 `audit_logs`，当前仅覆盖权限变更，不覆盖业务数据 CRUD。

新增页面 checklist：

1. `src/proxy.ts` 的 `PATH_TO_MODULE` 加正则。
2. 页面 Server Component 顶部调用 `requirePageReadAccess("<module>")`。
3. 对应 API handler 顶部加 `requirePermission("<module>", "<action>", request)`。
4. `src/components/nav/sidebar.tsx` 的 `NAV_ITEMS` 加 `module` 字段。
5. Client 按钮按权限隐藏。

## 13. Dashboard 与指标引擎

指标主口径在 `src/lib/metric-engine.ts`：

- `getMetrics(scope)` 汇总任务量、完成率、采纳率、准确率、质量分、节省工时、人力成本、token 成本、运营指数。
- 时间范围支持 `period`、`today`、`7d`、`30d`。
- `getKpiItems` 生成 dashboard KPI 卡片。
- `getTeamEfficiencyTrend` 生成团队效能趋势。
- `getKpiTrendSeries` 是当前未提交迭代新增，用于 KPI 卡片 sparkline。
- `getEmployeeMetrics` 给花名册/员工维度摘要用。

Dashboard 补充查询在 `src/lib/dashboard-data.ts`：

- 团队状态。
- 活跃热力图。
- 最近任务。
- Gamification raw data、排行榜、成就。
- 产线 5 节点流转：`intake`、`design`、`production`、`review`、`archive`。

当前 dashboard 正在往 NetDragon 4 区块布局演进，最近改动包括 hero 背景图、KPI sparkline 和视觉组件替换。

## 14. NetDragon 视觉体系

当前 NetDragon 体系落点：

- 设计 token：`src/app/globals.css` 的 `--color-nd-*`、`--font-nd-*`、`--radius-nd-*`、`--shadow-nd-*` 等。
- 高层组件：`src/components/netdragon/`。
- 素材原语：`src/components/netdragon/primitives/`。
- 素材 catalog：`scripts/nd-catalog.json`。
- Prompt：`scripts/nd-prompts/`。
- 资产：`public/netdragon/`。

脚本：

- `npm run nd:generate`：通过 `IMAGE_API_GATEWAY_URL` / `IMAGE_API_KEY` 调 gpt-image-2 生成 PNG 母版。
- `npm run nd:postprocess`：用 sharp 生成 @1x/@2x WebP。
- `npm run nd:budget-check`：检查 WebP 单图与总量预算。

资产约束：

- PNG 母版本地保留，`.gitignore` 当前忽略 `/public/netdragon/**/*.png`。
- WebP 派生文件入 git。
- `docs/netdragon-ui/README.md` 是该体系当前较可靠的使用文档。
- 当前未提交的 `src/components/netdragon/nd-sparkline.tsx` 已被 `nd-stat-card` 使用，不要误删。

## 15. 头像生成

当前源码口径已经从旧 Gemini 变量迁移到：

- `IMAGE_API_GATEWAY_URL`
- `IMAGE_API_KEY`

`npm run generate:avatars` 和 `src/lib/avatar-generator.ts` 使用 `gpt-image-2` 的 `/v1/images/generations`，生成 2560×1440 横版真实感商业肖像，输出到 `public/avatars/{name}.png`，并写回员工 `avatar` 字段。

旧 README 和部分帮助种子里仍提到 `GEMINI_GATEWAY_URL` / `GEMINI_API_KEY`，这是历史口径，后续修文档时应更新。

## 16. 环境变量

当前 `.env.local` 存在以下 key（未记录值）：

- `AUTH_DISABLED`
- `IMAGE_API_GATEWAY_URL`
- `IMAGE_API_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_UC_COMPONENT_URL`
- `NEXT_PUBLIC_UC_ENV`
- `NEXT_PUBLIC_UC_SDP_APP_ID`
- `SESSION_SECRET`
- `SUPER_ADMIN_UC_IDS`

不要在文档或提交里暴露密钥值。

## 17. 部署与生产注意事项

部署通过 Docker 多阶段构建：

- `next.config.ts` 使用 `output: "standalone"`。
- runner 阶段复制 `.next/standalone`、`.next/static`、`public`。
- `local.db` 被复制到容器内 `/app/data/local.db`。
- 生产运行时设置 `DATABASE_PATH=/app/data/local.db`。
- 容器暴露 3000，`HOSTNAME=0.0.0.0`。

当前未提交 Dockerfile 有重要变化：

- 删除了独立 `deps` 阶段，builder 改为 `COPY . .`。
- 依赖本地 `node_modules`，原因是内网私有包 `@sdp.nd/*` 容器内无法单独拉取。
- 在 Linux musl 环境补装/重建 optional native 包与 `better-sqlite3`。
- `.dockerignore` 当前未忽略 `node_modules` 和 `.env.local`，这是为构建服务的本地变更，但有构建上下文和密钥暴露风险；处理部署问题时必须先确认这是不是有意设计。

构建镜像前应执行：

```bash
sqlite3 local.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

原因：SQLite WAL 数据要落回主库文件，避免只复制 `local.db` 时丢数据。

## 18. 文档可信度

优先级建议：

1. 当前源码、`package.json`、`local.db`、实际命令输出。
2. `CLAUDE.md`：项目级约定较新，尤其是 RBAC、Next 16、shadcn/base-ui 注意事项。
3. `docs/netdragon-ui/README.md`：NetDragon 资产工作流较可靠。
4. `docs/superpowers/specs/2026-04-27-*`：设计/计划背景可参考，但有些已从“待实施”变成“已实施”。
5. `README.md`、`docs/framework-analysis.md`、`docs/产品与数据指标说明.md`：有用但部分数据已过期，例如表数量、API 数量、头像生成变量名。

以后写结论前，尽量回到源码和数据库核对，不要只复述历史计划。

## 19. 后续开发建议

- 开始任何改动前先跑 `git status --short --branch`，确认不要覆盖当前未提交迭代。
- 若改 Next API、App Router、Proxy、Server Actions 或 Client Component props，先查 `node_modules/next/dist/docs/`。
- 若改 RBAC，至少检查：`src/lib/authz-constants.ts`、`src/lib/authz.ts`、`src/lib/authz-server.ts`、`src/proxy.ts`、相关 API route、Sidebar、设置页权限 UI。
- 若改指标，统一检查：`src/lib/metric-engine.ts`、`src/lib/metric-defs.ts`、dashboard 组件、生产统计 API、数据导出 API，避免 token/cost 口径分叉。
- 若改数据库 schema，配套更新 Drizzle migration、seed、`local.db`、数据管理 API 和本文档。
- 若改 NetDragon 视觉资产，先改 catalog/prompt，再生成 PNG，后处理 WebP，最后跑 `npm run nd:budget-check`。
- 若改 Docker/部署，注意当前私有包和 native 依赖处理逻辑，不要贸然恢复标准 `npm ci` deps 阶段。
- 文档类改动完成后，至少检查 `test -s agent.md` 和 `git diff -- agent.md`。
