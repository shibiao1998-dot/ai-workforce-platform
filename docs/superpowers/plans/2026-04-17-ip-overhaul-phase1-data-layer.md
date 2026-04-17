# AI Employee IP Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul all 24 AI employee identities and avatar images — from generic corporate style to trendy, young, IP-ready characters with rich persona data.

**Architecture:** Add a `persona` JSON column to employees table, populate all 24 employees with rich character data, redesign avatar generation prompts from persona fields, update UI to display persona info.

**Tech Stack:** Next.js 16, Drizzle ORM (SQLite), TypeScript, Gemini 3.1 Flash Image Preview API

**Spec:** `docs/superpowers/specs/2026-04-17-employee-ip-overhaul-design.md`

**Plan is split into 4 phases (separate files):**
1. `2026-04-17-ip-overhaul-phase1-data-layer.md` — Schema, types, persona interface ← this file
2. `2026-04-17-ip-overhaul-phase2-persona-data.md` — 24 employee persona JSONs in seed
3. `2026-04-17-ip-overhaul-phase3-avatar-generation.md` — Prompt template & generation script
4. `2026-04-17-ip-overhaul-phase4-ui-api.md` — API routes & UI display

---

## Phase 1: Data Layer

### Task 1: Add persona column to schema

**Files:**
- Modify: `src/db/schema.ts:3-17` (employees table)

- [ ] **Step 1: Add persona text column**

Add after line 14 (`avatarDescription`):

```typescript
persona: text("persona"),
```

The employees table should look like:

```typescript
export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  title: text("title").notNull(),
  team: text("team", { enum: ["management", "design", "production"] }).notNull(),
  status: text("status", { enum: ["active", "developing", "planned", "inactive"] }).notNull(),
  subTeam: text("sub_team"),
  soul: text("soul"),
  identity: text("identity"),
  description: text("description"),
  avatarDescription: text("avatar_description"),
  persona: text("persona"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

- [ ] **Step 2: Push schema change**

Run: `npm run db:push`
Expected: Schema update applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add persona JSON column to employees table"
```

---

### Task 2: Add EmployeePersona type and update Employee interface

**Files:**
- Modify: `src/lib/types.ts:19-37` (Employee interface)

- [ ] **Step 1: Add EmployeePersona interface**

Add before the Employee interface (before line 19):

```typescript
export interface EmployeePersona {
  age: number;
  gender: "male" | "female";
  personality: string[];
  catchphrase: string;
  backstory: string;
  workStyle: string;
  interests: string[];
  fashionStyle: string;
  mbti: string;
  visualTraits: string;
  sceneDescription: string;
}
```

- [ ] **Step 2: Add persona field to Employee interface**

Add `persona: string | null;` after `avatarDescription` in the Employee interface. The updated interface:

```typescript
export interface Employee {
  id: string;
  name: string;
  avatar: string | null;
  title: string;
  team: TeamType;
  status: EmployeeStatus;
  subTeam: string | null;
  soul: string | null;
  identity: string | null;
  description: string | null;
  avatarDescription: string | null;
  persona: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  skills?: Skill[];
  metrics?: Metric[];
  versionLogs?: VersionLog[];
}
```

- [ ] **Step 3: Update EmployeeListItem if it includes avatarDescription**

Check `EmployeeListItem` (line 124-136) — if it has `avatarDescription`, add `persona` there too.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add EmployeePersona type and persona field to Employee"
```

---

### Task 3: Update employee API PUT to accept persona

**Files:**
- Modify: `src/app/api/employees/[id]/route.ts:42-73` (PUT handler)

- [ ] **Step 1: Add persona to the PUT set clause**

In the `db.update(employees).set({...})` block, add `persona: body.persona,` after `avatarDescription`:

```typescript
await db
  .update(employees)
  .set({
    name: body.name,
    avatar: body.avatar,
    title: body.title,
    team: body.team,
    status: body.status,
    subTeam: body.subTeam,
    soul: body.soul,
    identity: body.identity,
    description: body.description,
    avatarDescription: body.avatarDescription,
    persona: body.persona,
    updatedAt: now,
  })
  .where(eq(employees.id, id));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/employees/[id]/route.ts
git commit -m "feat: accept persona field in employee PUT API"
```

---

### Task 4: Update seed insert to include persona

**Files:**
- Modify: `src/db/seed.ts:593-607` (employee insert block)

- [ ] **Step 1: Add persona to insert values**

Add `persona: emp.persona ? JSON.stringify(emp.persona) : null,` to the insert:

```typescript
await db.insert(employees).values({
  id: employeeId,
  name: emp.name,
  avatar: `/avatars/${emp.name}.png`,
  title: emp.title,
  team: emp.team,
  status: emp.status,
  subTeam: emp.subTeam ?? null,
  soul: emp.soul,
  identity: emp.identity,
  description: emp.description,
  avatarDescription: emp.avatarDescription,
  persona: emp.persona ? JSON.stringify(emp.persona) : null,
  createdAt: ts,
  updatedAt: ts,
});
```

- [ ] **Step 2: Add placeholder persona field to SEED_EMPLOYEES type**

At the top of SEED_EMPLOYEES array, each employee object needs a `persona` field. For now, add `persona: null` to the first employee as a test — full persona data will be added in Phase 2.

```typescript
{
  id: randomUUID(), name: "AI审计官", title: "项目审计专家",
  team: "management" as const, status: "active" as const, subTeam: null,
  soul: "让每一个项目决策都有可追溯的质量基准",
  identity: "严谨、数据驱动、以事实说话的审计专家",
  description: "实时自动发起项目审计...",
  avatarDescription: "Mature male, mid-40s...",
  persona: null,
  skills: [...],
  ...
},
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: wire persona field into seed insert"
```

---

**Phase 1 complete.** Proceed to Phase 2 plan for the 24 employee persona data.
