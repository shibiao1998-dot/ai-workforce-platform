# gpt-image-2 Avatar Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace Gemini image generation with gpt-image-2 for all 24 AI employee portraits, upgrading from 2D illustration to photorealistic commercial photography style at 2K resolution.

**Architecture:** Direct API call via fetch to `/v1/images/generations` endpoint. Two files share the same STYLE_PREFIX and API call pattern — batch script for full regeneration, runtime library for single-avatar regeneration. Environment variables renamed from GEMINI_* to IMAGE_API_*.

**Tech Stack:** Node.js fetch API, gpt-image-2 via OpenAI-compatible gateway, TypeScript/tsx

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `.env.local` | Modify | Rename env vars GEMINI_* → IMAGE_API_* |
| `scripts/generate-avatars.ts` | Modify | Batch avatar generation script |
| `src/lib/avatar-generator.ts` | Modify | Runtime single-avatar generation library |
| `CLAUDE.md` | Modify | Documentation update |

---

### Task 1: Update environment variables

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Replace env var names in .env.local**

Open `.env.local` and replace the two Gemini variables:

```
# Delete these two lines:
GEMINI_GATEWAY_URL=https://ai-gateway.aiae.ndhy.com
GEMINI_API_KEY=sk-nd-x0hURzXLt6ecXY5EAe524aFd016a48B58aCa75A5Af1e3

# Add these two lines:
IMAGE_API_GATEWAY_URL=https://ai-gateway.aiae.ndhy.com
IMAGE_API_KEY=sk-nd-x0hURzXLt6ecXY5EAe524aFd016a48B58aCa75A5Af1e3
```

Values are identical — only the names change.

- [ ] **Step 2: Verify no other code reads the old var names**

Run:
```bash
grep -rn "GEMINI_GATEWAY_URL\|GEMINI_API_KEY" src/ scripts/ --include="*.ts" --include="*.tsx"
```

Expected: hits only in `scripts/generate-avatars.ts` and `src/lib/avatar-generator.ts` (will be updated in Tasks 2-3).

---

### Task 2: Update batch generation script

**Files:**
- Modify: `scripts/generate-avatars.ts`

- [ ] **Step 1: Replace STYLE_PREFIX constant**

Find the `STYLE_PREFIX` constant (around line 156-162) and replace its entire value:

```typescript
const STYLE_PREFIX =
  "Professional commercial portrait photograph of a young Chinese professional. " +
  "Shot on Canon EOS R5 with 85mm f/1.4 lens. Shallow depth of field, natural lighting with soft fill light. " +
  "Photorealistic, high-end corporate magazine editorial style. " +
  "Frame from chest up, centered with breathing room. Real fabric textures, real accessories, real hair. " +
  "LANDSCAPE orientation (16:9, 2560x1440). No illustration, no anime, no CGI, no AI-generated artifacts. " +
  "The person must look like a real Chinese individual with natural skin texture, natural facial features, and natural expression.";
```

- [ ] **Step 2: Update generateAvatar function — env vars and API call**

In the `generateAvatar` function (around line 187-244), make these changes:

1. Replace env var reads:
```typescript
// Old:
const gatewayUrl = process.env.GEMINI_GATEWAY_URL;
const apiKey = process.env.GEMINI_API_KEY;
if (!gatewayUrl || !apiKey) {
  return { ok: false, error: "Missing GEMINI_GATEWAY_URL or GEMINI_API_KEY" };
}

// New:
const gatewayUrl = process.env.IMAGE_API_GATEWAY_URL;
const apiKey = process.env.IMAGE_API_KEY;
if (!gatewayUrl || !apiKey) {
  return { ok: false, error: "Missing IMAGE_API_GATEWAY_URL or IMAGE_API_KEY" };
}
```

2. Replace API endpoint and request body:
```typescript
// Old:
const endpoint = `${gatewayUrl}/v1/chat/completions`;
// ...
body: JSON.stringify({
  model: "gemini-3.1-flash-image-preview",
  messages: [{ role: "user", content: prompt }],
  modalities: ["text", "image"],
}),

// New:
const endpoint = `${gatewayUrl}/v1/images/generations`;
// ...
body: JSON.stringify({
  model: "gpt-image-2",
  prompt,
  n: 1,
  size: "2560x1440",
  quality: "high",
}),
```

3. Update timeout from 90s to 300s:
```typescript
// Old:
const timeoutId = setTimeout(() => controller.abort(), 90_000);

// New:
const timeoutId = setTimeout(() => controller.abort(), 300_000);
```

4. Update timeout error message:
```typescript
// Old:
return { ok: false, error: "Request timed out after 90s" };

// New:
return { ok: false, error: "Request timed out after 300s" };
```

