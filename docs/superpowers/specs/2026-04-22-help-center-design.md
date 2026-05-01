# 帮助中心（Help Center）设计文档

> 日期：2026-04-22
> 状态：已批准，待实现

## 1. 概述

为 AI Workforce Platform 新增应用内帮助中心功能。用户可通过侧边栏底部按钮打开侧滑面板，浏览结构化的产品文档。管理员可在系统设置中通过富文本编辑器维护文档内容。

### 1.1 目标用户

- 内部管理层：快速理解 KPI 含义和数据逻辑
- 运营/产品同事：了解每个功能的使用方法和数据来源
- 新人/演示对象：从零了解整个产品

### 1.2 核心需求

1. **阅读面板**：侧滑面板（Slide-over），Tab + 卡片列表，搜索过滤，文章详情阅读
2. **编辑后台**：在 /settings 页新增 Tab，支持分类和文章的 CRUD，Tiptap 富文本编辑器
3. **数据存储**：SQLite 数据库，为后续权限控制做准备
4. **初始数据**：将现有 `docs/产品与数据指标说明.md` 内容拆分为初始文章

## 2. 数据库设计

新增 2 张表，遵循项目现有约定（text PK UUID、integer timestamp、cascade delete）。

### 2.1 help_categories（帮助文档分类）

| 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | text | PRIMARY KEY | UUID |
| name | text | NOT NULL | 分类名称，如"快速开始" |
| icon | text | | emoji 或 lucide 图标名 |
| sortOrder | integer | NOT NULL, default 0 | 排序权重（升序） |
| createdAt | integer | timestamp | 创建时间 |
| updatedAt | integer | timestamp | 更新时间 |

### 2.2 help_articles（帮助文档文章）

| 列名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | text | PRIMARY KEY | UUID |
| categoryId | text | FK → help_categories (cascade) | 所属分类 |
| title | text | NOT NULL | 文章标题 |
| summary | text | | 卡片摘要文字 |
| content | text | NOT NULL | Tiptap 输出的 HTML |
| sortOrder | integer | NOT NULL, default 0 | 分类内排序（升序） |
| createdAt | integer | timestamp | 创建时间 |
| updatedAt | integer | timestamp | 更新时间 |

## 3. API 路由

### 3.1 分类接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/help/categories` | 获取所有分类（含文章数量），按 sortOrder 升序 |
| POST | `/api/help/categories` | 新增分类（name, icon, sortOrder） |
| PUT | `/api/help/categories/[id]` | 更新分类 |
| DELETE | `/api/help/categories/[id]` | 删除分类（级联删除文章） |

### 3.2 文章接口

| 方法 | 路径 | 参数 | 说明 |
|---|---|---|---|
| GET | `/api/help/articles` | `?categoryId=&search=` | 文章列表（title + summary，不含 content） |
| POST | `/api/help/articles` | body: categoryId, title, summary, content, sortOrder | 新增文章 |
| GET | `/api/help/articles/[id]` | — | 文章详情（含 content） |
| PUT | `/api/help/articles/[id]` | body: 部分字段 | 更新文章 |
| DELETE | `/api/help/articles/[id]` | — | 删除文章 |

搜索逻辑：`search` 参数对 `title` 和 `summary` 做 SQL LIKE 查询。

## 4. UI 设计

### 4.1 侧边栏入口

在 `src/components/nav/sidebar.tsx` 的 `<nav>` 后面、`</aside>` 前面添加帮助按钮：

- 图标：`HelpCircle`（lucide-react）
- 位置：sidebar 底部，与导航图标同样式
- Tooltip："帮助中心"
- 点击：切换帮助面板的显示/隐藏

状态管理：使用 React Context（`HelpPanelContext`）。因 `layout.tsx` 是 server component，需创建独立的 client wrapper 组件（如 `HelpPanelProvider`）在 `layout.tsx` 中包裹 `<Sidebar>` 和 `<HelpPanel>`，使两者共享 `isOpen` / `toggle` 状态。

