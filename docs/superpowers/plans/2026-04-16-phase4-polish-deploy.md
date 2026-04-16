# AI Workforce Platform — Phase 4: Polish & Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Prerequisite:** Phases 1, 2, and 3 must be complete (tags `phase-1-complete`, `phase-2-complete`, `phase-3-complete` must exist).

**Goal:** Add UI animations (counter roll-up, card hover effects, chart load animations), tablet-responsive layout, switch to production-grade PostgreSQL on Vercel, and deploy the app to Vercel with a public URL.

**Architecture:** Animations use CSS transitions + a custom `useCountUp` hook. Responsive breakpoints use Tailwind sm/md/lg/xl classes already in the codebase. Database migration uses Drizzle with `@vercel/postgres`. Deployment is via Vercel CLI.

**Tech Stack:** Framer Motion (for card animations), custom `useCountUp` hook, `@vercel/postgres`, Vercel CLI.

---

## File Structure

```
src/
├── hooks/
│   └── use-count-up.ts              # Counter animation hook
├── components/
│   ├── dashboard/
│   │   └── kpi-card.tsx             # Modified: add counter animation
│   └── ui/
│       └── animated-card.tsx       # Card with hover lift + glow effect
├── app/
│   └── globals.css                  # Modified: add animation keyframes
└── db/
    └── index.ts                     # Modified: switch to postgres in production
vercel.json                          # Vercel config
.env.example                         # Environment variable template
```

---

### Task 1: Counter Animation Hook

**Files:**
- Create: `src/hooks/use-count-up.ts`

- [ ] **Step 1: Write useCountUp hook**

Create `src/hooks/use-count-up.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 1200, decimals = 0): string {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const animate = (ts: number) => {
      if (startTime.current === null) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      startTime.current = null;
    };
  }, [target, duration]);

  return current.toFixed(decimals);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-count-up.ts
git commit -m "feat: add useCountUp animation hook"
```

---

### Task 2: Animated KPI Cards

**Files:**
- Modify: `src/components/dashboard/kpi-card.tsx`
- Modify: `src/components/dashboard/kpi-section.tsx`

- [ ] **Step 1: Update KpiCard to use counter animation**

Replace `src/components/dashboard/kpi-card.tsx` with:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";

interface KpiCardProps {
  title: string;
  numericValue: number;
  displaySuffix?: string;
  displayPrefix?: string;
  decimals?: number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: "blue" | "green" | "yellow" | "purple" | "red";
}

const ACCENT_CLASSES = {
  blue: "text-[#00d4ff]",
  green: "text-[#00ff88]",
  yellow: "text-[#ffd93d]",
  purple: "text-[#c084fc]",
  red: "text-[#ff6b6b]",
};

export function KpiCard({
  title,
  numericValue,
  displaySuffix = "",
  displayPrefix = "",
  decimals = 0,
  subtitle,
  trend,
  trendLabel,
  accent = "blue",
}: KpiCardProps) {
  const animated = useCountUp(numericValue, 1200, decimals);
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden group hover:-translate-y-0.5 transition-transform duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,212,255,0.3)" }} />
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
        <p className={cn("text-3xl font-bold tabular-nums", ACCENT_CLASSES[accent])}>
          {displayPrefix}{animated}{displaySuffix}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && trendLabel && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update KpiSection to pass numeric props**

Replace `src/components/dashboard/kpi-section.tsx` with:

```tsx
import { KpiCard } from "./kpi-card";

interface SummaryData {
  totalEmployees: number;
  activeEmployees: number;
  activeRate: number;
  monthlyTaskCount: number;
  humanTimeSavedHours: number;
  humanTimeSavedCost: number;
  avgAdoptionRate: number;
  avgAccuracyRate: number;
  projectsCovered: number;
}

export function KpiSection({ data }: { data: SummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        title="AI员工"
        numericValue={data.activeEmployees}
        displaySuffix={`/${data.totalEmployees}`}
        subtitle={`在岗率 ${Math.round(data.activeRate * 100)}%`}
        accent="blue"
        trend="up"
        trendLabel="较上月 +2"
      />
      <KpiCard
        title="本月任务量"
        numericValue={data.monthlyTaskCount}
        subtitle="已完成任务数"
        accent="green"
        trend="up"
        trendLabel="较上月 +18%"
      />
      <KpiCard
        title="节省人力"
        numericValue={data.humanTimeSavedHours}
        displaySuffix="h"
        decimals={1}
        subtitle={`约 ¥${data.humanTimeSavedCost.toLocaleString()}`}
        accent="yellow"
        trend="up"
        trendLabel="等效人天"
      />
      <KpiCard
        title="平均采纳率"
        numericValue={Math.round(data.avgAdoptionRate * 100)}
        displaySuffix="%"
        subtitle="AI产出被采用比例"
        accent="purple"
        trend="up"
        trendLabel="较上月 +3%"
      />
      <KpiCard
        title="平均准确率"
        numericValue={Math.round(data.avgAccuracyRate * 100)}
        displaySuffix="%"
        subtitle="一次性通过质检"
        accent="green"
        trend="neutral"
        trendLabel="持平"
      />
      <KpiCard
        title="覆盖业务数"
        numericValue={data.projectsCovered}
        subtitle="涉及任务类型数"
        accent="blue"
        trend="up"
        trendLabel="本月新增 15"
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify animation in browser**

With dev server running, open `http://localhost:3000/dashboard` and hard-reload (Cmd+Shift+R). Numbers should animate from 0 to their target values over ~1.2 seconds.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ src/hooks/
git commit -m "feat: add counter roll-up animation to KPI cards"
```

---

### Task 3: Page Entry Animations

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/roster/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add fade-in-up keyframe to globals.css**

Edit `src/app/globals.css`, add before the last `@layer base` block:

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.4s ease-out both;
}

.animate-delay-100 { animation-delay: 0.1s; }
.animate-delay-200 { animation-delay: 0.2s; }
.animate-delay-300 { animation-delay: 0.3s; }
.animate-delay-400 { animation-delay: 0.4s; }
.animate-delay-500 { animation-delay: 0.5s; }
```

- [ ] **Step 2: Add animation to roster page header**

In `src/app/roster/page.tsx`, wrap the header div:

```tsx
<div className="mb-8 animate-fade-in-up">
  <h1 className="text-3xl font-bold text-foreground">AI 员工花名册</h1>
  ...
</div>
```

And the grid wrapper in `employee-grid.tsx`, add `animate-fade-in-up animate-delay-100` to the outer `<div className="space-y-6">`.

- [ ] **Step 3: Add animation to dashboard shell**

In `src/components/dashboard/dashboard-shell.tsx`, update:

```tsx
<div className="p-8 space-y-8">
  <div className="animate-fade-in-up">...</div>
  <div className="animate-fade-in-up animate-delay-100"><KpiSection ... /></div>
  <div className="animate-fade-in-up animate-delay-200"><TeamComparisonChart ... /></div>
  <div className="animate-fade-in-up animate-delay-300 grid ...">{...}</div>
</div>
```

- [ ] **Step 4: Verify animations**

Reload each page and confirm smooth fade-in-up for each section with staggered delays.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/roster/page.tsx src/components/dashboard/dashboard-shell.tsx src/components/roster/employee-grid.tsx
git commit -m "feat: add staggered fade-in-up page entry animations"
```

---

### Task 4: Tablet Responsive Audit

**Files:**
- Modify: `src/components/nav/sidebar.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Verify existing breakpoints work**

Open Chrome DevTools, toggle to iPad dimensions (1024×768 and 768×1024).

Check each page:
- Roster grid: should be 2-col at sm, 3-col at lg → works with existing `sm:grid-cols-2 lg:grid-cols-3`
- Dashboard KPIs: should be 2-col at sm, 3-col at sm, 6-col at lg → works with existing classes
- Sidebar icons should remain accessible

- [ ] **Step 2: Add tooltip to sidebar for tablet**

The sidebar is already icon-only with tooltips, which works on tablet. No change needed.

- [ ] **Step 3: Fix production board table scroll on tablet**

In `src/components/production/task-history-table.tsx`, wrap the table div with:

```tsx
<div className="overflow-x-auto rounded-lg border border-border">
  <Table>
    ...
  </Table>
</div>
```

(Remove the existing `rounded-lg border border-border overflow-hidden` from the outer div)

- [ ] **Step 4: Commit**

```bash
git add src/components/production/task-history-table.tsx
git commit -m "fix: add horizontal scroll for task history table on tablet"
```

---

### Task 5: Environment Configuration

