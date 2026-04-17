# 系统设置页面迭代设计

> **日期**: 2026-04-17
> **范围**: 系统设置页面全面重构 — 员工管理增强、指标基准三层覆盖、全数据管理中心
> **目标**: 将系统设置从简单的配置页面升级为统一的数据管理后台，支撑真实业务场景下 AI 员工数据的可视化维护

## 需求决策汇总

| 需求项 | 决策 |
|--------|------|
| 数据管理中心范围 | 全数据后台（metrics + skill_metrics + tasks） |
| 分期策略 | 本次全做 |
| 形象照生成 | API 内异步 fire-and-forget + 前端 5s 轮询状态反馈 |
| 创建表单字段 | 基础信息 + 人格设定 + 技能配置（形象照描述自动生成） |
| 员工列表样式 | 紧凑卡片列表（头像 + 信息 + 指标 + 团队色左边框） |
| 指标基准配置 | 三层覆盖：全局 → 团队 → 员工 |
| 导出格式 | CSV + Excel (.xlsx) |

## 系统设置 Tab 结构

当前 2 个 Tab → 重构为 3 个 Tab：

1. **员工管理** — 紧凑卡片列表 + 增强创建表单 + 在岗/下岗切换
2. **指标基准配置** — 三层覆盖表格（全局/团队/员工 子 Tab 切换）+ CRUD
3. **数据指标管理** — 三个子 Tab（员工绩效/技能指标/任务数据），统一搜索/多选/下钻/导出

---

## 模块一：员工管理

### 1.1 员工列表重设计

**布局**: 紧凑卡片列表，每行一个员工。

**卡片结构**（从左到右）:
- 头像区（48×48 圆角方形，有头像显示头像，无头像显示 fallback 机器人）
- 信息区：第一行=名称 + 状态 Badge + 团队标签；第二行=职位 · 描述（单行截断）
- 指标区：三列数字（本月任务数 / 采纳率 / 准确率），inactive 和非 active 员工显示 "—"
- 操作区：编辑按钮 + 状态切换按钮

**视觉规则**:
- 左边框颜色标识团队：紫色=管理、蓝色=设计、绿色=生产、灰色=下岗
- inactive 员工：整行降低透明度（opacity: 0.7），灰色左边框，指标区隐藏
- developing/planned 员工：指标区显示 "—"（无数据）

**顶部工具栏**:
- 左侧：标题 "AI员工列表 (N人)" + 团队筛选 Tabs（全部/管理/设计/生产）+ 搜索框
- 右侧："+ 新增员工" 按钮

### 1.2 员工状态模型变更

**新增状态**: `inactive`（下岗）

**状态枚举**: `"active" | "developing" | "planned" | "inactive"`

**状态流转**:
```
planned → developing → active ⇄ inactive
```

**操作按钮逻辑**:
- `active` → 显示「下岗」按钮（切换到 inactive）
- `inactive` → 显示「上岗」按钮（切换到 active）
- `developing` / `planned` → 显示「上岗」+「下岗」按钮

**下岗影响**:
- 保留所有历史数据（指标、任务、技能等）
- 从花名册和看板的活跃统计中排除
- 列表中降低视觉权重（低透明度 + 灰色）
- 可随时重新上岗恢复

**删除**: API 保留 DELETE 端点但前端不暴露删除按钮。

### 1.3 新增员工 — 分步表单

在 Dialog 中分 3 步创建，每步聚焦一类信息：

**Step 1/3 — 基础信息**:
- 名称（必填，text）
- 职位（必填，text）
- 团队（必填，select：management / design / production）
- 子团队（条件显示：仅当团队=production 时显示，select：生产管理层 / 内容生产层）
- 状态（select，默认 planned）
- 描述（textarea，可选）

**Step 2/3 — 人格设定**:
- 灵魂 Soul（textarea，可选）— 核心性格与工作哲学
- 身份 Identity（textarea，可选）— 角色定位与背景设定

**Step 3/3 — 技能配置**:
- 动态列表，每个技能项：名称（必填）、等级（1-5，默认 3）、分类（select：核心能力/分析能力/输出能力）、描述（可选）
- 支持添加/删除技能项
- 可选步骤，可跳过（创建后在员工详情中管理）

**进度指示**: 顶部三段进度条，当前步骤高亮。

**提交流程**:
1. 点击「创建员工」→ POST /api/employees 创建员工 → POST /api/employees/[id]/skills 批量创建技能
2. 创建成功 → Dialog 关闭，员工出现在列表中（avatar = null，显示 fallback）
3. 后台异步生成形象照 → 前端轮询 → 头像生成后自动更新