### 4.2 阅读面板（Slide-over）

**组件**：`src/components/help/help-panel.tsx`

**位置**：在 `layout.tsx` 中，与 `<Sidebar>` 和 `<main>` 同级渲染。

**布局**：
- 固定定位，左侧偏移 64px（sidebar 宽度），宽度 420px
- 半透明遮罩层覆盖 main 区域
- 滑入/滑出动画 300ms（CSS transition: transform）
- z-index 高于 main 内容

**两种状态**：

**状态一：文章列表**
- 头部：标题"帮助中心" + 关闭按钮
- 搜索框：输入即搜索（debounce 300ms），调用 `GET /api/help/articles?search=`
- Tab 栏：从 `GET /api/help/categories` 动态加载，水平滚动（如 Tab 过多）
- 文章卡片列表：每张卡片显示 emoji + title + summary + 右箭头，点击进入详情

**状态二：文章详情**
- 面包屑导航：← 返回按钮 / 分类名 / 文章标题
- 文章标题 + 更新时间
- HTML 内容渲染：使用 `innerHTML` 渲染（内容来源可信——管理员编辑）；实现时须先通过 DOMPurify 净化 HTML，防范 XSS
- 富文本样式：通过 `.help-article-content` CSS 类控制 h1-h4、p、table、code、ul/ol 等样式

### 4.3 编辑后台

**入口**：`/settings` 页面新增第 4 个 Tab「帮助文档管理」。

**组件**：`src/components/settings/help-doc-manager.tsx`

**布局**：左侧分类列表（固定宽度 200px）+ 右侧文章列表/编辑区

**分类管理（左侧）**：
- 分类列表，点击切换右侧文章
- 底部"+ 新增分类"按钮
- 每个分类可内联编辑名称、图标
- 删除分类需 AlertDialog 确认

**文章列表（右侧，默认状态）**：
- 顶部：「+ 新增文章」按钮 + 搜索框
- 表格或卡片列表：标题、摘要、更新时间、操作（编辑/删除）
- 删除需 AlertDialog 确认

**文章编辑（右侧，编辑状态）**：
- 顶部：「← 返回文章列表」
- 表单字段：标题（input）、摘要（textarea）
- Tiptap 编辑器区域：
  - 工具栏：标题(H1-H3)、加粗、斜体、下划线、有序列表、无序列表、表格、代码块、分隔线
  - 编辑区：富文本编辑，所见即所得
- 底部：取消 + 保存按钮

### 4.4 富文本编辑器

**库**：Tiptap（@tiptap/react）

**需要安装的包**：
- `@tiptap/react` — React 集成
- `@tiptap/starter-kit` — 基础扩展集（标题、加粗、斜体、列表、代码块、引用等）
- `@tiptap/extension-table`、`@tiptap/extension-table-row`、`@tiptap/extension-table-cell`、`@tiptap/extension-table-header` — 表格支持
- `@tiptap/extension-underline` — 下划线
- `@tiptap/extension-placeholder` — 占位提示文字
- `@tiptap/extension-highlight` — 文字高亮

**编辑器组件**：`src/components/help/tiptap-editor.tsx`
- 接收 `content: string`（HTML）和 `onChange: (html: string) => void`
- 工具栏为独立组件，通过 editor 实例控制格式

## 5. 状态管理

### 5.1 HelpPanelContext

```typescript
// src/components/help/help-panel-context.tsx
interface HelpPanelContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}
```

Provider 包裹在 `layout.tsx` 的 flex 容器内。Sidebar 通过 `toggle()` 控制面板，面板通过 `close()` 关闭自身。

### 5.2 面板内部状态

面板内部使用 `useState` 管理：
- `activeCategory: string | null` — 当前选中的分类 ID
- `selectedArticle: string | null` — 当前查看的文章 ID（非 null 时显示详情视图）
- `searchQuery: string` — 搜索关键词

