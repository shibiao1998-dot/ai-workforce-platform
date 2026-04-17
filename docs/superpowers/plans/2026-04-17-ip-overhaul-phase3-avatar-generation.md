# AI Employee IP Overhaul — Phase 3: Avatar Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign avatar generation prompts to use persona data, producing trendy tech-style IP portraits with individual scenes and team color accents.

**Depends on:** Phase 2 (all 24 employees have persona data in seed) must be complete.

**Spec:** `docs/superpowers/specs/2026-04-17-employee-ip-overhaul-design.md`

---

### Task 8: Update batch avatar generation script

**Files:**
- Modify: `scripts/generate-avatars.ts` (full rewrite of STYLE_PREFIX, Employee interface, EMPLOYEES array, and prompt assembly)

- [ ] **Step 1: Replace STYLE_PREFIX (line 67-71)**

```typescript
const STYLE_PREFIX =
  "Create a stylish 2D digital illustration portrait of a young Chinese professional in LANDSCAPE orientation (16:9, 1376x768). " +
  "Trendy modern illustration style with bold confident lines, vibrant colors, and dynamic lighting. " +
  "The character should look young (early-to-late 20s), energetic, fashionable, and highly competent — like a top talent at a cutting-edge tech startup. " +
  "Frame from chest up, centered with breathing room. Include a detailed background scene specific to their work environment. " +
  "The overall mood should be cool, professional, and aspirational.";
```

- [ ] **Step 2: Replace Employee interface and EMPLOYEES array (lines 32-62)**

Replace the hardcoded `{ name, description }` array with a richer structure that reads from persona data. Add team color mapping:

```typescript
interface Employee {
  name: string;
  team: "management" | "design" | "production";
  persona: {
    age: number;
    gender: string;
    personality: string[];
    fashionStyle: string;
    visualTraits: string;
    sceneDescription: string;
  };
}

const TEAM_ACCENT: Record<string, string> = {
  management: "purple and violet",
  design: "blue and cyan",
  production: "green and emerald",
};
```

Then populate the EMPLOYEES array with the 24 employees' name, team, and persona fields (extracted from the seed data).

- [ ] **Step 3: Replace prompt assembly (line 91)**

Replace `const prompt = \`${STYLE_PREFIX} ${emp.description}.\`` with:

```typescript
function buildPrompt(emp: Employee): string {
  const { persona, team } = emp;
  const accent = TEAM_ACCENT[team] || "neutral";
  const expressionWords = persona.personality.slice(0, 2).join(" and ");
  return [
    STYLE_PREFIX,
    `${persona.gender === "male" ? "Male" : "Female"}, age ${persona.age}. ${persona.fashionStyle}.`,
    `Expression: confident and ${expressionWords} vibe.`,
    `Signature item: ${persona.visualTraits}.`,
    `Background scene: ${persona.sceneDescription}.`,
    `Ambient lighting with ${accent} accent tones.`,
  ].join(" ");
}
```

Then in `generateAvatar`, use `const prompt = buildPrompt(emp);`.

- [ ] **Step 4: Verify script compiles**

Run: `npx tsx --no-cache scripts/generate-avatars.ts --help` (or just check syntax)
Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-avatars.ts
git commit -m "feat: redesign avatar prompt with trendy tech style and persona-driven assembly"
```

---

### Task 9: Update runtime avatar generator library

**Files:**
- Modify: `src/lib/avatar-generator.ts` (STYLE_PREFIX and prompt assembly)

- [ ] **Step 1: Replace STYLE_PREFIX (line 33-37)**

Same new STYLE_PREFIX as the batch script (keep them in sync).

- [ ] **Step 2: Update generateAvatarDescription fallback (line 42-53)**

Update the fallback to produce a trendy-style description instead of the current corporate one:

```typescript
export function generateAvatarDescription(title: string, team: string): string {
  const accent = TEAM_ACCENT[team] || "neutral";
  return `Young professional in a ${title} role, age mid-20s, trendy streetwear style, confident energetic expression, modern tech workspace background with ${accent} ambient lighting`;
}
```

Add team accent map:

```typescript
const TEAM_ACCENT: Record<string, string> = {
  management: "purple and violet",
  design: "blue and cyan",
  production: "green and emerald",
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/avatar-generator.ts
git commit -m "feat: sync runtime avatar generator with new trendy style prompt"
```

---

### Task 10: Delete old avatars and regenerate

**Files:**
- Modify: `public/avatars/` (delete all 24 PNGs)

- [ ] **Step 1: Delete all existing avatar PNGs**

```bash
rm public/avatars/AI*.png
```

- [ ] **Step 2: Run the batch generation script**

```bash
npm run generate:avatars
```

Expected: 24 new PNG files generated in `public/avatars/`, each with trendy tech style, individual scenes, and team color accents. The script will take ~2 minutes (24 images × 3s delay).

- [ ] **Step 3: Visually verify a few avatars**

Open a few generated avatars to check:
- Young (20s), not old
- Has background scene (not plain gradient)
- Has team accent color (purple/blue/green tint)
- Has signature visual item visible
- Correct gender and fashion style

- [ ] **Step 4: Commit new avatars**

```bash
git add public/avatars/
git commit -m "feat: regenerate all 24 employee avatars with trendy IP style"
```

---

**Phase 3 complete.** Proceed to Phase 4 plan for UI and API updates.
