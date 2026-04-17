# AI Employee IP Image & Identity Overhaul

## Background

Leadership feedback on current AI employee avatars: they look too old, too generic ("corporate training PPT style"), and lack personality. The team of 24 AI employees needs to be repositioned as young, trendy, professional IP characters suitable for future AI short films, talk shows, and social media presence.

Current state:
- `soul` and `identity` fields are each a single short sentence — too shallow for IP
- `avatarDescription` is a brief English appearance note (e.g., "Male, late-40s, dark navy suit")
- Generated avatars have plain gradient backgrounds, no scenes, no props, no story
- Management team characters are set to 40s-50s with grey hair and formal suits
- No `age` field in schema; no structured personality data

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual style | **A — Trendy tech "digital native"** | Young (22-30), fashionable, tech-scene backgrounds, high visual impact. Matches leadership's desire for "cool, professional, energetic" look. Supports future IP use (short films, social media). |
| Age strategy | **C — Per-person independent (22-30)** | Each employee gets a unique age tailored to their character, all within the young range. Maximizes IP distinctiveness. |
| Identity expansion | **C — JSON persona field** | Single new `persona` TEXT column storing structured JSON. Flexible, extensible, backward-compatible. Avoids 8+ column additions. |
| Scene strategy | **C — Team color accent + individual scenes** | Each employee has a unique work scene, unified by team accent lighting (purple/blue/green). Balances individuality with team cohesion. |
| Prompt strategy | **B — Template prompt from persona fields** | Fixed STYLE_PREFIX + variable slots filled from persona JSON. Ensures style consistency across 24 characters while allowing personal variation. |

## Part 1 — Schema Change

Add one column to the `employees` table:

```sql
ALTER TABLE employees ADD COLUMN persona TEXT;
```

In Drizzle schema (`src/db/schema.ts`):

```typescript
persona: text("persona"), // JSON string
```

Update `Employee` type in `src/lib/types.ts` to include `persona: string | null`.

Existing `soul`, `identity`, `description`, and `avatarDescription` columns remain unchanged (backward compatible).

## Part 2 — Persona JSON Structure

```typescript
interface EmployeePersona {
  age: number;              // 22-30
  gender: "male" | "female";
  personality: string[];    // 3-5 Chinese keywords, e.g. ["脑洞大开", "话痨", "细节偏执狂"]
  catchphrase: string;      // Signature phrase in Chinese
  backstory: string;        // 100-200 chars, origin story in Chinese
  workStyle: string;        // How they work, in Chinese
  interests: string[];      // 3-5 hobbies/interests in Chinese
  fashionStyle: string;     // Clothing/style description in Chinese
  mbti: string;             // MBTI type code
  visualTraits: string;     // Signature visual item (prop/accessory) in Chinese
  sceneDescription: string; // Personal work scene description in Chinese
}
```

Design principles for persona content:
- All text content in Chinese (except MBTI code)
- Personality should be vivid, memorable, "human" — not corporate/AI-speak
- Backstory should explain why they chose this role, with a concrete anecdote
- catchphrase should be something they'd actually say in a meeting or short film
- fashionStyle matches trendy tech aesthetic: streetwear brands, designer pieces, smart accessories
- visualTraits gives each person ONE signature item for visual recognition (glasses, headphones, badge, pen, etc.)
- sceneDescription is a detailed work environment tailored to their role

### Example — AI Screenwriter (Production / Content Production)