## 6. 文件结构

```
src/
├── components/
│   ├── help/
│   │   ├── help-panel-context.tsx    — Context provider
│   │   ├── help-panel.tsx            — 阅读面板主组件
│   │   ├── help-article-list.tsx     — 文章卡片列表
│   │   ├── help-article-detail.tsx   — 文章详情阅读
│   │   ├── help-article-content.css  — 富文本阅读样式
│   │   └── tiptap-editor.tsx         — Tiptap 编辑器封装
│   ├── settings/
│   │   └── help-doc-manager.tsx      — 编辑后台主组件
│   └── nav/
│       └── sidebar.tsx               — 修改：添加帮助按钮
├── app/
│   ├── layout.tsx                    — 修改：添加 HelpPanelProvider + HelpPanel
│   └── api/help/
│       ├── categories/
│       │   ├── route.ts              — GET, POST
│       │   └── [id]/route.ts         — PUT, DELETE
│       └── articles/
│           ├── route.ts              — GET, POST
│           └── [id]/route.ts         — GET, PUT, DELETE
└── db/
    ├── schema.ts                     — 修改：添加 helpCategories, helpArticles 表
    └── seed.ts                       — 修改：添加帮助文档初始数据
```

## 7. 初始数据（Seed）

将 `docs/产品与数据指标说明.md` 的 9 个章节拆分为 15 篇文章，分配到 4 个分类：

| 分类 | sortOrder | 文章 |
|---|---|---|
| 🚀 快速开始 | 1 | 平台简介、团队组织、快速上手指南 |
| 📊 功能模块 | 2 | 驾驶舱指南、花名册指南、生产看板指南、组织架构指南、系统设置指南 |
| 📋 数据指标 | 3 | 核心运营指标、任务质量指标、技能指标、游戏化与成就系统、指标配置体系 |
| ⚙️ 任务工作流 | 4 | 任务类型与 SOP 步骤、步骤状态流转与反思 |

Seed 数据中的 content 为 HTML 格式，从 markdown 文档手动转换，确保表格、代码块、列表等格式正确。

## 8. 修改清单

### 8.1 需修改的现有文件
- `src/db/schema.ts` — 新增 helpCategories、helpArticles 表定义
- `src/db/seed.ts` — 新增帮助文档初始数据
- `src/components/nav/sidebar.tsx` — 添加底部帮助按钮
- `src/app/layout.tsx` — 添加 HelpPanelProvider 和 HelpPanel 组件
- `src/app/settings/page.tsx` — 在 settings 数据获取中加入帮助文档数据
- `src/components/settings/` 下的 settings Tab 容器 — 新增第 4 个 Tab

### 8.2 需新增的文件
- `src/components/help/help-panel-context.tsx`
- `src/components/help/help-panel.tsx`
- `src/components/help/help-article-list.tsx`
- `src/components/help/help-article-detail.tsx`
- `src/components/help/help-article-content.css`
- `src/components/help/tiptap-editor.tsx`
- `src/components/settings/help-doc-manager.tsx`
- `src/app/api/help/categories/route.ts`
- `src/app/api/help/categories/[id]/route.ts`
- `src/app/api/help/articles/route.ts`
- `src/app/api/help/articles/[id]/route.ts`

### 8.3 需安装的依赖
- `@tiptap/react`
- `@tiptap/starter-kit`
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-table-header`
- `@tiptap/extension-underline`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-highlight`
- `dompurify` — HTML 净化（阅读面板渲染时使用）
- `@types/dompurify` — TypeScript 类型

## 9. 范围外（后续迭代）

以下功能明确不在本次实现范围内：
- 权限控制（管理员 vs 普通用户编辑权限）
- 文章版本历史
- 文章间的交叉引用/链接
- 国际化（当前仅中文）
- 文章评分/反馈机制
- 图片上传（编辑器内暂不支持图片插入）
