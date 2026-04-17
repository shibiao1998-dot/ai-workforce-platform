# Employee Card & Detail Redesign — Portrait Cards + Modal Detail + Typography

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign employee cards with immersive portrait layouts, replace page-based detail view with a centered modal dialog, and optimize system-wide typography for Chinese text readability.

**Architecture:** Pure frontend changes — no data model/API changes. Card gets full-bleed portrait with gradient blend. Detail becomes a Dialog overlay triggered from the roster page (no route navigation). Global CSS sets comfortable Chinese font sizing. The existing `src/components/ui/dialog.tsx` (base-ui Dialog) is used as the modal primitive.

**Tech Stack:** React 19, Tailwind CSS v4, shadcn/ui Dialog (base-ui), existing AiAvatar component

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/globals.css` | Modify | Global typography: base 14px, heading scale, line-height for Chinese |
| `src/components/shared/ai-avatar.tsx` | Modify | Add `fill` mode for container-filling images, `className` passthrough |
| `src/components/roster/employee-card.tsx` | Rewrite | Portrait-centric card, click triggers modal instead of navigation |
| `src/components/roster/employee-grid.tsx` | Modify | Add Dialog state, render EmployeeDetailModal |
| `src/components/roster/employee-detail-modal.tsx` | Create | New modal component wrapping Dialog with hero + tabs |
| `src/components/roster/employee-detail.tsx` | Keep | Retained for the `/roster/[id]` route (direct URL access) with hero updates |
| `src/components/roster/tabs/profile-tab.tsx` | Modify | Remove duplicate avatar since hero/modal handles it |
| `src/app/roster/[id]/page.tsx` | Modify | Widen container, update hero layout |
| `src/app/roster/loading.tsx` | Modify | Taller skeleton for new card height |

## Design Reference

**Card (from reference screenshots — OpenClass style):**
- Portrait image fills top ~60% of card, `object-cover` + `object-top` to focus on face
- Bottom gradient overlay (transparent → white) blends into info area
- Name: **`text-lg font-bold`** (large and prominent, like reference)
- Title: `text-sm text-muted-foreground`
- Status badge overlaid on portrait top-right
- Left border color for team identity

**Modal detail (industry pattern — 飞书/Notion peek style):**
- Centered Dialog, `max-w-3xl` (768px), max-height `85vh`, scrollable content
- Backdrop: `bg-black/40` with `backdrop-blur-sm`
- Hero section: left portrait (~240px), right info (name `text-2xl font-bold`, title, team, soul)
- Below hero: tabs (档案, 技能, 指标, 版本)
- Close via X button, backdrop click, or ESC

**Typography (Ant Design / Arco Design Chinese best practices):**

| Usage | Current | Target |
|-------|---------|--------|
| Body base | browser default (~16px) | **14px**, line-height 22px (1.57) |
| Muted/caption | 10-12px | **12px**, line-height 18px |
| Card name | 14px (`text-sm`) | **18px** (`text-lg font-bold`) |
| Card title/subtitle | 12px (`text-xs`) | **14px** (`text-sm`) |
| Page heading | 30px (`text-3xl`) | **24px** (`text-2xl font-bold`) — cleaner |
| Modal name | N/A | **24px** (`text-2xl font-bold`) |

---

### Task 1: Global Typography — Set comfortable Chinese base sizing

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add Chinese-optimized typography rules to globals.css**

In `src/app/globals.css`, update the `@layer base` block to set comfortable Chinese typography. Replace the existing `@layer base` block:

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
    font-size: 14px;
    line-height: 1.57;
  }
  html {
    @apply font-sans;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

Key changes:
- `font-size: 14px` on body — Ant Design's recommended base for Chinese SaaS
- `line-height: 1.57` (14px → ~22px) — optimal for Chinese character readability
- Font smoothing already handled by `antialiased` class on `<html>` in layout.tsx

- [ ] **Step 2: Update roster page heading to use refined size**

In `src/app/roster/page.tsx`, change the heading from `text-3xl` to `text-2xl` for a cleaner look consistent with the new base sizing:

Find:
```tsx
<h1 className="text-3xl font-bold text-foreground">AI 员工花名册</h1>
```
Replace with:
```tsx
<h1 className="text-2xl font-bold text-foreground">AI 员工花名册</h1>
```

- [ ] **Step 3: Verify typography changes across the app**

Run: `npm run dev`

Open http://localhost:3000/roster. Verify:
- Body text is 14px — feels comfortably readable, not too small or large
- Chinese characters have breathing room (line-height 1.57)
- Page heading "AI 员工花名册" is 24px bold — clean and authoritative
- Nothing looks broken or cramped

Also spot-check `/dashboard` and `/production` pages for consistency.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/roster/page.tsx
git commit -m "style: set 14px base font with Chinese-optimized line height"
```