### 1.4 形象照异步生成

**后端流程**:
1. POST /api/employees 创建员工，avatar = null
2. 根据职位自动生成英文外观描述 avatarDescription（用预设模板 + 职位关键词）
3. Fire-and-forget 调用 Gemini API（复用 generate-avatars.ts 中的 generateAvatar 逻辑，提取为共享函数）
4. 成功：保存图片到 `public/avatars/{name}.png`，更新 DB 的 avatar 字段为 `/avatars/{name}.png`
5. 失败：avatar 保持 null，记录错误日志

**前端轮询**:
1. 创建成功后，卡片头像区显示 fallback + "生成中" 旋转动画
2. 每 5 秒轮询 GET /api/employees/[id]/avatar-status
3. status = "completed" → 停止轮询，替换为真实头像（带淡入动画）
4. status = "failed" → 停止轮询，显示 fallback + "重新生成" 按钮
5. 超过 2 分钟未完成 → 停止轮询，显示超时提示

**avatarDescription 自动生成规则**: 从 generate-avatars.ts 现有的 EMPLOYEES 数组提取描述模式，根据团队和职位关键词匹配生成默认描述。用户不需要手动填写。

### 1.5 编辑员工

点击卡片「编辑」按钮打开 Dialog，复用创建表单的 3 步布局但预填现有数据。保存调用 PUT /api/employees/[id]。技能编辑通过单独的 API 处理。

---

## 模块二：指标基准配置

### 2.1 三层覆盖体系

**覆盖优先级**: 员工覆盖 > 团队覆盖 > 全局基准

**层级判断规则**（基于 metricConfigs 表）:
- `employeeId != null` → 员工级覆盖
- `employeeId == null && team != null` → 团队级覆盖
- `employeeId == null && team == null` → 全局基准

**计算公式联动**: 看板和花名册的「节省人时」计算使用此优先级取 baseline：
```
节省人时 = getBaseline(taskType, employeeId, team).humanBaseline × taskCount - AI实际耗时
```

### 2.2 UI 布局 — 三层 Sub-Tab

指标基准配置 Tab 内部分 3 个子 Tab：

**Sub-Tab 1: 全局基准**
- 顶部提示栏：说明覆盖优先级规则
- 表格列：任务类型 | 人工基准耗时(h) | 时薪(¥/h) | 说明 | 覆盖数 | 操作
- 「覆盖数」列：显示该任务类型有多少团队级+员工级覆盖（如 "2 覆盖"），点击可展开查看
- 操作：编辑（行内编辑模式）、删除（AlertDialog 确认）
- 顶部右侧："+ 新增任务类型" 按钮

**Sub-Tab 2: 团队覆盖**
- 团队选择器（3 个按钮：管理团队/设计团队/生产团队）
- 表格列：任务类型 | 全局基准（灰色删除线显示被覆盖的值）| 团队覆盖值 | 时薪覆盖 | 操作
- 仅显示有覆盖值的任务类型，其他自动使用全局基准
- "留空 = 使用全局基准" 的文字提示
- "+ 添加覆盖" 按钮：从全局任务类型中选择，设置团队特有的 humanBaseline 和/或 costPerHour

**Sub-Tab 3: 员工覆盖**
- 员工选择器（下拉框，按团队分组）
- 黄色提示栏：显示当前员工的最终生效值来源（如 "AI审计官 的最终生效值 = 员工覆盖 > 管理团队覆盖 > 全局基准"）
- 表格列：任务类型 | 全局 | 团队 | 员工覆盖 | ✓ 生效值 | 操作
- 「生效值」列：绿色高亮最终取值，标注来源（"6h（员工）" / "4h（团队）" / "2h（全局）"）
- 展示所有任务类型（不只是有覆盖的），让用户看到完整的生效值视图
- "+ 添加覆盖" 按钮：为当前员工添加个性化基准

### 2.3 CRUD 操作

**新增任务类型**（全局基准 Tab）:
- Dialog 表单：任务类型名称（text，必填）、人工基准耗时（number，必填）、时薪（number，默认 46.875）、说明（text，可选）
- POST /api/metric-configs，body: { taskType, humanBaseline, costPerHour, description }

**添加团队覆盖**:
- Dialog：从已有任务类型中选择 → 设置覆盖的 humanBaseline 和/或 costPerHour
- POST /api/metric-configs，body: { taskType, team, humanBaseline, costPerHour }