```json
{
  "age": 24,
  "gender": "female",
  "personality": ["脑洞大开", "话痨", "细节偏执狂", "深夜创作型"],
  "catchphrase": "等等，这个故事还差一个反转",
  "backstory": "大学读的是戏剧文学，毕业后没去传统影视公司，选择加入AI内容团队。相信AI是讲好故事的最佳拍档，不是替代品。第一个月就写出了团队播放量最高的短剧脚本，被同事封为'反转女王'。",
  "workStyle": "灵感来了可以连肝12小时，没灵感就泡在B站看纪录片找感觉。白板上永远贴满五颜六色的便利贴故事线。",
  "interests": ["独立电影", "B站纪录片", "手冲咖啡", "写日记"],
  "fashionStyle": "文艺复古混搭街头 — oversized针织衫配工装裤，复古圆框眼镜，vintage帆布包不离身",
  "mbti": "ENFP",
  "visualTraits": "标志性复古圆框眼镜 + 手里总有一支荧光马克笔",
  "sceneDescription": "深夜创意工作室，身后白板上贴满彩色便利贴故事线，桌上摊着手冲咖啡和翻开的剧本，暖色台灯配合绿色氛围灯带"
}
```

All 24 employees will get fully designed persona data in the seed file. The `soul` field will be retained as-is (or lightly reworded). The `identity` field will be updated to a concise one-line summary derived from the persona. The `avatarDescription` field will be regenerated from the persona via the prompt template.

## Part 3 — Avatar Generation Prompt Template

### New STYLE_PREFIX

```
Create a stylish 2D digital illustration portrait of a young Chinese professional in LANDSCAPE orientation (16:9, 1376x768). Trendy modern illustration style with bold confident lines, vibrant colors, and dynamic lighting. The character should look young (early-to-late 20s), energetic, fashionable, and highly competent — like a top talent at a cutting-edge tech startup. Frame from chest up, centered with breathing room. Include a detailed background scene specific to their work environment. The overall mood should be cool, professional, and aspirational.
```

### Prompt Assembly Template

```
{STYLE_PREFIX}
{gender}, age {age}. {fashionStyle}.
Expression: confident and {personality[0]} vibe, {personality[1]} energy.
Signature item: {visualTraits}.
Background scene: {sceneDescription}.
Ambient lighting with {teamAccentColor} accent tones.
```

Team accent color mapping:
- `management` → `"purple and violet"`
- `design` → `"blue and cyan"`
- `production` → `"green and emerald"`

The `avatarDescription` field in the database will be updated with the assembled prompt for each employee. This serves as both the generation prompt and a record of what was used.

### Image specs (unchanged)
- Resolution: 1376 x 768 (16:9 landscape)
- Format: PNG
- Path: `/avatars/{name}.png`
- API: Gemini 3.1 Flash Image Preview via OpenAI-compatible endpoint

## Part 4 — Code Changes

### Data layer
- `src/db/schema.ts` — Add `persona` text column to employees table
- `src/lib/types.ts` — Add `persona: string | null` to Employee interface
- `src/db/seed.ts` — Complete persona JSON for all 24 employees; update avatarDescription with template-generated prompts; lightly revise identity fields
- Run `npm run db:push` to apply schema change

### Generation layer
- `scripts/generate-avatars.ts` — Replace STYLE_PREFIX with new trendy tech version; replace hardcoded EMPLOYEES array with persona-driven prompt assembly; add team color mapping logic
- `src/lib/avatar-generator.ts` — Sync STYLE_PREFIX and prompt assembly logic; update `generateAvatarDescription()` fallback to use persona if available
- Delete all existing avatar PNGs in `public/avatars/` before regeneration

### Display layer
- `src/components/roster/tabs/profile-tab.tsx` — Add persona fields display/edit (age, personality, catchphrase, backstory, etc.)
- Employee detail modal — Show enriched persona info (catchphrase, interests, MBTI, work style)
- Employee cards — Optionally show signature visual trait as a badge/tag

### API layer
- Employee API routes — Include persona in response data
- Employee edit API — Accept persona updates
- Seed script — Write complete persona data on seed

## Part 5 — What Does NOT Change

- Image dimensions: 1376 x 768 (16:9 landscape)
- AiAvatar component display logic (fill mode, fixed-size mode, SVG robot fallback)
- Avatar file path convention: `/avatars/{name}.png`
- Team color system in UI (purple/blue/green for management/design/production)
- Gemini API call mechanism (only prompt content changes)
- Database tables other than `employees`
- Overall application routing and page structure
