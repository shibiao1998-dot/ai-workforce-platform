# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

AI Workforce Platform (`ai-workforce-platform`) — an internal management dashboard for a team of 24 AI employees across management, design, and production lines. The UI language is Chinese. Built with Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint (flat config, v9)
npm run db:push          # Push schema changes to SQLite
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run Drizzle migrations
npm run db:seed          # Seed database (tsx src/db/seed.ts)
npm run generate:avatars # Generate AI employee portraits via Gemini API
```

No test framework is configured. No Prettier is configured.

The `generate:avatars` script requires `GEMINI_GATEWAY_URL` and `GEMINI_API_KEY` in `.env.local`. It calls Gemini 3.1 Flash Image Preview via an OpenAI-compatible gateway (`https://ai-gateway.aiae.ndhy.com/v1/chat/completions`) to produce landscape (1376x768) 2D portrait PNGs in `public/avatars/`. Prompts are assembled from persona data using `buildPrompt()` with team accent colors (purple/blue/green). The script is resumable — it skips employees whose avatar file already exists. The runtime library `src/lib/avatar-generator.ts` shares the same STYLE_PREFIX for single-avatar regeneration.

## Architecture

**Data flow pattern:** Pages are async server components that query SQLite directly via Drizzle ORM, then pass data as props to `"use client"` interactive components. API routes under `src/app/api/` handle mutations and client-side data fetching.

**Database:** SQLite (`local.db` at project root) via `better-sqlite3` + Drizzle ORM. WAL mode and foreign keys enabled. Schema in `src/db/schema.ts` with 9 tables: `employees`, `skills`, `skill_metrics`, `metrics`, `tasks`, `task_steps`, `task_outputs`, `version_logs`, `metric_configs`. Connection from `src/db/index.ts`. All PKs are `text("id")` using `randomUUID()`. All FKs use `onDelete: "cascade"`. No Drizzle `relations()` — only column-level `.references()`.

**Layout:** Root layout (`src/app/layout.tsx`) uses a `flex h-screen` split: narrow icon-only `Sidebar` on the left + scrollable `<main>` on the right.

**Routes:**
- `/` → redirects to `/roster`
- `/dashboard` — KPI dashboard with heatmap, team comparison, recent tasks, leaderboard, operational index gauge
- `/roster` — Employee grid with filtering; click opens detail modal (Dialog). `/roster/[id]` also exists for direct URL access.
- `/production` — Production kanban with stat cards, tabbed layout (realtime/dashboard/history). Task cards show mini SOP stepper; clicking opens a detail Dialog modal with quality metrics, vertical step timeline with COT, outputs list, and execution reflection. `/production/[taskId]` exists for direct URL access.
- `/org` — Organization chart (React Flow / `@xyflow/react`)
- `/settings` — Employee and metric config management, data management center

**API routes:** Grouped under `src/app/api/`:
- `/api/dashboard/{summary,heatmap,recent-tasks,team-comparison}` — dashboard data endpoints
- `/api/employees/[id]/{avatar,avatar-status,skills,version-logs}` — employee CRUD and sub-resources
- `/api/tasks/[taskId]` — task detail with SOP steps
- `/api/production-stats` — aggregated production dashboard data (supports `timeRange` and `date` query params)
- `/api/metric-configs/{[id],resolve}` — metric configuration management
- `/api/data/{metrics,skill-metrics,tasks,export}` — data management CRUD with `[id]` sub-routes

**API route caveat:** Static API route segments (e.g. `/api/production-stats`) must NOT be placed as siblings of dynamic segments (e.g. `/api/tasks/[taskId]`) — the dynamic segment catches the static name. Use a separate top-level path instead.

**Path alias:** `@/*` maps to `./src/*`.

## Key Conventions