**添加员工覆盖**:
- 同上，body 增加 employeeId
- POST /api/metric-configs，body: { taskType, employeeId, humanBaseline, costPerHour }

**编辑**: 行内编辑模式，PUT /api/metric-configs/[id]

**删除/移除**: 
- 全局基准删除需 AlertDialog 确认（会影响所有依赖此类型的计算）
- 团队/员工覆盖移除仅删除覆盖记录，回退到上一层

---

## 模块三：数据指标管理中心

### 3.1 整体架构

数据指标管理中心是一个通用的数据管理框架，通过 3 个子 Tab 管理不同数据域，共享统一的工具栏、交互模式和导出能力。

**三个子 Tab**:
1. **📊 员工绩效** (metrics) — 月度任务数、采纳率、准确率、节省人时
2. **⚡ 技能指标** (skill_metrics) — 技能调用次数、成功率、平均响应时间
3. **📋 任务数据** (tasks) — 任务质量分、Token 用量、费用、重试次数

### 3.2 统一工具栏

三个子 Tab 共享同一工具栏框架，部分筛选项根据 Tab 动态调整：

**通用控件**（所有 Tab）:
- 搜索框：员工名称模糊搜索，实时过滤
- 团队筛选：下拉框（全部团队 / 管理 / 设计 / 生产）
- 已选计数：显示 "已选 N 条"
- 批量操作：批量编辑、批量删除
- 导出按钮：CSV、Excel 两个按钮
- 新增按钮："+ 新增记录"

**员工绩效 Tab 额外控件**:
- 时间范围：月份选择器（YYYY-MM）

**技能指标 Tab 额外控件**:
- 时间范围：月份选择器
- 技能分类：下拉框（全部 / 核心能力 / 分析能力 / 输出能力）

**任务数据 Tab 额外控件**:
- 任务状态：下拉框（全部 / running / completed / failed）
- 任务类型：下拉框（从 metricConfigs 中获取所有任务类型）
- 时间范围：日期范围选择器

### 3.3 员工绩效 Tab

**表格列**: 选择框 | 员工（头像+名称）| 团队 | 期间 | 任务数 | 采纳率 | 准确率 | 节省人时(h) | 操作

**新增记录 Dialog**:
- 员工（下拉框，按团队分组）
- 期间（YYYY-MM 格式）
- 期间类型（daily/weekly/monthly，默认 monthly）
- 任务数（number）
- 采纳率（number，0-100%）
- 准确率（number，0-100%）
- 节省人时（number）
- 自定义指标（JSON textarea，可选）

**行内编辑**: 点击「编辑」→ 数值列变为 input，保存/取消按钮。PUT /api/data/metrics/[id]。

**数据联动**: 编辑保存后立即写入 DB。看板 KPI 卡片、花名册员工卡片的指标数字刷新后即反映最新数据。

### 3.4 技能指标 Tab

**表格列**: 选择框 | 员工 | 技能名称 | 分类 | 期间 | 调用次数 | 成功率 | 平均响应时间(ms) | 操作

**新增记录 Dialog**:
- 员工（下拉框）
- 技能（下拉框，根据所选员工动态加载其技能列表）
- 期间（YYYY-MM）
- 调用次数（number）
- 成功率（number，0-100%）
- 平均响应时间（number，ms）

**行内编辑**: 同员工绩效 Tab 模式。PUT /api/data/skill-metrics/[id]。

**数据联动**: 编辑后影响花名册员工详情页的「技能」Tab 数据。

### 3.5 任务数据 Tab

**表格列**: 选择框 | 任务名称 | 员工 | 类型 | 状态 | 质量分 | Token用量 | 预估费用(¥) | 重试次数 | 开始时间 | 操作

**可编辑字段**: qualityScore、retryCount、tokenUsage、status — 其他字段只读

**行内编辑**: 点击「编辑」→ 可编辑字段变为 input/select。PUT /api/data/tasks/[id]。

**状态切换**: status 字段可通过下拉框在 running/completed/failed 间切换。

**费用计算**: 预估费用 = tokenUsage × 单价（显示为 ¥ 格式），与生产看板一致。

**跳转联动**: 任务名称可点击，跳转到生产看板的任务详情 Dialog（/production?taskId=xxx）。

**数据联动**: 编辑后影响生产看板的任务卡片和统计数据。

### 3.6 下钻功能

**面包屑导航**: 全部数据 › 团队 › 员工，支持逐层深入和回退。

