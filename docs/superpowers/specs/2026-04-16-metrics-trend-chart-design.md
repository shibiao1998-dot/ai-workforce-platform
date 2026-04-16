# 明亮商务风格改版 + 员工指标趋势图

## 背景

两个变更合并在一起：
1. 全系统从暗色科幻风格改为明亮商务风格
2. 员工详情页「指标」tab 用 ECharts 双 Y 轴折线图替换 "趋势图表将在 Phase 2 实现" 占位符

## 一、全局色调：暗 → 明亮商务风

### 设计方向

- 白色/浅灰背景，深灰/黑色文字
- 专业蓝作为主色调（替代霓虹青），辅以柔和的商务色板
- 卡片白底带轻微阴影，清晰的层级感
- 去掉所有发光效果和霓虹色

### 新色板

**CSS 变量（明亮商务风）：**

| 变量 | 新值 | 说明 |
|------|------|------|
| `--background` | `hsl(0 0% 98%)` | 极浅灰页面背景 |
| `--foreground` | `hsl(222 47% 11%)` | 深色文字 |
| `--card` | `hsl(0 0% 100%)` | 纯白卡片 |
| `--card-foreground` | `hsl(222 47% 11%)` | 深色文字 |
| `--primary` | `hsl(217 91% 50%)` | 商务蓝 (#2563eb) |
| `--primary-foreground` | `hsl(0 0% 100%)` | 白色 |
| `--secondary` | `hsl(220 14% 96%)` | 极浅灰 |
| `--secondary-foreground` | `hsl(220 9% 46%)` | 中灰文字 |
| `--muted` | `hsl(220 14% 96%)` | 极浅灰 |
| `--muted-foreground` | `hsl(220 9% 46%)` | 中灰文字 |
| `--accent` | `hsl(220 14% 96%)` | 极浅灰 |
| `--accent-foreground` | `hsl(222 47% 11%)` | 深色文字 |
| `--destructive` | `hsl(0 72% 51%)` | 红色 |
| `--border` | `hsl(220 13% 91%)` | 浅灰边框 |
| `--input` | `hsl(220 13% 91%)` | 浅灰输入框 |
| `--ring` | `hsl(217 91% 50%)` | 蓝色焦点 |
| `--sidebar` | `hsl(0 0% 100%)` | 白色侧边栏 |
| `--sidebar-foreground` | `hsl(222 47% 11%)` | 深色 |
| `--sidebar-primary` | `hsl(217 91% 50%)` | 蓝色 |
| `--sidebar-border` | `hsl(220 13% 91%)` | 浅灰 |

**新强调色板（用于图表、KPI、团队颜色）：**

| 用途 | 暗色时代 | 新色值 | 说明 |
|------|---------|--------|------|
| 蓝色强调 | `#00d4ff` | `#2563eb` | 商务蓝 |
| 绿色强调 | `#00ff88` | `#16a34a` | 沉稳绿 |
| 黄色强调 | `#ffd93d` | `#d97706` | 琥珀/橙 |
| 紫色强调 | `#c084fc` | `#7c3aed` | 深紫 |
| 红色强调 | `#ff6b6b` | `#dc2626` | 标准红 |

**ECharts 轴样式（明亮版）：**

| 元素 | 暗色时代 | 新色值 |
|------|---------|--------|
| 轴标签 | `#94a3b8` | `#64748b` (slate-500) |
| 轴线 | `#334155` | `#cbd5e1` (slate-300) |
| 分割线 | `#1e293b` | `#e2e8f0` (slate-200) |
| 图例文字 | `#94a3b8` | `#475569` (slate-600) |

**状态颜色（明亮版 badge）：**

| 状态 | 旧 | 新 |
|------|-----|-----|
| running | `bg-blue-500/20 text-blue-400` | `bg-blue-50 text-blue-700 border-blue-200` |
| completed | `bg-green-500/20 text-green-400` | `bg-green-50 text-green-700 border-green-200` |
| failed | `bg-red-500/20 text-red-400` | `bg-red-50 text-red-700 border-red-200` |

**员工状态（明亮版）：**

| 状态 | 新 |
|------|-----|
| active | `bg-green-50 text-green-700` |
| developing | `bg-amber-50 text-amber-700` |
| planned | `bg-gray-100 text-gray-600` |

### 需要修改的文件

| 文件 | 改动 |
|------|------|
| `src/app/globals.css` | 替换全部 `:root` CSS 变量为明亮色值；`@theme inline` 中的 `--color-*` 映射不变（它们引用变量） |
| `src/app/layout.tsx` | 移除 `<html>` 上的 `dark` class |
| `src/components/dashboard/activity-heatmap.tsx` | 替换 4 处硬编码暗色 hex → 明亮版色值；heatmap 渐变改为浅底到蓝色 |
| `src/components/dashboard/team-comparison-chart.tsx` | 替换 ~10 处轴/网格暗色 hex；强调色改为商务色板 |
| `src/components/dashboard/kpi-card.tsx` | `ACCENT_CLASSES` 中 5 个霓虹色 → 商务色板；移除 cyan glow boxShadow |
| `src/components/dashboard/task-feed.tsx` | `TEAM_COLOR` 3 个霓虹色 → 商务色板；状态 badge 改为明亮版 |
| `src/components/org/org-chart.tsx` | ~15 处 inline style 暗色值全部替换（节点渐变→白底，文字→深色，canvas bg→浅灰，controls/minimap 背景→白色） |
| `src/components/production/running-tasks-panel.tsx` | 团队渐变 + 状态 badge 改为明亮版 |
| `src/components/production/task-history-table.tsx` | 状态 badge 改为明亮版 |
| `src/components/production/task-detail.tsx` | 状态 badge 改为明亮版 |
| `src/components/settings/employee-manager.tsx` | 状态 badge 改为明亮版 |

## 二、员工指标趋势折线图

### 改动文件

`src/components/roster/tabs/metrics-tab.tsx`

### 数据处理

在组件内完成，无需新 API：
1. 从 `metrics` prop 筛选 `periodType === "monthly"`，按 `period` 升序排列
2. 提取 4 个序列：`taskCount`（整数）、`humanTimeSaved`（小时）、`adoptionRate * 100`（%）、`accuracyRate * 100`（%）

### ECharts 配置

- 双 Y 轴：左轴数值（任务数+工时），右轴百分比（采用率+准确率）
- 4 条折线颜色使用新商务色板：蓝(`#2563eb`)、绿(`#16a34a`)、琥珀(`#d97706`)、紫(`#7c3aed`)
- 轴/网格样式使用明亮版 ECharts 配置
- `smooth: true`，`trigger: "axis"` tooltip，顶部 legend
- 固定高度 280px，`backgroundColor: "transparent"`
- 空数据显示 "暂无趋势数据"

## 验证

1. 所有 5 个页面（Dashboard、花名册、生产看板、组织架构、设置）视觉检查：白底、深色文字、无暗色残留
2. Dashboard 的 KPI 卡片、柱状图、雷达图、热力图、任务流颜色正确
3. 组织架构图节点、控件、小地图都是明亮风格
4. 员工详情 → 指标 tab：KPI 卡片正常 + 下方出现折线图
5. 折线图双 Y 轴、tooltip、图例交互正常
