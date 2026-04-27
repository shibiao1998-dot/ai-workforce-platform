# 权限管控系统设计

**日期**:2026-04-27
**状态**:设计完成,待实施
**上下文**:基于已接入的 UC SSO 登录,为平台增加基于角色的访问控制(RBAC)

---

## 1. 背景与目标

### 1.1 当前状态

- UC SSO 已接入,登录成功后通过 HMAC 签名 cookie 维持 session(`src/lib/auth.ts`)
- Middleware(`src/proxy.ts`)只做认证(是否登录),不做授权(能做什么)
- 26 个 API 路由均**无任何权限检查**,任何登录用户可执行所有 CRUD
- Sidebar/按钮对所有登录用户一视同仁

### 1.2 目标

为平台 CRUD 操作建立 RBAC 权限模型:

1. 以**模块** × **动作**为权限单元(6 模块 × 3 动作 = 18 原子权限)
2. 支持管理员在 UI 中创建**自定义角色**并分配权限
3. 把 UC 用户映射到角色,登录时加载其权限
4. Middleware、API、UI 三层协同,确保无权用户既看不见也做不到
5. 权限变更写入**审计日志**

### 1.3 非目标

- 不做 role 继承 / role-group
- 不做业务数据级审计(谁改了员工 X 的头像)—— 只审计权限变更
- 不做"离线预授权"(UC 无列举接口,新用户必须先登录才能授权)
- 不重构现有认证层(复用 `src/lib/auth.ts`)

---

## 2. 权限模型

### 2.1 模块划分(6 个,与现有代码对应)

| Module key | 显示名 | 涵盖路由 |
|---|---|---|
| `employees` | 员工管理 | `/roster`, `/api/employees/*` |
| `production` | 生产看板 | `/production`, `/api/tasks/*`, `/api/production-stats` |
| `org` | 组织架构 | `/org` |
| `dashboard` | KPI 仪表盘 | `/dashboard`, `/api/dashboard/*` |
| `help` | 帮助文档 | 帮助面板 + `/api/help/*` |
| `settings` | 系统设置 | `/settings/*`, `/api/metric-configs/*`, `/api/data/*` |

### 2.2 动作(3 个)

- `read`:查看列表 / 详情 / 导出
- `write`:创建 / 修改
- `delete`:删除

三个动作互相独立。UI 允许任意勾选组合,但在保存时给出友好提示(delete 不含 read 会有 toast 警告,不阻止)。

### 2.3 内置角色(3 个,`is_system=true`)

| name | displayName | 默认权限 |
|---|---|---|
| `super-admin` | 超级管理员 | 全部 18 原子权限 |
| `viewer` | 查看者 | 6 模块 × `read` |
| `default` | 默认用户 | 5 业务模块 × `read`(不含 `settings`)|

**内置角色不可在 UI 编辑或删除**。

### 2.4 首任 super-admin 产生方式

`.env.local` 增加:

```
SUPER_ADMIN_UC_IDS=1000123,1000456
```

逗号分隔的 UC userId 白名单。登录流程首次见到白名单用户时自动赋予 `super-admin` 角色。

---

## 3. 数据模型

新增 4 张表,追加到 `src/db/schema.ts`。

### 3.1 roles