---

### Task 2: AiAvatar — Add fill mode for full-bleed images

**Files:**
- Modify: `src/components/shared/ai-avatar.tsx`

- [ ] **Step 1: Add `fill` prop and `className` passthrough to AiAvatar**

Open `src/components/shared/ai-avatar.tsx`. The component needs two additions:
1. A `fill` boolean prop — when true, the `<img>` fills its container (`width: 100%`, `height: 100%`, `object-fit: cover`, `object-position: top`). The SVG fallback renders centered in a container that fills the parent.
2. A `className` prop passed through to the root element.

Replace the entire file:

```tsx
interface AiAvatarProps {
  employeeId: string;
  team: string;
  avatar: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  fill?: boolean;
  className?: string;
}

const SIZE_MAP = { sm: 40, md: 56, lg: 80, xl: 120 } as const;

const PALETTES: Record<string, { bg: string; accent: string; light: string }> = {
  management: { bg: "#7c3aed", accent: "#a78bfa", light: "#ede9fe" },
  design:     { bg: "#2563eb", accent: "#60a5fa", light: "#dbeafe" },
  production: { bg: "#16a34a", accent: "#4ade80", light: "#dcfce7" },
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function RobotSvg({ employeeId, team, size }: { employeeId: string; team: string; size: number }) {
  const palette = PALETTES[team] ?? PALETTES.production;
  const px = size;
  const h = hash(employeeId);
  const cx = px / 2;
  const headCY = px * 0.52;
  const headR = px * 0.34;
  const eyeY = headCY - headR * 0.1;
  const eyeSpacing = headR * 0.35;
  const mouthY = headCY + headR * 0.35;
  const lx = cx - eyeSpacing;
  const rx = cx + eyeSpacing;

  const antennaVariant = h % 3;
  const antennaBase = headCY - headR;
  const Antenna = () => {
    if (antennaVariant === 0) {
      return (
        <>
          <line x1={cx} y1={antennaBase} x2={cx} y2={antennaBase - px * 0.12} stroke={palette.bg} strokeWidth={2} />
          <circle cx={cx} cy={antennaBase - px * 0.14} r={px * 0.04} fill={palette.accent} />
        </>
      );
    }
    if (antennaVariant === 1) {
      return (
        <>
          <line x1={lx} y1={antennaBase} x2={lx - px * 0.04} y2={antennaBase - px * 0.1} stroke={palette.bg} strokeWidth={2} />
          <circle cx={lx - px * 0.05} cy={antennaBase - px * 0.12} r={px * 0.03} fill={palette.accent} />
          <line x1={rx} y1={antennaBase} x2={rx + px * 0.04} y2={antennaBase - px * 0.1} stroke={palette.bg} strokeWidth={2} />
          <circle cx={rx + px * 0.05} cy={antennaBase - px * 0.12} r={px * 0.03} fill={palette.accent} />
        </>
      );
    }
    return (
      <path
        d={`M ${lx} ${antennaBase} Q ${cx} ${antennaBase - px * 0.18} ${rx} ${antennaBase}`}
        fill="none"
        stroke={palette.accent}
        strokeWidth={2}
      />
    );
  };

  const headVariant = (h >> 2) % 3;
  const Head = () => {
    if (headVariant === 0) return <circle cx={cx} cy={headCY} r={headR} fill={palette.bg} />;
    if (headVariant === 1) return <rect x={cx - headR} y={headCY - headR} width={headR * 2} height={headR * 2} rx={headR * 0.3} fill={palette.bg} />;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 90);
      return `${cx + headR * Math.cos(angle)},${headCY + headR * Math.sin(angle)}`;
    }).join(" ");
    return <polygon points={pts} fill={palette.bg} />;
  };

  const eyeVariant = (h >> 4) % 4;
  const er = headR * 0.18;
  const Eyes = () => {
    if (eyeVariant === 0) {
      return (
        <>
          <circle cx={lx} cy={eyeY} r={er} fill="white" />
          <circle cx={lx} cy={eyeY} r={er * 0.5} fill="#1e293b" />
          <circle cx={rx} cy={eyeY} r={er} fill="white" />
          <circle cx={rx} cy={eyeY} r={er * 0.5} fill="#1e293b" />
        </>
      );
    }
    if (eyeVariant === 1) {
      return (
        <>
          <rect x={lx - er} y={eyeY - er} width={er * 2} height={er * 2} fill="white" />
          <rect x={rx - er} y={eyeY - er} width={er * 2} height={er * 2} fill="white" />
        </>
      );
    }
    if (eyeVariant === 2) {
      return (
        <>
          <circle cx={lx} cy={eyeY} r={er * 0.4} fill="white" />
          <circle cx={rx} cy={eyeY} r={er * 0.4} fill="white" />
        </>
      );
    }
    const visorW = eyeSpacing * 2 + er * 2;
    return (
      <>
        <rect x={cx - visorW / 2} y={eyeY - er} width={visorW} height={er * 2} rx={er * 0.6} fill={palette.light} />
        <circle cx={lx} cy={eyeY} r={er * 0.4} fill="#1e293b" />
        <circle cx={rx} cy={eyeY} r={er * 0.4} fill="#1e293b" />
      </>
    );
  };

  const mouthVariant = (h >> 6) % 3;
  const mw = headR * 0.5;
  const Mouth = () => {
    if (mouthVariant === 0) {
      return (
        <path d={`M ${cx - mw} ${mouthY} Q ${cx} ${mouthY + mw * 0.6} ${cx + mw} ${mouthY}`} fill="none" stroke={palette.light} strokeWidth={2} strokeLinecap="round" />
      );
    }
    if (mouthVariant === 1) {
      return <line x1={cx - mw} y1={mouthY} x2={cx + mw} y2={mouthY} stroke={palette.light} strokeWidth={2} strokeLinecap="round" />;
    }
    const step = mw / 2;
    return (
      <polyline
        points={`${cx - mw},${mouthY} ${cx - step},${mouthY - mw * 0.3} ${cx},${mouthY} ${cx + step},${mouthY - mw * 0.3} ${cx + mw},${mouthY}`}
        fill="none" stroke={palette.light} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
    );
  };

  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} aria-label={`${team} robot`}>
      <Antenna />
      <Head />
      <Eyes />
      <Mouth />
    </svg>
  );
}

export function AiAvatar({ employeeId, team, avatar, name, size = "md", fill, className }: AiAvatarProps) {
  const px = SIZE_MAP[size];
  const palette = PALETTES[team] ?? PALETTES.production;

  // Fill mode — image fills container, or SVG centered in container
  if (fill) {
    if (avatar) {
      return (
        <img
          src={avatar}
          alt={name}
          className={className}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top",
            display: "block",
          }}
        />
      );
    }
    return (
      <div
        className={className}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: palette.light,
        }}
      >
        <RobotSvg employeeId={employeeId} team={team} size={120} />
      </div>
    );
  }

  // Fixed-size mode (existing behavior)
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        width={px}
        height={px}
        className={className}
        style={{
          width: px,
          height: px,
          borderRadius: Math.round(px * 0.2),
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={className}
      style={{ borderRadius: Math.round(px * 0.2), background: palette.light, display: "block" }}
      aria-label={name}
    >
      <RobotSvg employeeId={employeeId} team={team} size={px} />
    </svg>
  );
}
```

