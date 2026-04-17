# AI Employee IP Overhaul — Phase 4: UI & API Updates

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display rich persona data in the employee profile tab and detail modal. Support persona editing.

**Depends on:** Phase 1 (schema + types) must be complete. Phase 2-3 are independent of this phase.

**Spec:** `docs/superpowers/specs/2026-04-17-employee-ip-overhaul-design.md`

---

### Task 11: Add persona display to profile tab

**Files:**
- Modify: `src/components/roster/tabs/profile-tab.tsx` (add persona fields display)

- [ ] **Step 1: Parse persona JSON from employee prop**

At the top of the `ProfileTab` component, parse the persona:

```typescript
const persona = employee.persona ? JSON.parse(employee.persona) as EmployeePersona : null;
```

Import `EmployeePersona` from `@/lib/types`.

- [ ] **Step 2: Add persona display section**

After the existing profile fields (soul, identity, description), add a persona card section. Only render if persona exists:

```tsx
{persona && (
  <Card>
    <CardHeader>
      <h3 className="text-sm font-semibold">IP 人设卡</h3>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-muted-foreground text-xs">年龄</Label>
          <p>{persona.age}岁</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">MBTI</Label>
          <p>{persona.mbti}</p>
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">性格标签</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {persona.personality.map((p: string) => (
            <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-xs">{p}</span>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">口头禅</Label>
        <p className="italic">"{persona.catchphrase}"</p>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">背景故事</Label>
        <p className="text-muted-foreground">{persona.backstory}</p>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">工作风格</Label>
        <p className="text-muted-foreground">{persona.workStyle}</p>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">兴趣爱好</Label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {persona.interests.map((i: string) => (
            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs">{i}</span>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">穿搭风格</Label>
        <p className="text-muted-foreground">{persona.fashionStyle}</p>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">标志性特征</Label>
        <p>{persona.visualTraits}</p>
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Verify visually in browser**

Run: `npm run dev`, open an employee's profile tab, and confirm the persona card renders correctly with all fields.

- [ ] **Step 5: Commit**

```bash
git add src/components/roster/tabs/profile-tab.tsx
git commit -m "feat: display persona IP card in employee profile tab"
```

---

### Task 12: Add persona highlights to employee detail modal

**Files:**
- Modify: `src/components/roster/employee-detail-modal.tsx` (or wherever the detail modal renders)

- [ ] **Step 1: Find the employee detail modal component**

Locate the modal that opens when clicking "查看详情" on an employee card. Check `src/components/roster/employee-detail-modal.tsx` or similar.

- [ ] **Step 2: Add persona highlights**

In the modal header/overview area, show key persona highlights if persona exists:
- Catchphrase as a quote
- Personality tags
- MBTI badge
- Age

This is a light enhancement — the full persona card is in the profile tab. The modal just shows highlights for quick recognition.

- [ ] **Step 3: Verify visually in browser**

Open an employee detail modal and confirm persona highlights appear.

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/employee-detail-modal.tsx
git commit -m "feat: show persona highlights in employee detail modal"
```

---

### Task 13: Reseed database and verify end-to-end

- [ ] **Step 1: Reseed the database**

Run: `npm run db:seed`
Expected: All 24 employees seeded with persona data.

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`
Check:
- Employee cards display correctly on `/roster`
- Detail modal shows persona highlights
- Profile tab shows full persona IP card
- Avatars load correctly (if Phase 3 is complete)

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete AI employee IP overhaul — persona data + avatars + UI"
```

---

**Phase 4 complete. Full implementation done.**