```typescript
export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

### 3.2 role_permissions

```typescript
export const rolePermissions = sqliteTable("role_permissions", {
  id: text("id").primaryKey(),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  module: text("module", {
    enum: ["employees", "production", "org", "dashboard", "help", "settings"]
  }).notNull(),
  action: text("action", { enum: ["read", "write", "delete"] }).notNull(),
}, (t) => ({
  unq: uniqueIndex("role_perm_unq").on(t.roleId, t.module, t.action),
}));
```

### 3.3 user_roles

```typescript
export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  ucUserId: text("uc_user_id").notNull().unique(),
  nickname: text("nickname").notNull(),
  avatar: text("avatar"),
  roleId: text("role_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

**`onDelete: "restrict"`** 确保删除角色前先解除用户关联。

### 3.4 audit_logs

```typescript
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  operatorUcId: text("operator_uc_id").notNull(),
  operatorNickname: text("operator_nickname").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: text("details"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

---

## 4. 授权逻辑

### 4.1 核心库 `src/lib/authz.ts`

导出类型安全常量和函数:

```typescript
export const MODULES = ["employees", "production", "org", "dashboard", "help", "settings"] as const;
export const ACTIONS = ["read", "write", "delete"] as const;

export type Module = typeof MODULES[number];
export type Action = typeof ACTIONS[number];
export type Permission = `${Module}.${Action}`;

export type UserPermissions = Record<Module, Action[]>;

/** 加载某 UC 用户的全部权限(按 role_permissions 展开)*/
export async function getPermissions(ucUserId: string): Promise<UserPermissions>;

/** 判断是否有某权限 */
export function can(perms: UserPermissions, module: Module, action: Action): boolean;

/** API handler 用:无权则抛 403 */
export async function requirePermission(request: Request, module: Module, action: Action): Promise<SessionUser>;
```

**React.cache 包装 `getPermissions`**,使同一请求内多次调用只查一次库。

### 4.2 Middleware 职责拆分

`src/proxy.ts` 只做两件事:

1. **认证**:未登录 → `/login`(现状,保留)
2. **粗粒度页面级授权**:维护 `PATH_TO_MODULE` 正则映射表,无 `${module}.read` 权限 → `/403`

```typescript
const PATH_TO_MODULE: Array<[RegExp, Module]> = [
  [/^\/roster/, "employees"],
  [/^\/production/, "production"],
  [/^\/org/, "org"],
  [/^\/dashboard/, "dashboard"],
  [/^\/settings/, "settings"],
];
```

**API 路由的 `write/delete` 权限不在 middleware 做**,因为 middleware 难以区分 GET/POST 的 module 含义且无法抛带详情的 403。API 授权统一在 route handler 里用 `requirePermission(request, module, action)` 显式调用。

### 4.3 API handler 示例

```typescript
// src/app/api/employees/[id]/route.ts
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await requirePermission(request, "employees", "delete");
  // ... 原有删除逻辑
}
```

26 个路由的埋点位置在 Plan 中逐个列出。

### 4.4 新页面上线 checklist(写入 plan)

新增页面时必须同步:

1. `PATH_TO_MODULE` 增加正则
2. 对应 API 路由加 `requirePermission`
3. Sidebar 或入口按钮用 `perms[module].includes("read")` 过滤

---

## 5. 前端权限消费

### 5.1 `/api/auth/me` 响应扩展

```typescript
{
  userId: string,
  nickname: string,
  avatar: string,
  role: { name: string, displayName: string },
  permissions: UserPermissions,  // e.g. { employees: ["read", "write"], ... }
}
```

### 5.2 Server Component 读取

新增 `src/lib/authz-server.ts`:

```typescript
export const getCurrentUserWithPermissions = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const permissions = await getPermissions(user.userId);
  return { ...user, permissions };
});

export async function requirePageReadAccess(module: Module) {
  const me = await getCurrentUserWithPermissions();
  if (!me) redirect("/login");
  if (!me.permissions[module].includes("read")) redirect("/403");
  return me;
}
```

Layout 和 Page 级 Server Component 调用一次后,把 `permissions` 作为 prop 下发给 Client Component。**禁止每个 Client Component 单独 fetch `/api/auth/me`**。

### 5.3 Client Component 按钮显示

按钮 **hidden,不 disabled**。理由:disabled 按钮暴露系统能力,让没权限的用户困惑。

```tsx
{permissions.production.includes("delete") && (
  <Button variant="destructive" onClick={handleDelete}>删除</Button>
)}
```

### 5.4 Sidebar 过滤

`NAV_ITEMS` 数组中每项标注对应 module,渲染时过滤:

```typescript
const NAV_ITEMS = [
  { href: "/roster", label: "员工", module: "employees" },
  { href: "/production", label: "生产", module: "production" },
  // ...
];