Key changes:
- Extracted SVG robot rendering into `RobotSvg` sub-component (reusable at any size)
- Added `fill` prop: when true, image fills container with `object-cover` + `object-position: top`
- Added `className` passthrough on all root elements
- SVG fallback in fill mode: centered 120px robot inside a flex container that fills the parent
- Fixed-size mode unchanged — all existing callers work identically

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. Existing usages of AiAvatar are unaffected.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ai-avatar.tsx
git commit -m "feat(avatar): add fill mode and className prop to AiAvatar"
```

---

### Task 3: Employee Card — Portrait-centric redesign with bigger name

**Files:**
- Rewrite: `src/components/roster/employee-card.tsx`
- Modify: `src/app/roster/loading.tsx`

- [ ] **Step 1: Rewrite employee-card.tsx with portrait layout and large name**

The card becomes a `<div>` (not a `<Link>`) that calls `onClick` to open the modal. The `onClick` prop is passed from the parent grid.

Replace the entire content of `src/components/roster/employee-card.tsx`:

```tsx
import { ArrowRight } from "lucide-react";

import { AiAvatar } from "@/components/shared/ai-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/lib/types";

const STATUS_MAP: Record<
  EmployeeListItem["status"],
  { label: string; className: string }
> = {
  active: {
    label: "在岗",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  developing: {
    label: "开发中",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  planned: {
    label: "规划中",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const TEAM_BORDER: Record<EmployeeListItem["team"], string> = {
  management: "#7c3aed",
  design: "#2563eb",
  production: "#16a34a",
};

const TEAM_BG: Record<EmployeeListItem["team"], string> = {
  management: "bg-gradient-to-br from-purple-50 to-violet-100",
  design: "bg-gradient-to-br from-blue-50 to-sky-100",
  production: "bg-gradient-to-br from-green-50 to-emerald-100",
};

interface EmployeeCardProps {
  employee: EmployeeListItem;
  onClick?: () => void;
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const status = STATUS_MAP[employee.status];
  const borderColor = TEAM_BORDER[employee.team];
  const teamBg = TEAM_BG[employee.team];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      className="block cursor-pointer group/card outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
    >
      <div
        className="relative h-full overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10 transition-all duration-300 group-hover/card:shadow-xl group-hover/card:-translate-y-1"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        {/* Portrait area */}
        <div className={cn("relative h-56 overflow-hidden", teamBg)}>
          <AiAvatar
            employeeId={employee.id}
            team={employee.team}
            avatar={employee.avatar}
            name={employee.name}
            fill
          />
          {/* Gradient overlay — blends portrait into white card body */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/70 to-transparent" />
          {/* Status badge */}
          <Badge
            className={cn("absolute top-3 right-3 shadow-sm", status.className)}
            variant="outline"
          >
            {status.label}
          </Badge>
        </div>

        {/* Info section */}
        <div className="relative -mt-6 px-4 pb-4 flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg font-bold text-foreground truncate">
              {employee.name}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {employee.title}
            </p>
            {employee.description && (
              <p className="text-xs text-muted-foreground/80 line-clamp-2 mt-1 leading-relaxed">
                {employee.description}
              </p>
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-1 pt-3 border-t border-border/60">
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {employee.monthlyTaskCount}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">本月任务</span>
            </div>
            <div className="flex flex-col items-center border-x border-border/60">
              <span className="text-sm font-semibold text-foreground">
                {employee.adoptionRate != null
                  ? `${(employee.adoptionRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">采纳率</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {employee.accuracyRate != null
                  ? `${(employee.accuracyRate * 100).toFixed(0)}%`
                  : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">准确率</span>
            </div>
          </div>

          {/* View detail button */}
          <div className="flex items-center justify-center gap-1.5 mt-1 py-2 rounded-lg bg-muted/60 text-xs font-medium text-muted-foreground group-hover/card:bg-primary/10 group-hover/card:text-primary transition-colors">
            <span>查看详情</span>
            <ArrowRight className="size-3.5 transition-transform group-hover/card:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
```

Key design changes vs original:
- **No `<Link>`** — card uses `onClick` prop instead of navigating, for modal activation
- **`role="button"` + `tabIndex={0}`** — accessibility: keyboard navigable
- **Name: `text-lg font-bold`** (18px bold) — upgraded from `text-sm font-semibold` (14px 600)
- **Title: `text-sm`** (14px) — upgraded from `text-xs` (12px)
- **Metric labels: `text-[11px]`** — slightly larger than previous `text-[10px]`
- **Portrait: `h-56`** (224px) with gradient blend
- **Hover group changed** from `group/link` to `group/card`

- [ ] **Step 2: Update loading skeleton**

In `src/app/roster/loading.tsx`, update the skeleton height to match the new taller cards:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-5 w-48 mb-8" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

Changes: heading skeleton from `h-9` to `h-8`, card skeleton from `h-48` to `h-[400px]`, gap from `gap-4` to `gap-5`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. Note: EmployeeGrid doesn't pass `onClick` yet, so cards won't open modals — that's Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/employee-card.tsx src/app/roster/loading.tsx
git commit -m "feat(roster): redesign employee card with portrait layout and larger name"
```

---

### Task 4: Employee Detail Modal — Create modal component

**Files:**
- Create: `src/components/roster/employee-detail-modal.tsx`

- [ ] **Step 1: Create the employee detail modal component**

This new component wraps the existing detail content (hero + tabs) inside a Dialog. It receives an employee ID, fetches full data client-side, and renders inside DialogContent.

Create `src/components/roster/employee-detail-modal.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { Employee, VersionLog } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AiAvatar } from "@/components/shared/ai-avatar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileTab } from "@/components/roster/tabs/profile-tab";
import { SkillsTab } from "@/components/roster/tabs/skills-tab";
import { MetricsTab } from "@/components/roster/tabs/metrics-tab";
import { VersionTab } from "@/components/roster/tabs/version-tab";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "在岗", variant: "default" },
  developing: { label: "开发中", variant: "secondary" },
  planned: { label: "计划中", variant: "outline" },
};

const TEAM_LABEL: Record<string, string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
};

const TEAM_BG: Record<string, string> = {
  management: "bg-gradient-to-br from-purple-50 to-violet-100",
  design: "bg-gradient-to-br from-blue-50 to-sky-100",
  production: "bg-gradient-to-br from-green-50 to-emerald-100",
};

interface EmployeeDetailModalProps {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeDetailModal({ employeeId, open, onOpenChange }: EmployeeDetailModalProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId || !open) {
      setEmployee(null);
      return;
    }
    setLoading(true);
    fetch(`/api/employees/${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("加载失败");
        return res.json();
      })
      .then((data: Employee) => setEmployee(data))
      .catch(() => setEmployee(null))
      .finally(() => setLoading(false));
  }, [employeeId, open]);

  async function handleProfileSave(updates: Partial<Employee>) {
    if (!employee) return;
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...employee, ...updates }),
    });
    if (!res.ok) throw new Error("保存失败");
    const updated: Employee = await res.json();
    setEmployee((prev) => prev ? { ...prev, ...updated } : prev);
  }

  async function handleVersionLogAdd(log: { version: string; date: string; changelog: string }) {
    if (!employee) return;
    const res = await fetch(`/api/employees/${employee.id}/version-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error("提交失败");
    const created: VersionLog = await res.json();
    setEmployee((prev) =>
      prev ? { ...prev, versionLogs: [created, ...(prev.versionLogs ?? [])] } : prev
    );
  }

  const status = employee ? STATUS_MAP[employee.status] : null;
  const teamBg = employee ? (TEAM_BG[employee.team] ?? "bg-muted") : "bg-muted";
  const teamLabel = employee ? (TEAM_LABEL[employee.team] ?? employee.team) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0"
        showCloseButton
      >
        {/* Accessible title — visually hidden, screen reader only */}
        <DialogTitle className="sr-only">
          {employee?.name ?? "员工详情"}
        </DialogTitle>

        {loading || !employee ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Hero */}
            <div className="flex flex-col sm:flex-row">
              {/* Portrait */}
              <div className={cn("relative w-full sm:w-60 h-64 sm:h-72 shrink-0 overflow-hidden rounded-tl-xl", teamBg)}>
                <AiAvatar
                  employeeId={employee.id}
                  team={employee.team}
                  avatar={employee.avatar}
                  name={employee.name}
                  fill
                />
                <div className="hidden sm:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
                <div className="sm:hidden absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
              </div>
              {/* Info */}
              <div className="flex-1 p-5 flex flex-col justify-center gap-2.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">{employee.name}</h2>
                  {status && <Badge variant={status.variant}>{status.label}</Badge>}
                </div>
                <p className="text-base text-muted-foreground">{employee.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                  <span>{teamLabel}</span>
                  {employee.subTeam && (
                    <>
                      <span>·</span>
                      <span>{employee.subTeam}</span>
                    </>
                  )}
                </div>
                {employee.soul && (
                  <p className="text-sm text-muted-foreground italic">"{employee.soul}"</p>
                )}
                {employee.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{employee.description}</p>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="px-5 pb-5">
              <Tabs defaultValue="profile">
                <TabsList>
                  <TabsTrigger value="profile">档案</TabsTrigger>
                  <TabsTrigger value="skills">技能</TabsTrigger>
                  <TabsTrigger value="metrics">指标</TabsTrigger>
                  <TabsTrigger value="version">版本</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <ProfileTab employee={employee} onSave={handleProfileSave} />
                </TabsContent>

                <TabsContent value="skills">
                  <SkillsTab skills={employee.skills ?? []} />
                </TabsContent>

                <TabsContent value="metrics">
                  <MetricsTab metrics={employee.metrics ?? []} />
                </TabsContent>

                <TabsContent value="version">
                  <VersionTab
                    versionLogs={employee.versionLogs ?? []}
                    employeeId={employee.id}
                    onAdd={handleVersionLogAdd}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

Key design decisions:
- **`sm:max-w-3xl`** (768px) — wide enough for hero with portrait + info side by side
- **`max-h-[85vh] overflow-y-auto`** — scrollable when content exceeds viewport
- **`p-0`** on DialogContent — custom padding per section for full-bleed portrait
- **Loading state** — centered spinner while data fetches
- **Hero layout** — same pattern as the direct page, portrait left + info right
- **Portrait in modal** — `w-60` (240px) on desktop, full-width `h-64` on mobile
- **Name: `text-2xl font-bold`** (24px bold)
- **DialogTitle** — hidden with `sr-only` since name is shown in the hero (accessibility requirement for base-ui Dialog)
- **Client-side data fetch** — `GET /api/employees/{id}` fetches full employee. This requires the API route to exist.

- [ ] **Step 2: Verify the API route exists for GET /api/employees/[id]**

Check if `src/app/api/employees/[id]/route.ts` has a GET handler. If it only has PUT, add GET:

```bash
# Check the existing route
cat src/app/api/employees/[id]/route.ts
```

If GET is missing, add it to the file. The GET handler should return the same full employee data that the server component page currently assembles:

```ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const emp = await db.query.employees.findFirst({
    where: (e, { eq: eqFn }) => eqFn(e.id, id),
  });
  if (!emp) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [empSkills, empMetrics, empVersionLogs, empSkillMetrics] = await Promise.all([
    db.select().from(skills).where(eq(skills.employeeId, id)),
    db.select().from(metrics).where(eq(metrics.employeeId, id)),
    db.select().from(versionLogs).where(eq(versionLogs.employeeId, id)),
    db.select().from(skillMetrics).where(eq(skillMetrics.employeeId, id)),
  ]);

  const skillMetricsMap = new Map<string, typeof empSkillMetrics>();
  for (const sm of empSkillMetrics) {
    if (!skillMetricsMap.has(sm.skillId)) skillMetricsMap.set(sm.skillId, []);
    skillMetricsMap.get(sm.skillId)!.push(sm);
  }

  const employee = {
    ...emp,
    skills: empSkills.map((s) => ({
      ...s,
      skillMetrics: skillMetricsMap.get(s.id) ?? [],
    })),
    metrics: empMetrics.map((m) => ({
      ...m,
      customMetrics: m.customMetrics ? JSON.parse(m.customMetrics) : null,
    })),
    versionLogs: empVersionLogs.map((v) => ({
      ...v,
      capabilities: v.capabilities ? JSON.parse(v.capabilities) : null,
    })),
  };

  return Response.json(employee);
}
```

Make sure to add the necessary imports at the top of the route file if they aren't there:
```ts
import { db } from "@/db";
import { skills, metrics, versionLogs, skillMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds. The modal is created but not yet wired — that's Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/employee-detail-modal.tsx src/app/api/employees/\[id\]/route.ts
git commit -m "feat(roster): create employee detail modal with hero layout"
```

---

### Task 5: Wire modal into EmployeeGrid — Replace navigation with Dialog

**Files:**
- Modify: `src/components/roster/employee-grid.tsx`

- [ ] **Step 1: Add Dialog state and render modal in EmployeeGrid**

The grid manages which employee is selected. Clicking a card sets the selected ID and opens the modal.

Replace `src/components/roster/employee-grid.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { EmployeeListItem, TeamType } from "@/lib/types";
import { EmployeeCard } from "./employee-card";
import { EmployeeDetailModal } from "./employee-detail-modal";

type TabValue = "all" | TeamType;

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "management", label: "管理团队" },
  { value: "design", label: "设计师团队" },
  { value: "production", label: "生产团队" },
];

interface EmployeeGridProps {
  employees: EmployeeListItem[];
}

export function EmployeeGrid({ employees }: EmployeeGridProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = employees.filter((emp) => {
    const matchTeam = activeTab === "all" || emp.team === activeTab;
    const q = search.trim().toLowerCase();
    const matchSearch =
      q === "" ||
      emp.name.toLowerCase().includes(q) ||
      emp.title.toLowerCase().includes(q);
    return matchTeam && matchSearch;
  });

  function handleCardClick(id: string) {
    setSelectedId(id);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8"
            placeholder="搜索姓名或职位…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        共 {filtered.length} 名员工
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          没有匹配的员工
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onClick={() => handleCardClick(emp.id)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      <EmployeeDetailModal
        employeeId={selectedId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
```

Changes from original:
- Added `selectedId` and `modalOpen` state
- `handleCardClick` sets the selected employee and opens modal
- Cards now pass `onClick={() => handleCardClick(emp.id)}`
- `<EmployeeDetailModal>` rendered at the end, controlled by state
- No `<Link>` navigation — detail opens in modal overlay

- [ ] **Step 2: Update the Dialog overlay for better backdrop**

The existing `DialogOverlay` uses `bg-black/10` which is very subtle. For a profile modal, we want a more noticeable backdrop. In `src/components/roster/employee-detail-modal.tsx`, the overlay is handled by `DialogContent` internally. To get a stronger backdrop, override the `DialogOverlay` className. 

Actually, since DialogContent internally renders DialogOverlay with its default styling, and we can't easily pass className to it from outside, we should update the dialog overlay default to be slightly stronger. 

In `src/components/ui/dialog.tsx`, find the DialogOverlay className:

Find:
```
"fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
```

Replace with:
```
"fixed inset-0 isolate z-50 bg-black/40 duration-200 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
```

Changes:
- `bg-black/10` → `bg-black/40` — more visible dimming, standard for profile modals
- `backdrop-blur-xs` → `backdrop-blur-sm` — slightly stronger blur
- `duration-100` → `duration-200` — smoother transition

- [ ] **Step 3: Start dev server and test the full flow**

Run: `npm run dev`

Open http://localhost:3000/roster. Test:
1. Click a card → modal opens with backdrop dimming, centered in viewport
2. Modal shows hero with large portrait on left, name `text-2xl font-bold` on right
3. Tabs work inside the modal (档案, 技能, 指标, 版本)
4. Click X to close → returns to grid
5. Click backdrop to close → returns to grid
6. Press ESC → modal closes
7. Scroll long content inside modal (e.g., many skills) → modal scrolls internally
8. Try on narrower viewport → portrait stacks above info

- [ ] **Step 4: Commit**

```bash
git add src/components/roster/employee-grid.tsx src/components/ui/dialog.tsx
git commit -m "feat(roster): wire employee detail modal, upgrade dialog backdrop"
```

---

### Task 6: Update direct detail page with hero layout

**Files:**
- Modify: `src/app/roster/[id]/page.tsx`
- Modify: `src/components/roster/employee-detail.tsx`
- Modify: `src/components/roster/tabs/profile-tab.tsx`

The `/roster/[id]` route still exists for direct URL access (bookmarks, shared links). Update it with the same hero treatment.

- [ ] **Step 1: Widen detail page container**

In `src/app/roster/[id]/page.tsx`, change the container:

Find:
```tsx
<main className="container mx-auto max-w-3xl px-4 py-6">
```
Replace with:
```tsx
<main className="container mx-auto max-w-5xl px-4 py-6">
```

- [ ] **Step 2: Add hero to EmployeeDetail**

Replace `src/components/roster/employee-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Employee, VersionLog } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiAvatar } from "@/components/shared/ai-avatar";
import { ProfileTab } from "@/components/roster/tabs/profile-tab";
import { SkillsTab } from "@/components/roster/tabs/skills-tab";
import { MetricsTab } from "@/components/roster/tabs/metrics-tab";
import { VersionTab } from "@/components/roster/tabs/version-tab";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<Employee["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "在岗", variant: "default" },
  developing: { label: "开发中", variant: "secondary" },
  planned: { label: "计划中", variant: "outline" },
};

const TEAM_LABEL: Record<string, string> = {
  management: "管理团队",
  design: "设计师团队",
  production: "生产团队",
};

const TEAM_BG: Record<string, string> = {
  management: "bg-gradient-to-br from-purple-50 to-violet-100",
  design: "bg-gradient-to-br from-blue-50 to-sky-100",
  production: "bg-gradient-to-br from-green-50 to-emerald-100",
};

interface EmployeeDetailProps {
  employee: Employee;
}

export function EmployeeDetail({ employee: initialEmployee }: EmployeeDetailProps) {
  const [employee, setEmployee] = useState<Employee>(initialEmployee);

  async function handleProfileSave(updates: Partial<Employee>) {
    const res = await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...employee, ...updates }),
    });
    if (!res.ok) throw new Error("保存失败");
    const updated: Employee = await res.json();
    setEmployee((prev) => ({ ...prev, ...updated }));
  }

  async function handleVersionLogAdd(log: {
    version: string;
    date: string;
    changelog: string;
  }) {
    const res = await fetch(`/api/employees/${employee.id}/version-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) throw new Error("提交失败");
    const created: VersionLog = await res.json();
    setEmployee((prev) => ({
      ...prev,
      versionLogs: [created, ...(prev.versionLogs ?? [])],
    }));
  }

  const status = STATUS_MAP[employee.status];
  const teamLabel = TEAM_LABEL[employee.team] ?? employee.team;
  const teamBg = TEAM_BG[employee.team] ?? "bg-muted";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/roster" />}>
          <ArrowLeft />
          返回花名册
        </Button>
      </div>

      {/* Hero section */}
      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10 bg-card">
        <div className="flex flex-col sm:flex-row">
          <div className={cn("relative w-full sm:w-64 h-72 sm:h-80 shrink-0 overflow-hidden", teamBg)}>
            <AiAvatar
              employeeId={employee.id}
              team={employee.team}
              avatar={employee.avatar}
              name={employee.name}
              fill
            />
            <div className="hidden sm:block absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
            <div className="sm:hidden absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
          </div>
          <div className="flex-1 p-6 flex flex-col justify-center gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-base text-muted-foreground">{employee.title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
              <span>{teamLabel}</span>
              {employee.subTeam && (
                <>
                  <span>·</span>
                  <span>{employee.subTeam}</span>
                </>
              )}
            </div>
            {employee.soul && (
              <p className="text-sm text-muted-foreground italic mt-1">"{employee.soul}"</p>
            )}
            {employee.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{employee.description}</p>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">档案</TabsTrigger>
          <TabsTrigger value="skills">技能</TabsTrigger>
          <TabsTrigger value="metrics">指标</TabsTrigger>
          <TabsTrigger value="version">版本</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab employee={employee} onSave={handleProfileSave} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTab skills={employee.skills ?? []} />
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsTab metrics={employee.metrics ?? []} />
        </TabsContent>

        <TabsContent value="version">
          <VersionTab
            versionLogs={employee.versionLogs ?? []}
            employeeId={employee.id}
            onAdd={handleVersionLogAdd}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3: Simplify ProfileTab — remove duplicate avatar**

Replace `src/components/roster/tabs/profile-tab.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Employee } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ProfileTabProps {
  employee: Employee;
  onSave: (updates: Partial<Employee>) => Promise<void>;
}

export function ProfileTab({ employee, onSave }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(employee.title);
  const [soul, setSoul] = useState(employee.soul ?? "");
  const [identity, setIdentity] = useState(employee.identity ?? "");
  const [description, setDescription] = useState(employee.description ?? "");

  function handleCancel() {
    setTitle(employee.title);
    setSoul(employee.soul ?? "");
    setIdentity(employee.identity ?? "");
    setDescription(employee.description ?? "");
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ title, soul, identity, description });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">基本信息</h3>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  取消
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                编辑
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">职位</Label>
          {editing ? (
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          ) : (
            <p className="text-sm text-foreground">{title}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="soul">灵魂</Label>
          {editing ? (
            <Textarea id="soul" value={soul} onChange={(e) => setSoul(e.target.value)} placeholder="描述 AI 员工的核心使命与价值观..." />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {soul || <span className="italic">未设置</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identity">身份</Label>
          {editing ? (
            <Textarea id="identity" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="描述 AI 员工的角色定位..." />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {identity || <span className="italic">未设置</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">简介</Label>
          {editing ? (
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述 AI 员工的能力与职责..." />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {description || <span className="italic">未设置</span>}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

Changes: removed AvatarUpload, Badge, CardTitle, StatusBadge — hero handles all of this now.

- [ ] **Step 4: Verify build and test direct URL access**

Run: `npm run build`
Expected: Build succeeds.

Run: `npm run dev`
Open http://localhost:3000/roster/{any-employee-id} directly. Verify:
- Hero section with large portrait and name renders correctly
- Tabs work
- Back button navigates to roster

- [ ] **Step 5: Commit**

```bash
git add src/app/roster/[id]/page.tsx src/components/roster/employee-detail.tsx src/components/roster/tabs/profile-tab.tsx
git commit -m "feat(roster): update detail page with hero layout, simplify profile tab"
```

---

### Task 7: Visual polish and final verification

**Files:**
- Possibly minor tweaks to any of the above files

- [ ] **Step 1: Full visual review on dev server**

Run: `npm run dev`

**Roster page (http://localhost:3000/roster):**
1. All 24 cards show portrait images filling the top area, fading into white
2. Employee names are `text-lg font-bold` (18px bold) — clearly larger and more prominent
3. Status badges readable over portraits
4. Team left-border colors correct (purple/blue/green)
5. Responsive: 4→3→2→1 columns on resize
6. Card hover: lifts with shadow

**Modal (click any card):**
1. Backdrop dims with blur
2. Modal centered, ~768px wide, scrollable
3. Hero: portrait left (240px), name `text-2xl font-bold` right
4. All 4 tabs work
5. Profile edit saves correctly
6. Close via X, backdrop click, ESC all work

**Direct page (http://localhost:3000/roster/{id}):**
1. Hero with large portrait renders
2. Back button works
3. All tabs functional

**Typography:**
1. Body text across all pages is 14px
2. Chinese text has comfortable line-height
3. No text feels too small or too large

- [ ] **Step 2: Fix any visual issues found**

Apply minor tweaks as needed (spacing, gradient opacity, etc.).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore(roster): visual polish for card, modal, and typography redesign"
```