- [ ] **Step 3: Update loadEnvLocal function — env var names**

In the `loadEnvLocal` function (around line 7-25), the function reads `.env.local` and sets process.env. No structural change needed — it reads all key=value pairs generically. Verify it doesn't have hardcoded GEMINI references. If it does, remove them.

- [ ] **Step 4: Remove file-exists skip logic in main()**

In the `main` function (around line 249-304), remove the skip logic so all avatars are regenerated:

```typescript
// Delete this block from the for loop:
if (existsSync(outPath)) {
  console.log(`[${i + 1}/${total}] SKIP  ${emp.name} (already exists)`);
  skipped++;
  continue;
}
```

Also remove the `skipped` counter variable and its usage in the summary line. Update the summary:
```typescript
// Old:
console.log(`Summary: ${succeeded} succeeded, ${skipped} skipped, ${failed} failed`);

// New:
console.log(`Summary: ${succeeded} succeeded, ${failed} failed`);
```

- [ ] **Step 5: Update request interval**

In main(), change the sleep between requests:
```typescript
// Old:
await sleep(3_000);

// New:
await sleep(5_000);
```

- [ ] **Step 6: Verify script compiles**

Run:
```bash
npx tsx --no-warnings scripts/generate-avatars.ts --help 2>&1 || echo "Compile check: script loaded"
```

The script will attempt to run (no --help flag exists), but if it gets past import/compile to the "Missing env" error or starts running, compilation is OK.

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-avatars.ts
git commit -m "feat: migrate batch avatar script to gpt-image-2 with 2K photorealistic style"
```

---

### Task 3: Update runtime avatar generator library

**Files:**
- Modify: `src/lib/avatar-generator.ts`

- [ ] **Step 1: Replace STYLE_PREFIX constant**

Find the `STYLE_PREFIX` constant (around line 33-38) and replace with the same value as Task 2:

```typescript
const STYLE_PREFIX =
  "Professional commercial portrait photograph of a young Chinese professional. " +
  "Shot on Canon EOS R5 with 85mm f/1.4 lens. Shallow depth of field, natural lighting with soft fill light. " +
  "Photorealistic, high-end corporate magazine editorial style. " +
  "Frame from chest up, centered with breathing room. Real fabric textures, real accessories, real hair. " +
  "LANDSCAPE orientation (16:9, 2560x1440). No illustration, no anime, no CGI, no AI-generated artifacts. " +
  "The person must look like a real Chinese individual with natural skin texture, natural facial features, and natural expression.";
```

- [ ] **Step 2: Update generateAvatarDescription function**

Replace the function body (around line 49-52):

```typescript
export function generateAvatarDescription(title: string, team: string): string {
  const accent = TEAM_ACCENT[team] || "neutral";
  return `Young Chinese professional in a ${title} role, age mid-20s, smart business casual attire, confident and approachable expression, modern office environment with ${accent} ambient lighting`;
}
```

- [ ] **Step 3: Update generateSingleAvatar function — env vars and API call**

In the `generateSingleAvatar` function (around line 57-127), make these changes:

1. Replace env var reads:
```typescript
// Old:
const gatewayUrl = process.env.GEMINI_GATEWAY_URL;
const apiKey = process.env.GEMINI_API_KEY;
if (!gatewayUrl || !apiKey) {
  return { ok: false, error: "Missing GEMINI_GATEWAY_URL or GEMINI_API_KEY" };
}

// New:
const gatewayUrl = process.env.IMAGE_API_GATEWAY_URL;
const apiKey = process.env.IMAGE_API_KEY;
if (!gatewayUrl || !apiKey) {
  return { ok: false, error: "Missing IMAGE_API_GATEWAY_URL or IMAGE_API_KEY" };
}
```

2. Replace API endpoint and request body:
```typescript
// Old:
const endpoint = `${gatewayUrl}/v1/chat/completions`;
// ...
body: JSON.stringify({
  model: "gemini-3.1-flash-image-preview",
  messages: [{ role: "user", content: prompt }],
  modalities: ["text", "image"],
}),