**下钻入口**:
- 点击团队标签 → 下钻到该团队的所有数据
- 点击员工名称 → 下钻到该员工的所有数据

**下钻后视图**:
- 顶部：面包屑导航
- 汇总卡片区：4 个 KPI 卡片（根据当前 Tab 显示不同指标），每个卡片显示当前值 + 环比变化
- 数据表格：筛选为当前下钻范围的数据

**员工级下钻**（最深层）:
- 汇总卡片展示当前月指标 + 环比
- 表格展示该员工的历史数据（按期间排列）

### 3.7 多选与批量操作

**选择机制**:
- 每行左侧 Checkbox
- 表头全选 Checkbox（选择当前页）
- 工具栏显示已选数量

**批量编辑**:
- 选择多行后点击「批量编辑」→ Dialog 显示可批量修改的字段
- 员工绩效：可批量修改 taskCount、adoptionRate、accuracyRate
- 技能指标：可批量修改 invocationCount、successRate、avgResponseTime
- 任务数据：可批量修改 qualityScore、status

**批量删除**:
- AlertDialog 确认 → DELETE /api/data/{type}，body: { ids: [...] }

### 3.8 导出功能

**CSV 导出**:
- 导出当前筛选结果（遵循搜索、团队筛选、时间范围等条件）
- UTF-8 BOM 头确保 Excel 正确显示中文
- 文件名格式：`{数据类型}_{团队}_{时间范围}.csv`

**Excel 导出**:
- 使用 SheetJS (xlsx) 库
- 按团队分 Sheet（如果未筛选团队）
- 表头加粗样式
- 数值列右对齐
- 文件名格式：`{数据类型}_{时间范围}.xlsx`

### 3.9 分页

- 默认每页 20 条
- 底部分页器：页码按钮 + 总条数显示
- 记住用户的每页条数偏好（sessionStorage）

---

## 模块四：Schema 变更 & API 设计

### 4.1 Schema 变更

**employees 表**:
- status 枚举扩展：`"active" | "developing" | "planned"` → `"active" | "developing" | "planned" | "inactive"`
- 新增列：`avatarDescription: text("avatar_description")` — nullable，英文外观描述，用于 Gemini 生成头像

**metricConfigs 表**:
- 新增列：`team: text("team")` — nullable，值为 `"management" | "design" | "production"`
- 层级判断：employeeId 有值 → 员工级；team 有值 → 团队级；都为 null → 全局

**无新表**: 所有数据管理中心功能基于现有 metrics、skill_metrics、tasks 表，不新增表。

### 4.2 API 端点设计

#### 员工管理 API

| 端点 | 方法 | 变更类型 | 描述 |
|------|------|----------|------|
| /api/employees | POST | 增强 | 接受完整字段（含 soul/identity/description/subTeam），创建后异步触发形象照生成。不含 skills，技能通过单独端点创建。 |
| /api/employees/[id] | PUT | 增强 | 补齐 subTeam 字段更新；支持 status → inactive 切换 |
| /api/employees/[id] | DELETE | 保留 | API 保留但前端不暴露删除按钮 |
| /api/employees/[id]/avatar | POST | 新增 | 触发单个员工形象照生成（异步），返回 { status: "generating" } |
| /api/employees/[id]/avatar-status | GET | 新增 | 查询形象照生成状态（generating/completed/failed），前端轮询用 |
| /api/employees/[id]/skills | POST | 新增 | 批量创建技能（创建员工时 Step 3 使用，也用于后续技能管理） |

#### 指标基准配置 API

| 端点 | 方法 | 变更类型 | 描述 |
|------|------|----------|------|
| /api/metric-configs | GET | 增强 | 支持 ?level=global\|team\|employee、?team=xxx、?employeeId=xxx 筛选 |
| /api/metric-configs | POST | 增强 | 支持 team 字段，创建团队级/员工级覆盖 |
| /api/metric-configs/[id] | PUT | 不变 | 更新配置 |
| /api/metric-configs/[id] | DELETE | 不变 | 删除配置 |
| /api/metric-configs/resolve | GET | 新增 | 返回某员工某任务类型的最终生效值（三层覆盖解析后），?taskType=xxx&employeeId=xxx |

#### 数据指标管理 API

