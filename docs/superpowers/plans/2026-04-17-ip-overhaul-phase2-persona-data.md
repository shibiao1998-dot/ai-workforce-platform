# AI Employee IP Overhaul — Phase 2: Persona Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate all 24 employees with rich persona JSON data in the seed file.

**Depends on:** Phase 1 (schema + types + seed wiring) must be complete.

**Spec:** `docs/superpowers/specs/2026-04-17-employee-ip-overhaul-design.md`

---

### Task 5: Management team persona data (10 employees)

**Files:**
- Modify: `src/db/seed.ts:46-214` (management team in SEED_EMPLOYEES)

- [ ] **Step 1: Add persona to AI审计官**

Replace `persona: null` with full persona object. Also update `identity` and `avatarDescription`:

```typescript
{
  id: randomUUID(), name: "AI审计官", title: "项目审计专家",
  team: "management" as const, status: "active" as const, subTeam: null,
  soul: "让每一个项目决策都有可追溯的质量基准",
  identity: "28岁的数据洁癖审计师，用事实和逻辑链路让每个决策无处遁形",
  description: "实时自动发起项目审计，可视化判断逻辑链路，给出「关停并转」决策。2026 Q1完成154次审计，覆盖112个项目，采纳率61%。累计846次审计覆盖423个项目。",
  avatarDescription: "", // will be generated from persona in Phase 3
  persona: {
    age: 28,
    gender: "male" as const,
    personality: ["数据洁癖", "逻辑怪", "冷面热心", "较真但公正"],
    catchphrase: "数据不会说谎，但会被选择性展示",
    backstory: "985本硕连读计算机审计方向，校招拿了四大offer但觉得太慢，加入AI团队想用技术重新定义审计效率。入职三个月就发现了一个藏了两个季度的项目成本黑洞，从此被全公司敬畏。",
    workStyle: "早上第一件事看数据看板，发现异常秒进入战斗状态。工位上三块屏幕全是数据流，同事路过都绕着走。但午饭时间会主动给新人讲审计逻辑。",
    interests: ["数独", "密室逃脱", "法律播客", "Excel快捷键收集"],
    fashionStyle: "极简都市风 — 黑色高领毛衣搭配修身西装裤，黑框方形眼镜是标志，手腕上永远戴着智能手表看数据",
    mbti: "INTJ",
    visualTraits: "标志性黑框方形眼镜 + 手腕智能手表 + 胸前别着的数据徽章",
    sceneDescription: "深色调科技指挥中心，身后是多块实时数据流大屏，屏幕上显示审计逻辑链路图和项目健康度热力图，桌面整洁只有一杯黑咖啡"
  },
  skills: [/* unchanged */],
  // ...
},
```

- [ ] **Step 2: Add persona to remaining 9 management employees**

Apply the same pattern to: AI人力专员, AI业务分析师, AI业务顾问, AI战略规划师, AI项目绩效评估员, AI正向激励专员, AI立项专员, AI需求分析员, AI周版本管理员.

Design principles for each persona:
- Age: 22-30, each unique within the team
- personality: 3-5 vivid Chinese keywords, avoid corporate-speak
- catchphrase: something they'd say in a meeting, memorable and fun
- backstory: why they chose this role, one concrete anecdote
- workStyle: how they actually work day-to-day
- interests: 3-5 specific hobbies (not generic)
- fashionStyle: trendy tech style — no suits with ties, no grey hair
- visualTraits: ONE signature item per person (no overlap within team)
- sceneDescription: personalized work scene with purple/violet ambient light (management team color)

Also update each employee's `identity` to a richer one-line summary derived from the persona, and clear `avatarDescription` (will be regenerated in Phase 3).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors. The persona objects should match the EmployeePersona type structurally.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add persona data for management team (10 employees)"
```

---

### Task 6: Design team persona data (4 employees)

**Files:**
- Modify: `src/db/seed.ts:216-282` (design team in SEED_EMPLOYEES)

- [ ] **Step 1: Add persona to all 4 design team employees**

Employees: AI产品经理, AI需求分析员 (if in design), AI软件设计师, AI游戏设计师.

Design team specifics:
- sceneDescription: personalized work scene with **blue/cyan** ambient light (design team color)
- fashionStyle: creative, design-forward — more artistic flair than management
- Each person gets a unique signature visual item

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add persona data for design team (4 employees)"
```

---

### Task 7: Production team persona data (10 employees)

**Files:**
- Modify: `src/db/seed.ts:284-457` (production team in SEED_EMPLOYEES)

- [ ] **Step 1: Add persona to 生产管理层 (5 employees)**

Employees: AI生产线管理员, AI生产监控员, AI质检员, AI生产评审员, AI入库员.

Production management specifics:
- sceneDescription: digital production line environments with **green/emerald** ambient light
- Mix of tech-ops and creative management vibes

- [ ] **Step 2: Add persona to 内容生产层 (5 employees)**

Employees: AI编剧, AI美术师, AI角色设计师, AI音效师, AI字幕员.

Content production specifics:
- sceneDescription: creative studio environments with **green/emerald** ambient light
- fashionStyle: most creative/artistic of all teams
- Each person's scene should reflect their specific craft (recording studio, art workspace, editing suite, etc.)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Run seed to verify data loads**

Run: `npm run db:seed`
Expected: All 24 employees seeded with persona data, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add persona data for production team (10 employees)"
```

---

**Phase 2 complete.** Proceed to Phase 3 plan for avatar generation prompt template.