// New:
const endpoint = `${gatewayUrl}/v1/images/generations`;
// ...
body: JSON.stringify({
  model: "gpt-image-2",
  prompt: `${STYLE_PREFIX} ${description}.`,
  n: 1,
  size: "2560x1440",
  quality: "high",
}),
```

Note: the prompt variable in this function was previously `${STYLE_PREFIX} ${description}.` — keep that same pattern but now pass it as the `prompt` field directly instead of inside a messages array.

3. Update timeout from 90s to 300s:
```typescript
const timeoutId = setTimeout(() => controller.abort(), 300_000);
```

4. Update timeout error message:
```typescript
return { ok: false, error: "Request timed out after 300s" };
```

- [ ] **Step 4: Update loadEnvLocal function — same as Task 2 Step 3**

Verify the `loadEnvLocal` function doesn't have hardcoded GEMINI references. It should read `.env.local` generically.

- [ ] **Step 5: Verify build passes**

Run:
```bash
cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run build
```

Expected: Build succeeds with no errors related to avatar-generator.

- [ ] **Step 6: Commit**

```bash
git add src/lib/avatar-generator.ts
git commit -m "feat: migrate runtime avatar generator to gpt-image-2 with 2K photorealistic style"
```

---

### Task 4: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update generate:avatars script description (line 22)**

```markdown
# Old:
npm run generate:avatars # Generate AI employee portraits via Gemini API

# New:
npm run generate:avatars # Generate AI employee portraits via gpt-image-2 API
```

- [ ] **Step 2: Update the detailed script description (line 27)**

Replace the entire paragraph:

```markdown
# Old:
The `generate:avatars` script requires `GEMINI_GATEWAY_URL` and `GEMINI_API_KEY` in `.env.local`. It calls Gemini 3.1 Flash Image Preview via an OpenAI-compatible gateway (`https://ai-gateway.aiae.ndhy.com/v1/chat/completions`) to produce landscape (1376x768) 2D portrait PNGs in `public/avatars/`. Prompts are assembled from persona data using `buildPrompt()` with team accent colors (purple/blue/green). The script is resumable — it skips employees whose avatar file already exists. The runtime library `src/lib/avatar-generator.ts` shares the same STYLE_PREFIX for single-avatar regeneration.

# New:
The `generate:avatars` script requires `IMAGE_API_GATEWAY_URL` and `IMAGE_API_KEY` in `.env.local`. It calls gpt-image-2 via an OpenAI-compatible gateway (`https://ai-gateway.aiae.ndhy.com/v1/images/generations`) to produce landscape (2560x1440) photorealistic portrait PNGs in `public/avatars/`. Prompts are assembled from persona data using `buildPrompt()` with team accent colors (purple/blue/green). The script regenerates all avatars on each run (no skip logic). The runtime library `src/lib/avatar-generator.ts` shares the same STYLE_PREFIX for single-avatar regeneration.
```

- [ ] **Step 3: Update avatar description in Key Conventions (line 89)**

```markdown
# Old:
- Employee avatars are AI-generated landscape portrait images (1376x768) stored in `public/avatars/{name}.png`. The `AiAvatar` component...

# New:
- Employee avatars are AI-generated landscape portrait images (2560x1440) stored in `public/avatars/{name}.png`. The `AiAvatar` component...
```

Only change the resolution number, keep the rest of the line identical.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for gpt-image-2 avatar generation"
```

---

### Task 5: Update .env.local and run batch generation

**Files:**
- Modify: `.env.local`
- Output: `public/avatars/*.png` (24 files overwritten)

- [ ] **Step 1: Update .env.local**

Replace the env var names (values unchanged):
```
GEMINI_GATEWAY_URL → IMAGE_API_GATEWAY_URL
GEMINI_API_KEY → IMAGE_API_KEY
```

- [ ] **Step 2: Run the batch generation script**

```bash
cd /Users/bill_huang/workspace/claudecode/myproject/AIproject && npm run generate:avatars
```

This will generate all 24 portraits. Expected runtime: ~60-80 minutes (24 × 2-3 min per image + 5s intervals).

Monitor the output for progress. Each line should show:
```
[N/24] GEN   AI员工名 …
[N/24] OK    AI员工名 (SIZE KB)
```

If any fail, note the employee name and error. Common issues:
- Timeout: gpt-image-2 can be slow, the 300s timeout should handle most cases
- 429 rate limit: the 5s interval should prevent this
- Content policy: some prompts may be flagged — note which ones

- [ ] **Step 3: Verify generated images**

```bash
ls -la public/avatars/ | head -30
```

Confirm all 24 .png files exist and have reasonable file sizes (2K high-quality PNGs should be ~2-5MB each).

- [ ] **Step 4: Spot-check image quality**

Open 2-3 images in a viewer to confirm:
- Photorealistic style (not illustration/anime)
- Chinese person face
- Correct orientation (landscape 2560x1440)
- Real-looking background and clothing

- [ ] **Step 5: Start dev server and verify UI**

```bash
npm run dev
```

Open the roster page in browser. Verify:
- Avatar images load correctly in employee cards
- Images display properly with object-cover (no distortion)
- Click into employee detail modal — avatar shows correctly there too

- [ ] **Step 6: Commit generated avatars**

```bash
git add public/avatars/
git commit -m "feat: regenerate all 24 employee avatars with gpt-image-2 photorealistic style"
```