const visible = NAV_ITEMS.filter(item => permissions[item.module].includes("read"));
```

### 5.5 `/403` 页面

新建 `src/app/403/page.tsx`:

- 展示"无权访问本页面"
- 返回首页按钮(`/roster`)
- 显示当前用户和角色,便于截图联系管理员

### 5.6 权限变更的感知

用户角色被修改后,**当前 session 不会立即感知**,需等下次请求。UI 在角色变更 toast 中提示"需让用户重新登录以生效"。

---

## 6. UI 设计:权限管理页面

### 6.1 路由与入口

**新页面**:`/settings/permissions`

- `/settings` 顶层 tab 增加"权限管理",与"员工"、"指标"、"帮助文档"、"数据管理"并列
- `/settings` 页面需 `settings.read`(viewer 及以上可进)
- "权限管理" 子 tab 仅 `settings.write` 用户可见(viewer 进入 settings 后此 tab 隐藏)

### 6.2 三 tab 结构

```
/settings/permissions
├── Tab 1: 角色管理 (Role CRUD)
├── Tab 2: 用户授权 (User-Role Assignment)
└── Tab 3: 操作日志 (Audit Log)
```

### 6.3 Tab 1:角色管理

**左侧列表**:所有角色,内置角色带"内置"标识,自定义角色显示关联用户数

**右侧详情**:6 × 3 权限矩阵(checkbox),角色名、描述

**交互规则**:

- 内置角色 checkbox 全置灰
- "+ 新建角色":弹框填名称/显示名/描述,保存后进入编辑
- 删除角色:若 `user_roles` 有关联 → 提示"该角色下有 N 个用户,请先解除关联",阻止删除
- 保存时一次性 diff 并重写 `role_permissions`(删除旧的,插入新的,同事务)
- delete 勾选但 read 未勾选 → toast 警告,允许保存

### 6.4 Tab 2:用户授权

**用户列表**来源:`user_roles` 表(所有登录过本系统的用户)

**列**:头像、昵称、UC ID、角色下拉、操作

**"+ 添加用户"**:

- 弹框填 UC userId(数字)
- 后端调 UC SDK `getAccountInfo(userId)` 验证
- 成功 → 写 `user_roles`,默认 `default` 角色,快照 nickname/avatar
- 失败 → 提示"UC 系统中未找到该用户"

**角色切换**:下拉选中即保存(防抖 + toast 确认),写 `audit_logs`

**解除**:把 `role_id` 设为 `default` 角色 ID(非物理删除,保留登录历史);`SUPER_ADMIN_UC_IDS` 白名单用户的角色不允许通过 UI 降级(env 是唯一真相源)

### 6.5 Tab 3:操作日志

只读表格,分页,最新在前:

**列**:时间、操作者、动作、目标、详情(展开查看 JSON)

**筛选**:操作者、动作类型、日期范围

**导出**:CSV(按当前筛选)

### 6.6 空状态

- Tab 1 无自定义角色:"点击'新建角色'创建自定义角色"
- Tab 2 只有白名单管理员:"让新用户先登录一次系统,再回此处分配角色"
- Tab 3 无记录:"暂无操作日志"

### 6.7 样式

- Tab 用 shadcn `<Tabs>`
- 角色矩阵用 `<Table>` + `<Checkbox>`
- 用户列表用 `<Table>` + `<Select>` + `<Button variant="ghost">`
- 所有文案中文

---

## 7. 登录流程改造

修改登录回调(`src/app/login/callback/*`):

在 `createSession` 前,先 upsert `user_roles`:

```typescript
const { userId, nickname } = await getUcUserInfo();
const avatar = getAvatarURL(Number(userId));

const existing = await db.select().from(userRoles).where(eq(userRoles.ucUserId, userId));

if (!existing.length) {
  const superAdminIds = (process.env.SUPER_ADMIN_UC_IDS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const roleName = superAdminIds.includes(userId) ? "super-admin" : "default";
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName));
  await db.insert(userRoles).values({
    id: randomUUID(),
    ucUserId: userId,
    nickname,
    avatar,
    roleId: role.id,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
} else {
  await db.update(userRoles)
    .set({ nickname, avatar, lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(userRoles.ucUserId, userId));
}

await createSession({ userId, nickname, avatar, expiresAt });
```

---

## 8. 种子数据

### 8.1 新增脚本

`scripts/seed-permissions.ts`,加入 `package.json`:

```json
"db:seed:permissions": "tsx scripts/seed-permissions.ts"
```

### 8.2 脚本逻辑

1. 删除 `roles` 中 `is_system=true` 的记录及其级联 `role_permissions`(保留用户自建角色)
2. 插入 3 个内置角色
3. 按映射表插入 `role_permissions`
4. **不清空 `user_roles`**(用户数据由登录流程维护)

### 8.3 首次部署顺序

```bash
npm run db:generate      # 生成迁移文件
npm run db:push          # 应用到数据库
npm run db:seed:permissions  # 种入内置角色
# 设置 .env.local 的 SUPER_ADMIN_UC_IDS
# 启动应用,白名单用户登录即可自动获得 super-admin
```

---

## 9. 审计日志埋点

### 9.1 封装工具

`src/lib/audit.ts`:

```typescript
export async function logAudit(
  request: Request,
  operator: SessionUser,
  action: string,
  target: { type: string; id: string },
  details?: Record<string, unknown>
): Promise<void>;
```

自动从 request 提取 IP / User-Agent。

### 9.2 埋点位置

只在权限相关 API 中调用:

- `POST /api/settings/roles` → `role.create`
- `PUT /api/settings/roles/[id]` → `role.update`(details 含 before/after 的权限 diff)
- `DELETE /api/settings/roles/[id]` → `role.delete`
- `POST /api/settings/user-roles` → `user.assign_role`
- `PUT /api/settings/user-roles/[id]` → `user.change_role`
- `DELETE /api/settings/user-roles/[id]` → `user.unassign`

**业务 API 不埋点**(本次范围)。

---

## 10. 验收清单(替代单测)

项目无测试框架,以手工验收清单作为 Done 的定义。

| # | 场景 | 预期 |
|---|---|---|
| 1 | 首次以 SUPER_ADMIN_UC_IDS 中的 ID 登录 | 自动获得 super-admin 角色,能看到所有模块 |
| 2 | 首次以非白名单 ID 登录 | 获得 default 角色,只能看到 5 业务模块的 read,settings 隐藏 |
| 3 | super-admin 进入 `/settings/permissions`,创建"生产主管"角色,勾选 `production.{read,write,delete}` 并保存 | 角色创建成功,列表中出现 |
| 4 | super-admin 给李四分配"生产主管",李四重新登录 | 李四只能看到 production 模块 |
| 5 | 李四在 production 看板点击"删除任务" | 成功(有 delete 权限)|
| 6 | 李四浏览器地址栏直接输入 `/roster` | 重定向到 `/403` |
| 7 | 李四直接调 `DELETE /api/tasks/:id`(curl/bypass UI)| 返回 403 |
| 8 | super-admin 打开"默认用户"角色 | UI 置灰,不可改 |
| 9 | super-admin 删除"生产主管"角色(仍有用户关联)| 提示"该角色下有 1 个用户,请先解除关联",阻止删除 |
| 10 | super-admin 查看操作日志 | 上述所有权限变更有记录 |
| 11 | `.env.local` 设 `AUTH_DISABLED=true` | 所有权限检查被短路,开发便利模式 |
| 12 | `.env.local` 设 `AUTH_DISABLED=false` | 以上 1–10 全部能通过 |

---

## 11. 实施阶段(粗分)

详细步骤由 writing-plans 产出。

1. **数据层**:schema 扩展 + drizzle migration + `seed-permissions.ts`
2. **核心授权库**:`src/lib/authz.ts` + `src/lib/authz-server.ts` + `src/lib/audit.ts`
3. **登录流程**:callback 改造 + `/api/auth/me` 扩展
4. **API 埋点**:26 个路由逐个加 `requirePermission`
5. **Middleware**:`PATH_TO_MODULE` + `/403` 页面
6. **UI 过滤**:Sidebar + 按钮 hidden
7. **权限管理页面**:`/settings/permissions` 三 tab
8. **审计日志 UI**:Tab 3 + 埋点工具落地
9. **验收**:跑完 12 项清单

---

## 12. 已知限制与技术债

1. **`SESSION_SECRET` 仍为默认值** — 已作为已知安全风险,建议下一迭代注入随机 32 位字符串
2. **UC 用户发现限制** — SDK 无列举接口,只能管理已登录用户,引导文案已在 Tab 2 给出
3. **业务数据 CRUD 审计不在范围** — 只审计权限变更;业务审计另立专题
4. **无角色继承 / 角色组** — 6×3 矩阵够用,避免复杂度
5. **权限缓存不主动失效** — 改角色后用户当前 session 不立即生效,需重登录;UI 给出提示
6. **`PATH_TO_MODULE` 需手动维护** — 新页面 checklist 已写入 § 4.4
7. **审计日志无自动清理** — 长期会膨胀,后续加归档任务

---

## 13. 参考

- 现有 auth 层:`src/lib/auth.ts`、`src/proxy.ts`、`src/lib/uc-client.ts`
- Schema:`src/db/schema.ts`
- UC SDK 类型:`src/types/uc-sdk.d.ts`
- 项目约定:`CLAUDE.md`、`AGENTS.md`
