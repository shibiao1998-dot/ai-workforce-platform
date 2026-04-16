# 热力图修复 + AI员工头像系统设计

## 背景

两个需求合并在一起：
1. Dashboard 热力图不显示（SQL bug）+ 改为橙色渐变
2. 员工花名册和详情页的 2D 头像形象，支持上传替换

## 一、热力图修复 + 橙色渐变

### Bug 修复

`src/app/dashboard/page.tsx` 的 `getHeatmap()` 函数（第 87、92 行）仍包含 `/ 1000` 除法。Drizzle `{ mode: "timestamp" }` 存的已经是 Unix 秒，再除以 1000 产生 1970 年日期，与近 30 天窗口不匹配 → 空数组。

修复：移除两处 `/ 1000`。

### 颜色改为橙色渐变

`src/components/dashboard/activity-heatmap.tsx` 的 visualMap 渐变色从蓝色改为橙色：

```
["#fff7ed", "#fed7aa", "#fb923c", "#f97316", "#ea580c"]
```

对应 Tailwind orange-50 → orange-200 → orange-400 → orange-500 → orange-600。

Cell borderColor 改为 `"#ffffff"` 确保白底上单元格边界清晰可见。

### 改动文件

- `src/app/dashboard/page.tsx`：移除 `/ 1000`（2 处）
- `src/components/dashboard/activity-heatmap.tsx`：渐变色 + borderColor

## 二、AI员工头像系统

### 架构

头像分两层：
- **默认头像**：`AiAvatar` 组件，用纯 SVG 基于员工 id + team 确定性生成独特的 2D 机器人形象
- **自定义头像**：员工 `avatar` 字段（DB 已有，当前全为 null）存储上传图片路径，优先展示自定义头像

### AiAvatar 组件

`src/components/shared/ai-avatar.tsx`

- 输入 props：`employeeId: string`，`team: string`，`avatar: string | null`，`name: string`，`size: "sm" | "md" | "lg"`
- 如果 `avatar` 有值，显示 `<img>` 圆角图片
- 如果 `avatar` 为 null，显示 SVG 生成的默认头像
- SVG 生成规则：
  - 基于 `employeeId` 的简单哈希确定性选择变体（同一员工永远同一头像）
  - 团队配色：management=紫色系(#7c3aed)，design=蓝色系(#2563eb)，production=绿色系(#16a34a)
  - 机器人造型：圆形/方形头部、两只眼睛（圆形/方形变体）、天线（直线/弧形变体）、嘴巴（微笑/直线变体）
  - 通过哈希选择 4 个维度的变体组合，产生多样性
- 尺寸映射：`sm`=40px（卡片），`md`=56px，`lg`=80px（详情页）

### 头像上传

`src/components/shared/avatar-upload.tsx`

- 点击头像区域弹出文件选择器
- 接受 `image/*` 格式
- 前端将图片转为 base64 Data URL 直接存入 `avatar` 字段（MVP 简单方案，无需文件服务器）
- 调用 `PUT /api/employees/:id` 更新 avatar 字段
- 上传成功后即时更新 UI

### 使用位置

| 位置 | 文件 | 变化 |
|------|------|------|
| 员工卡片 | `src/components/roster/employee-card.tsx` | 替换字母头像为 `<AiAvatar size="sm">` |
| 员工详情 profile tab | `src/components/roster/tabs/profile-tab.tsx` | 替换字母占位为 `<AvatarUpload>` 包裹 `<AiAvatar size="lg">`，点击可上传 |
| 员工详情 header | `src/components/roster/employee-detail.tsx` | tab 栏上方添加头像 + 姓名 header |

### 数据层

- DB schema 已有 `avatar: text("avatar")` — 无需改动
- TypeScript 类型已有 `avatar: string | null` — 无需改动
- `PUT /api/employees/:id` 已支持更新全部字段 — 无需改动
- Seed 数据保持 `avatar: null`，依赖 SVG 默认头像

### 不需要的改动

- 不改 DB schema
- 不改 API
- 不改 types
- 不改 seed 数据

## 验证

1. Dashboard 热力图显示橙色渐变数据
2. 花名册卡片显示每个员工独特的 SVG 机器人头像
3. 员工详情页显示大尺寸头像
4. 点击详情页头像可上传图片替换
5. 上传后花名册卡片和详情页都显示新头像
