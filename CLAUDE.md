# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

AI Workforce Platform (`ai-workforce-platform`) — an internal management dashboard for a team of 24 AI employees across management, design, and production lines. The UI language is Chinese. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint (flat config, v9)
npm run db:push      # Push schema changes to SQLite
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run Drizzle migrations
npm run db:seed      # Seed database (tsx src/db/seed.ts)
```

No test framework is configured. No Prettier is configured.

## Architecture

**Data flow pattern:** Pages are async server components that query SQLite directly via Drizzle ORM, then pass data as props to `"use client"` interactive components. API routes under `src/app/api/` handle mutations and client-side data fetching.

**Database:** SQLite (`local.db` at project root) via `better-sqlite3` + Drizzle ORM. WAL mode and foreign keys enabled. Schema defined in `src/db/schema.ts` with 7 tables: `employees`, `skills`, `metrics`, `tasks`, `task_outputs`, `version_logs`, `metric_configs`. Connection exported from `src/db/index.ts`.

**Layout:** Root layout uses a sidebar + main content split. The sidebar (`src/components/nav/sidebar.tsx`) is a narrow icon-only nav bar with tooltips.

**Routes:**
- `/` → redirects to `/roster`
- `/dashboard` — KPI dashboard with heatmap, team comparison, recent tasks
- `/roster` — Employee grid with filtering; `/roster/[id]` for detail
- `/production` — Task kanban + history; `/production/[taskId]` for detail
- `/org` — Organization chart (React Flow / `@xyflow/react`)
- `/settings` — Employee and metric config management

**Styling:** Tailwind CSS v4 with CSS variables for theming. shadcn/ui components in `src/components/ui/`. Class composition via `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge). Light business theme.

**Charts:** ECharts via `echarts-for-react` for data visualization (heatmaps, trend charts, comparisons).

**Path alias:** `@/*` maps to `./src/*`.

## Key Conventions

- All user-facing text must be in Chinese.
- Pages (`page.tsx`) are server components — do not add `"use client"` to them. Interactive parts go in separate client components.
- Loading states use `loading.tsx` skeleton files (see `/dashboard/loading.tsx`, `/roster/loading.tsx`).
- Employee avatars are procedurally generated SVG robots (`src/components/shared/ai-avatar.tsx`) — deterministic from employee ID, colored by team.
- Database IDs use `randomUUID()` from Node crypto.
- The `metrics` table tracks monthly periods as `YYYY-MM` strings.

## Next.js 16 Warning

This project uses **Next.js 16.2.4**, which has breaking changes from earlier versions. Before writing Next.js-specific code (routing, API routes, config, middleware), read the relevant guide in `node_modules/next/dist/docs/01-app/` first. Do not rely on training data for Next.js APIs.