- All user-facing text must be in Chinese.
- Pages (`page.tsx`) are server components — do not add `"use client"` to them. Interactive parts go in separate client components.
- Loading states use `loading.tsx` skeleton files (see `/dashboard/loading.tsx`, `/roster/loading.tsx`).
- Employee avatars are AI-generated landscape portrait images (1376x768) stored in `public/avatars/{name}.png`. The `AiAvatar` component (`src/components/shared/ai-avatar.tsx`) has two modes: fixed-size (with `size` prop) and `fill` mode (fills container with `object-cover`). Falls back to a procedurally generated SVG robot (deterministic from employee ID, colored by team) when `avatar` is null.
- The `employees.persona` column stores a JSON string matching the `EmployeePersona` interface (`src/lib/types.ts`): age, gender, personality[], catchphrase, backstory, workStyle, interests[], fashionStyle, mbti, visualTraits, sceneDescription. All 24 employees have persona data. Parse with `JSON.parse(employee.persona) as EmployeePersona`.
- Employee cards use a portrait-centric layout: large `h-80` avatar area with team-colored gradient background, gradient overlay blending into white, status badge overlay, name (`text-lg font-bold`), title, description, metrics row, and a "查看详情" button. Clicking opens a centered Dialog modal (`employee-detail-modal.tsx`), not page navigation.
- Team identity is conveyed via left border color (purple=management, blue=design, green=production) and gradient backgrounds.
- The `skill_metrics` table tracks per-skill monthly metrics (invocation count, success rate, avg response time). Displayed in the skills tab of employee detail.
- The `employees` table has a `subTeam` column used by the production team to distinguish "生产管理层" from "内容生产层".
- The `metrics` table tracks monthly periods as `YYYY-MM` strings.
- The `task_steps` table stores SOP execution steps per task (stepOrder, status enum: pending/running/completed/failed/skipped, optional COT thought text). Running tasks should have exactly one "running" step with completed before and pending after.
- The `tasks.reflection` field stores JSON `{ problems, lessons, improvements }` — not plain text. Both running and completed tasks can have reflections.
- The `tasks.qualityScore` (0-100), `retryCount`, and `tokenUsage` fields are populated for completed tasks. Token usage is displayed as estimated RMB cost in the UI.
- The production page uses a client wrapper (`time-range-selector.tsx` → `ProductionClient`) that owns the time range state and passes it to `ProductionStats` and `ProductionTabs`. Running task cards fetch their own SOP steps via `/api/tasks/[id]` for the mini stepper display.
- The `/api/production-stats` endpoint provides aggregated dashboard data (summary, daily trend by team, type distribution, employee ranking). It supports `timeRange` and `date` query params for chart linking.

## UI Components

shadcn/ui built on `@base-ui/react` (not Radix). Dialog, AlertDialog, Tabs, etc. all use Base UI primitives. When adding new shadcn components, they will use `@base-ui/react` — do not import from `@radix-ui`. The Button component does **not** have an `asChild` prop — wrap `<a>` around `<Button>` instead.

**Styling:** Tailwind CSS v4 with `@theme inline` and `@custom-variant` syntax (no `tailwind.config.js`). CSS variables for theming defined in `src/app/globals.css`. Base font: 14px with line-height 1.57 (Chinese SaaS optimized). Class composition via `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge). Light theme only — dark mode variant is declared but no dark color values exist yet. CSS imports: `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`.

**Charts:** ECharts via `echarts-for-react` for data visualization (heatmaps, trend charts, comparisons, gauges, pie charts). Pattern: `<ReactECharts option={...} style={{ height: N }} />` wrapped in Card components.

**Org chart:** React Flow (`@xyflow/react`) with custom `EmployeeNode` component, controls, and legend.

## Next.js 16 Warning

This project uses **Next.js 16.2.4**, which has breaking changes from earlier versions. Before writing Next.js-specific code (routing, API routes, config, middleware), read the relevant guide in `node_modules/next/dist/docs/01-app/` first. Do not rely on training data for Next.js APIs.