所有列表端点支持通用查询参数：`?page=1&pageSize=20&search=xxx&team=xxx&sort=field&order=asc|desc`

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/data/metrics | GET | 员工绩效列表，额外参数：?period=YYYY-MM、?employeeId=xxx |
| /api/data/metrics | POST | 创建绩效记录 |
| /api/data/metrics/[id] | PUT | 更新绩效记录 |
| /api/data/metrics | DELETE | 批量删除，body: { ids: [...] } |
| /api/data/skill-metrics | GET | 技能指标列表，额外参数：?period=YYYY-MM、?category=xxx、?skillName=xxx |
| /api/data/skill-metrics | POST | 创建技能指标记录 |
| /api/data/skill-metrics/[id] | PUT | 更新技能指标记录 |
| /api/data/skill-metrics | DELETE | 批量删除，body: { ids: [...] } |
| /api/data/tasks | GET | 任务数据列表，额外参数：?status=xxx、?type=xxx、?startDate=xxx&endDate=xxx |
| /api/data/tasks/[id] | PUT | 更新任务可编辑字段（qualityScore/retryCount/tokenUsage/status） |
| /api/data/tasks | DELETE | 批量删除，body: { ids: [...] } |

#### 导出 API

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/data/export | GET | 统一导出端点。参数: ?type=metrics\|skill-metrics\|tasks&format=csv\|xlsx + 筛选条件。返回文件流。 |

### 4.3 形象照生成改造

**现状**: `scripts/generate-avatars.ts` 是批量脚本，员工列表硬编码。

**改造方案**:
1. 从脚本中提取 `generateAvatar(name, description, outputDir)` 为独立模块 `src/lib/avatar-generator.ts`
2. 该模块导出 `generateSingleAvatar(employeeId, name, description)` 函数
3. POST /api/employees 创建成功后，fire-and-forget 调用此函数
4. POST /api/employees/[id]/avatar 也调用此函数（手动重试场景）
5. avatarDescription 自动生成：根据团队和职位用预设模板生成英文描述

**原有批量脚本保留**: `npm run generate:avatars` 继续可用，用于批量补生成。

### 4.4 新增依赖

| 依赖 | 用途 | 大小 |
|------|------|------|
| xlsx (SheetJS) | Excel 导出 | ~300KB gzipped |

CSV 导出纯手写实现，不需要额外库。

### 4.5 文件结构预估

```
src/
├── app/
│   ├── settings/
│   │   └── page.tsx                    # 增强：3 Tab 布局
│   └── api/
│       ├── employees/
│       │   └── [id]/
│       │       ├── avatar/route.ts     # 新增
│       │       ├── avatar-status/route.ts # 新增
│       │       └── skills/route.ts     # 新增
│       ├── metric-configs/
│       │   └── resolve/route.ts        # 新增
│       └── data/
│           ├── metrics/
│           │   ├── route.ts            # 新增：GET + POST + DELETE
│           │   └── [id]/route.ts       # 新增：PUT
│           ├── skill-metrics/
│           │   ├── route.ts            # 新增
│           │   └── [id]/route.ts       # 新增
│           ├── tasks/
│           │   ├── route.ts            # 新增：GET + DELETE
│           │   └── [id]/route.ts       # 新增：PUT
│           └── export/route.ts         # 新增
├── components/settings/
│   ├── employee-manager.tsx            # 重写
│   ├── employee-create-dialog.tsx      # 新增：分步表单
│   ├── employee-edit-dialog.tsx        # 新增
│   ├── metric-config-manager.tsx       # 重写
│   ├── metric-config-global.tsx        # 新增
│   ├── metric-config-team.tsx          # 新增
│   ├── metric-config-employee.tsx      # 新增
│   ├── data-management/
│   │   ├── data-management-center.tsx  # 新增：主容器
│   │   ├── data-toolbar.tsx            # 新增：统一工具栏
│   │   ├── data-table.tsx              # 新增：通用数据表格
│   │   ├── data-breadcrumb.tsx         # 新增：下钻面包屑
│   │   ├── data-summary-cards.tsx      # 新增：下钻汇总卡片
│   │   ├── metrics-tab.tsx             # 新增
│   │   ├── skill-metrics-tab.tsx       # 新增
│   │   ├── tasks-tab.tsx               # 新增
│   │   ├── record-dialog.tsx           # 新增：通用新增/编辑 Dialog
│   │   └── export-utils.ts            # 新增：CSV/Excel 导出逻辑
│   └── shared/
│       └── inline-edit.tsx             # 新增：行内编辑组件
└── lib/
    ├── avatar-generator.ts             # 新增：形象照生成模块
    └── types.ts                        # 增强：新增类型定义
```