**Files:**
- Create: `.env.example`
- Create: `vercel.json`
- Modify: `src/db/index.ts`

- [ ] **Step 1: Create .env.example**

Create `.env.example`:

```
# Database (local development uses SQLite, production uses PostgreSQL)
DATABASE_URL=

# Set to "production" to use PostgreSQL instead of SQLite
NODE_ENV=development
```

- [ ] **Step 2: Create vercel.json**

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NODE_ENV": "production"
  }
}
```

- [ ] **Step 3: Update db/index.ts to support both SQLite and PostgreSQL**

Install postgres adapter:

```bash
npm install @vercel/postgres drizzle-orm
```

Replace `src/db/index.ts`:

```typescript
import path from "path";

let db: any;

if (process.env.NODE_ENV === "production" && process.env.POSTGRES_URL) {
  const { drizzle } = await import("drizzle-orm/vercel-postgres");
  const { sql } = await import("@vercel/postgres");
  const schema = await import("./schema");
  db = drizzle(sql, { schema });
} else {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const schema = await import("./schema");
  const DB_PATH = path.join(process.cwd(), "local.db");
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
}

export { db };
export type DB = typeof db;
```

> **Note:** This dynamic import pattern avoids bundling both drivers. Vercel detects `@vercel/postgres` and sets `POSTGRES_URL` automatically when a Postgres database is linked.

- [ ] **Step 4: Commit**

```bash
git add .env.example vercel.json src/db/index.ts
git commit -m "feat: add environment config and dual-database support for production"
```

---

### Task 6: Vercel Deployment

- [ ] **Step 1: Install Vercel CLI**

```bash
npm install -g vercel
```

- [ ] **Step 2: Login to Vercel**

```bash
vercel login
```

Follow the browser prompt to authenticate.

- [ ] **Step 3: Deploy to Vercel**

```bash
vercel --prod
```

When prompted:
- Set up and deploy: `Y`
- Which scope: select your personal account
- Link to existing project: `N`
- Project name: `ai-workforce-platform`
- Directory: `./` (current)
- Override settings: `N`

Expected: Deployment completes and prints a production URL like `https://ai-workforce-platform-xxx.vercel.app`

- [ ] **Step 4: Add Vercel Postgres**

```bash
vercel env add POSTGRES_URL
```

Or via Vercel dashboard:
1. Go to project Settings → Storage → Connect Database
2. Create a new Postgres database
3. Copy `POSTGRES_URL` from the database credentials

- [ ] **Step 5: Push schema to production Postgres**

```bash
POSTGRES_URL="<your-postgres-url>" npm run db:push
```

Expected: `[✓] Changes applied` against the Postgres instance.

- [ ] **Step 6: Seed production data**

```bash
POSTGRES_URL="<your-postgres-url>" NODE_ENV=production npm run db:seed
```

Expected: `Seeded 24 employees.`

- [ ] **Step 7: Redeploy**

```bash
vercel --prod
```

- [ ] **Step 8: Verify production URL**

Open the Vercel deployment URL:
- `/roster` → shows 24 employees
- `/dashboard` → shows charts with data
- `/production` → shows tasks
- `/org` → shows org chart

- [ ] **Step 9: Final commit and tag**

```bash
git add .
git commit -m "chore: phase 4 complete — animations, responsive fixes, Vercel deployment"
git tag phase-4-complete
git tag v1.0.0
```

---

### Task 7: Performance Audit

- [ ] **Step 1: Check Lighthouse scores**

In Chrome DevTools, run Lighthouse on the production URL for:
- `/dashboard`
- `/roster`

Target: Performance ≥ 70, Accessibility ≥ 90.

- [ ] **Step 2: Add loading skeletons for roster page**

If roster page feels slow, add a loading.tsx:

Create `src/app/roster/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-8">
      <Skeleton className="h-9 w-64 mb-2" />
      <Skeleton className="h-5 w-48 mb-8" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

Install skeleton component:
```bash
npx shadcn@latest add skeleton
```

- [ ] **Step 3: Add loading for dashboard**

Create `src/app/dashboard/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-8 space-y-8">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-[420px]" />
    </div>
  );
}
```

- [ ] **Step 4: Final commit**

```bash
git add src/app/roster/loading.tsx src/app/dashboard/loading.tsx
git commit -m "feat: add loading skeleton states for roster and dashboard"
git tag v1.0.1
```
