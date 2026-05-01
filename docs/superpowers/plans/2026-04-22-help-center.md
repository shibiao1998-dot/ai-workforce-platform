# Help Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app help center with a slide-over reading panel and a rich-text editing backend in settings.

**Architecture:** Two new DB tables (help_categories, help_articles) store structured documentation. A slide-over panel triggered from the sidebar renders articles as HTML. The settings page gets a new tab with Tiptap rich-text editor for CRUD. Seed data populates initial content from the existing product documentation.

**Tech Stack:** Next.js 16, Drizzle ORM/SQLite, Tiptap (@tiptap/react), DOMPurify, shadcn/ui (Tabs, Dialog, AlertDialog)

**Spec:** `docs/superpowers/specs/2026-04-22-help-center-design.md`

---

## Phase 1: Foundation (DB + API)

### Task 1: Database Schema

**Files:**
- Modify: `src/db/schema.ts` (append after line 112)

- [ ] **Step 1: Add help_categories and help_articles tables to schema**

Append to the end of `src/db/schema.ts`:

```typescript
export const helpCategories = sqliteTable("help_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

export const helpArticles = sqliteTable("help_articles", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => helpCategories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
```

- [ ] **Step 2: Push schema to database**

Run: `npm run db:push`
Expected: Tables `help_categories` and `help_articles` created successfully.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat(help): add help_categories and help_articles tables to schema"
```

---

### Task 2: Categories API Routes

**Files:**
- Create: `src/app/api/help/categories/route.ts`
- Create: `src/app/api/help/categories/[id]/route.ts`

- [ ] **Step 1: Create categories list + create route**

Create `src/app/api/help/categories/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpCategories, helpArticles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET() {
  const rows = await db
    .select({
      id: helpCategories.id,
      name: helpCategories.name,
      icon: helpCategories.icon,
      sortOrder: helpCategories.sortOrder,
      createdAt: helpCategories.createdAt,
      updatedAt: helpCategories.updatedAt,
      articleCount: sql<number>`(SELECT COUNT(*) FROM help_articles WHERE help_articles.category_id = ${helpCategories.id})`,
    })
    .from(helpCategories)
    .orderBy(helpCategories.sortOrder);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();
  await db.insert(helpCategories).values({
    id,
    name: body.name,
    icon: body.icon ?? null,
    sortOrder: body.sortOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const created = await db
    .select()
    .from(helpCategories)
    .where(eq(helpCategories.id, id))
    .get();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Create categories [id] route (PUT + DELETE)**

Create `src/app/api/help/categories/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  await db
    .update(helpCategories)
    .set({
      name: body.name,
      icon: body.icon,
      sortOrder: body.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(helpCategories.id, id));
  const updated = await db
    .select()
    .from(helpCategories)
    .where(eq(helpCategories.id, id))
    .get();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(helpCategories).where(eq(helpCategories.id, id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/help/categories/
git commit -m "feat(help): add categories API routes (GET/POST/PUT/DELETE)"
```

---

### Task 3: Articles API Routes

**Files:**
- Create: `src/app/api/help/articles/route.ts`
- Create: `src/app/api/help/articles/[id]/route.ts`

- [ ] **Step 1: Create articles list + create route**

Create `src/app/api/help/articles/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { eq, like, or, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const conditions = [];
  if (categoryId) {
    conditions.push(eq(helpArticles.categoryId, categoryId));
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(helpArticles.title, pattern),
        like(helpArticles.summary, pattern)
      )
    );
  }

  const rows = await db
    .select({
      id: helpArticles.id,
      categoryId: helpArticles.categoryId,
      title: helpArticles.title,
      summary: helpArticles.summary,
      sortOrder: helpArticles.sortOrder,
      updatedAt: helpArticles.updatedAt,
    })
    .from(helpArticles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(helpArticles.sortOrder);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id = randomUUID();
  await db.insert(helpArticles).values({
    id,
    categoryId: body.categoryId,
    title: body.title,
    summary: body.summary ?? null,
    content: body.content,
    sortOrder: body.sortOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const created = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .get();
  return NextResponse.json(created, { status: 201 });
}
```

- [ ] **Step 2: Create articles [id] route (GET/PUT/DELETE)**

Create `src/app/api/help/articles/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { helpArticles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .get();
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(article);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
  if (body.title !== undefined) updates.title = body.title;
  if (body.summary !== undefined) updates.summary = body.summary;
  if (body.content !== undefined) updates.content = body.content;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  await db
    .update(helpArticles)
    .set(updates)
    .where(eq(helpArticles.id, id));
  const updated = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .get();
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(helpArticles).where(eq(helpArticles.id, id));
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/help/articles/
git commit -m "feat(help): add articles API routes (GET/POST/PUT/DELETE)"
```

---

### Task 4: Seed Data

**Files:**
- Modify: `src/db/seed.ts` (add import + append seedHelpDocs function)

- [ ] **Step 1: Add helpCategories and helpArticles to imports at top of seed.ts**

At line 2 of `src/db/seed.ts`, change:

```typescript
import { employees, skills, skillMetrics, metrics, versionLogs, tasks, taskOutputs, taskSteps, metricConfigs } from "./schema";
```

to:

```typescript
import { employees, skills, skillMetrics, metrics, versionLogs, tasks, taskOutputs, taskSteps, metricConfigs, helpCategories, helpArticles } from "./schema";
```

- [ ] **Step 2: Create separate seed script for help docs**

Create `src/db/seed-help-docs.ts` — a standalone script that seeds the help center content. This keeps the main seed.ts manageable.

The file should:
1. Import `db` from `./index` and `helpCategories`, `helpArticles` from `./schema`
2. Define 4 categories with fixed UUIDs (so re-running is idempotent — delete existing then re-insert)
3. Define ~15 articles with HTML content derived from `docs/产品与数据指标说明.md`
4. Each article's `content` field contains properly formatted HTML with `<h2>`, `<h3>`, `<p>`, `<table>`, `<ul>`, `<code>`, `<strong>` tags
5. Export a `seedHelpDocs()` function
6. At the bottom: `seedHelpDocs().catch(console.error);`

The article content should be a faithful HTML conversion of the corresponding markdown sections from the product documentation. Use proper semantic HTML: `<table>` for tables, `<ul>`/`<ol>` for lists, `<code>` for inline code, `<pre><code>` for code blocks, `<strong>` for bold.

Category mapping:
- 🚀 快速开始 (sortOrder 1): 平台简介 (§1+§7.1), 团队组织 (§7), 快速上手指南 (new overview article)
- 📊 功能模块 (sortOrder 2): 驾驶舱指南 (§2.1), 花名册指南 (§2.2), 生产看板指南 (§2.3), 组织架构指南 (§2.4), 系统设置指南 (§2.5)
- 📋 数据指标 (sortOrder 3): 核心运营指标 (§4.1), 任务质量指标 (§4.2+§4.3), 游戏化与成就系统 (§4.4+§4.5), 指标配置体系 (§5)
- ⚙️ 任务工作流 (sortOrder 4): 任务类型与 SOP 步骤 (§6.1+§6.2), 步骤状态与反思 (§6.3+§6.4)

**IMPORTANT:** The HTML content for each article should be substantial — not placeholder text. Convert the actual markdown content from the product documentation into HTML. This is the initial data users will see.

- [ ] **Step 3: Add call to seedHelpDocs in main seed.ts**

Before the closing of the `seed()` function in `src/db/seed.ts`, add:

```typescript
  // Seed help docs
  const { seedHelpDocs } = await import("./seed-help-docs");
  await seedHelpDocs();
```

- [ ] **Step 4: Run seed to verify**

Run: `npm run db:seed`
Expected: Seed completes without errors, help categories and articles inserted.

- [ ] **Step 5: Verify via API**

Run: `curl http://localhost:3000/api/help/categories 2>/dev/null | head -200`
Expected: JSON array with 4 categories, each with articleCount > 0.

- [ ] **Step 6: Commit**

```bash
git add src/db/seed.ts src/db/seed-help-docs.ts
git commit -m "feat(help): add seed data for help center (4 categories, ~15 articles)"
```

---

## Phase 2: Reading Panel

### Task 5: Install Dependencies

**Files:** `package.json` (auto-modified by npm)

- [ ] **Step 1: Install Tiptap and DOMPurify**

Run:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-underline @tiptap/extension-placeholder @tiptap/extension-highlight dompurify @tiptap/pm
npm install -D @types/dompurify
```

Expected: Packages installed successfully. Check `package.json` confirms additions.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tiptap, dompurify dependencies for help center"
```

---

### Task 6: Help Panel Context

**Files:**
- Create: `src/components/help/help-panel-context.tsx`

- [ ] **Step 1: Create the context provider**

Create `src/components/help/help-panel-context.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface HelpPanelContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const HelpPanelContext = createContext<HelpPanelContextType | null>(null);

export function HelpPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <HelpPanelContext value={{ isOpen, toggle, open, close }}>
      {children}
    </HelpPanelContext>
  );
}

export function useHelpPanel() {
  const ctx = useContext(HelpPanelContext);
  if (!ctx) throw new Error("useHelpPanel must be used within HelpPanelProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/help/help-panel-context.tsx
git commit -m "feat(help): add HelpPanelContext for slide-over state"
```

---

### Task 7: Help Panel Component

**Files:**
- Create: `src/components/help/help-article-content.css`
- Create: `src/components/help/help-panel.tsx`

- [ ] **Step 1: Create article content CSS styles**

Create `src/components/help/help-article-content.css` with styles for rendered HTML content:

```css
.help-article-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-foreground);
}
.help-article-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
}
.help-article-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 1.25rem 0 0.5rem;
}
.help-article-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}
.help-article-content p {
  margin: 0 0 0.75rem;
}
.help-article-content ul,
.help-article-content ol {
  margin: 0 0 0.75rem;
  padding-left: 1.5rem;
}
.help-article-content li {
  margin: 0.25rem 0;
}
.help-article-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75rem 0;
  font-size: 13px;
}
.help-article-content th,
.help-article-content td {
  border: 1px solid var(--color-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.help-article-content th {
  background: var(--color-muted);
  font-weight: 600;
}
.help-article-content code {
  background: var(--color-muted);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
}
.help-article-content pre {
  background: var(--color-muted);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.75rem 0;
}
.help-article-content pre code {
  background: none;
  padding: 0;
}
.help-article-content strong {
  font-weight: 600;
}
.help-article-content hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1.5rem 0;
}
```

- [ ] **Step 2: Create the help panel component**

Create `src/components/help/help-panel.tsx`. This is the main slide-over panel with two views: article list and article detail.

The component should:
1. Be a `"use client"` component
2. Import `useHelpPanel` from context, `DOMPurify` for sanitization, the CSS file
3. Fetch categories on mount via `GET /api/help/categories`
4. Fetch articles when `activeCategory` or `searchQuery` changes via `GET /api/help/articles?categoryId=X&search=Y`
5. Fetch article detail when `selectedArticle` changes via `GET /api/help/articles/[id]`
6. Render as a fixed-position panel: `left-16` (64px sidebar offset), `w-[420px]`, `h-screen`, `z-40`
7. Include a backdrop overlay on the main area that calls `close()` on click
8. Animate with `transition-transform duration-300` — translate-x-0 when open, -translate-x-full when closed
9. **List view:** header (title + close button), search input with debounce, category tabs (horizontal scroll), article cards (icon + title + summary + arrow)
10. **Detail view:** breadcrumb (back / category / title), article title + updatedAt, HTML content rendered via sanitized innerHTML after DOMPurify sanitization
11. Use `useState` for: `activeCategory`, `selectedArticle`, `searchQuery`, `categories`, `articles`, `articleDetail`

Key interactions:
- Tab click: set `activeCategory`, clear `selectedArticle`
- Card click: set `selectedArticle`, fetch full article
- Back button: clear `selectedArticle`
- Search: debounce 300ms, fetch with search param, clear `activeCategory` when searching
- Close: button or backdrop click

- [ ] **Step 3: Commit**

```bash
git add src/components/help/help-article-content.css src/components/help/help-panel.tsx
git commit -m "feat(help): add slide-over reading panel component"
```

---

### Task 8: Integrate Panel into Layout + Sidebar

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/nav/sidebar.tsx`

- [ ] **Step 1: Update layout.tsx to add HelpPanelProvider and HelpPanel**

Modify `src/app/layout.tsx`:

1. Add imports at top:
```typescript
import { HelpPanelProvider } from "@/components/help/help-panel-context";
import { HelpPanel } from "@/components/help/help-panel";
```

2. Wrap the flex container content with the provider and add the panel. Change lines 31-35 from:

```tsx
<body>
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-y-auto">{children}</main>
  </div>
</body>
```

to:

```tsx
<body>
  <HelpPanelProvider>
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <HelpPanel />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </HelpPanelProvider>
</body>
```

- [ ] **Step 2: Add help button to sidebar**

Modify `src/components/nav/sidebar.tsx`:

1. Add import: `HelpCircle` to the lucide-react imports
2. Add import: `import { useHelpPanel } from "@/components/help/help-panel-context";`
3. Inside the `Sidebar` component, add `const { toggle } = useHelpPanel();`
4. After the closing `</nav>` tag (line 67) and before `</aside>`, add:

```tsx
{/* Help button */}
<Tooltip>
  <TooltipTrigger
    render={
      <button
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mb-2"
      >
        <HelpCircle className="h-5 w-5" />
      </button>
    }
  />
  <TooltipContent side="right">
    <p>帮助中心</p>
  </TooltipContent>
</Tooltip>
```

- [ ] **Step 3: Verify the panel works**

Run: `npm run dev`
Open browser, click the ? icon in sidebar bottom. Verify:
- Panel slides in from left
- Categories load as tabs
- Articles load when clicking tabs
- Clicking article card shows detail view
- Search filters articles
- Close button and backdrop click close the panel

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/components/nav/sidebar.tsx
git commit -m "feat(help): integrate help panel into layout and sidebar"
```

---

## Phase 3: Editing Backend

### Task 9: Tiptap Editor Component

**Files:**
- Create: `src/components/help/tiptap-editor.tsx`

- [ ] **Step 1: Create the Tiptap editor wrapper**

Create `src/components/help/tiptap-editor.tsx`:

```typescript
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    cn(
      "px-2 py-1 rounded text-sm transition-colors",
      active
        ? "bg-primary/20 text-primary"
        : "text-muted-foreground hover:bg-accent"
    );

  return (
    <div className="flex flex-wrap gap-1 border-b border-border p-2">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive("heading", { level: 1 }))}
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive("bold"))}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive("italic"))}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive("underline"))}
      >
        <u>U</u>
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive("bulletList"))}
      >
        • 列表
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive("orderedList"))}
      >
        1. 列表
      </button>
      <div className="w-px bg-border mx-1" />
      <button
        type="button"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        className={btnClass(false)}
      >
        表格
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive("codeBlock"))}
      >
        代码
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
      >
        ───
      </button>
    </div>
  );
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "开始编写文档内容...",
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Underline,
      Placeholder.configure({ placeholder }),
      Highlight,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror]:outline-none [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-border [&_.ProseMirror_td]:p-2 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-border [&_.ProseMirror_th]:p-2 [&_.ProseMirror_th]:bg-muted"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/help/tiptap-editor.tsx
git commit -m "feat(help): add Tiptap rich text editor component"
```

---

### Task 10: Help Doc Manager (Settings Tab)

**Files:**
- Create: `src/components/settings/help-doc-manager.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create the help doc manager component**

Create `src/components/settings/help-doc-manager.tsx`. This is the editing backend component for the settings page.

The component should be a `"use client"` component that:

1. **State:** `categories`, `selectedCategoryId`, `articles`, `editingArticle` (null | article object), `isCreating` (boolean)
2. **Left panel (w-[200px]):** 
   - List of categories, each clickable to switch right panel
   - Active category highlighted with `bg-primary/10 text-primary` and left border
   - Each category shows name + article count
   - Inline edit: double-click category name to edit, Enter to save (PUT), Escape to cancel
   - Delete button with AlertDialog confirmation
   - Bottom: "+ 新增分类" button, opens inline input for name
3. **Right panel (flex-1):**
   - **List mode** (editingArticle === null):
     - Header: "文章列表" + "+ 新增文章" button
     - Article rows: title, summary (truncated), updatedAt, edit/delete buttons
     - Delete with AlertDialog
     - Click "编辑" sets `editingArticle`
     - Click "+ 新增文章" sets `isCreating = true` with empty article
   - **Edit mode** (editingArticle !== null || isCreating):
     - Header: "← 返回文章列表" button
     - Title input, summary textarea
     - TiptapEditor with content
     - Footer: "取消" + "保存" buttons
     - Save calls POST (creating) or PUT (editing), then refreshes list

4. **Data fetching:**
   - On mount: fetch categories
   - When selectedCategoryId changes: fetch articles for that category
   - After any CRUD operation: re-fetch affected data

5. Use shadcn/ui components: `Button`, `Input`, `Textarea`, `AlertDialog`

- [ ] **Step 2: Add help doc tab to settings page**

Modify `src/app/settings/page.tsx`:

1. Add import:
```typescript
import { HelpDocManager } from "@/components/settings/help-doc-manager";
```

2. Add a new TabsTrigger after "数据指标管理":
```tsx
<TabsTrigger value="help">帮助文档管理</TabsTrigger>
```

3. Add a new TabsContent after the "data" TabsContent:
```tsx
<TabsContent value="help">
  <HelpDocManager />
</TabsContent>
```

- [ ] **Step 3: Verify the editing backend**

Run: `npm run dev`
Navigate to /settings, click "帮助文档管理" tab. Verify:
- Categories show in left panel
- Clicking category loads articles in right panel
- Creating a new article with Tiptap editor works
- Editing existing article loads content into editor
- Saving persists changes (refresh to confirm)
- Deleting articles and categories works with confirmation

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/help-doc-manager.tsx src/app/settings/page.tsx
git commit -m "feat(help): add help doc manager in settings with Tiptap editor"
```

---

## Phase 4: Polish

### Task 11: Build Verification

- [ ] **Step 1: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new lint errors. Fix any that appear.

- [ ] **Step 3: End-to-end walkthrough**

Start dev server (`npm run dev`) and verify the full flow:
1. Sidebar shows ? icon at bottom
2. Clicking ? opens help panel with animation
3. 4 category tabs load correctly
4. Clicking tabs switches articles
5. Search filters across all categories
6. Clicking article card shows full content with proper HTML rendering
7. Back button returns to list
8. Close button and backdrop close the panel
9. Settings → 帮助文档管理 tab shows editing interface
10. Full CRUD works: create/edit/delete categories and articles
11. Tiptap editor renders tables, lists, headings, code blocks
12. Changes in settings reflect in the reading panel

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(help): polish and build verification"
```
