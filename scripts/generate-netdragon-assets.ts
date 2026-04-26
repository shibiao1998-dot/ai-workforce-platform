/**
 * NetDragon 素材生成主脚本
 *
 * 用法:
 *   npm run nd:generate -- --id=smoke-test              单张
 *   npm run nd:generate -- --batch=1                    按 tier=top 的一批
 *   npm run nd:generate -- --family=scene               按家族
 *   npm run nd:generate -- --dry-run                    只打印 prompt,不实际调 API
 *
 * 输出:
 *   public/netdragon/<family>/<id>.png (原始 PNG 母版)
 *   后续由 nd-post-process 派生 WebP 和多尺寸
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import https from "node:https";

// ───── .env.local 加载(沿用 generate-avatars.ts 做法)─────
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    console.warn("Warning: .env.local not found, relying on existing env vars");
    return;
  }
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
}
loadEnvLocal();

// ───── 类型 ─────
interface Size { label: string; width: number; height: number; }
interface Fallback {
  type: "gradient" | "svg" | "solid";
  from?: string; to?: string; color?: string; path?: string;
}
interface CatalogEntry {
  family: string;
  subject: string;
  promptVars: Record<string, string>;
  sizes: Size[];
  tier: "top" | "normal";
  fallback: Fallback;
}
interface Catalog {
  version: string;
  assets: Record<string, CatalogEntry>;
}

// ───── CLI 参数解析 ─────
interface CliArgs {
  id?: string;
  family?: string;
  batch?: string;
  dryRun: boolean;
}
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { dryRun: false };
  for (const a of argv) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--id=")) args.id = a.slice(5);
    else if (a.startsWith("--family=")) args.family = a.slice(9);
    else if (a.startsWith("--batch=")) {
      const v = a.slice(8);
      if (v !== "1") throw new Error(`--batch only accepts "1" (tier=top filter), got: "${v}"`);
      args.batch = v;
    }
  }
  return args;
}

// ───── Prompt 拼装:global + family + vars + tier modifier ─────
function loadPromptFragment(file: string): string {
  const p = resolve(process.cwd(), "scripts/nd-prompts", file);
  if (!existsSync(p)) throw new Error(`Prompt fragment not found: ${p}`);
  return readFileSync(p, "utf-8").trim();
}

function buildPrompt(entry: CatalogEntry): string {
  const global = loadPromptFragment("global-anchor.txt");
  const family = loadPromptFragment(`family-${entry.family}.txt`);

  // 变量替换:<KEY> → value
  let familyFilled = family;
  for (const [k, v] of Object.entries(entry.promptVars)) {
    familyFilled = familyFilled.replaceAll(`<${k}>`, v);
  }

  const tierModifier = entry.tier === "top"
    ? "ultra-high quality, every detail intentional, production-ready final asset"
    : "";

  return [global, familyFilled, tierModifier].filter(Boolean).join("\n\n");
}

// ───── 批次筛选 ─────
function selectEntries(catalog: Catalog, args: CliArgs): Array<[string, CatalogEntry]> {
  const all = Object.entries(catalog.assets);
  if (args.id) {
    const hit = all.find(([k]) => k === args.id);
    if (!hit) throw new Error(`id not found in catalog: ${args.id}`);
    return [hit];
  }
  if (args.family) {
    return all.filter(([, v]) => v.family === args.family);
  }
  if (args.batch === "1") {
    return all.filter(([, v]) => v.tier === "top");
  }
  // 默认:全部
  return all;
}

// ───── 调用 gpt-image-2(沿用 generate-avatars.ts 的 node:https 写法)─────
interface GenResult { ok: boolean; sizeKB?: number; error?: string; }

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateOne(
  id: string,
  entry: CatalogEntry,
  prompt: string,
  size: Size,
  outDir: string,
  dryRun: boolean,
): Promise<GenResult> {
  if (dryRun) {
    console.log(`\n[DRY] id=${id} size=${size.width}x${size.height}`);
    console.log(`[DRY] prompt:\n${prompt}\n`);
    return { ok: true, sizeKB: 0 };
  }

  const gatewayUrl = process.env.IMAGE_API_GATEWAY_URL;
  const apiKey = process.env.IMAGE_API_KEY;
  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing IMAGE_API_GATEWAY_URL or IMAGE_API_KEY" };
  }

  const maxRetries = entry.tier === "top" ? 8 : 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await new Promise<GenResult>((resolvePromise) => {
      const url = new URL(`${gatewayUrl}/v1/images/generations`);
      const body = JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: `${size.width}x${size.height}`,
        quality: entry.tier === "top" ? "high" : "medium",
      });
      const req = https.request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
          Connection: "close",
        },
        timeout: 600_000,
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString());
            if (json.error) return resolvePromise({ ok: false, error: json.error.message });
            const b64 = json.data?.[0]?.b64_json;
            if (!b64) return resolvePromise({ ok: false, error: "No image data in response" });
            const imgBuffer = Buffer.from(b64, "base64");
            const familyDir = join(outDir, entry.family);
            mkdirSync(familyDir, { recursive: true });
            const outPath = join(familyDir, `${id}-${size.label}.png`);
            writeFileSync(outPath, imgBuffer);
            resolvePromise({ ok: true, sizeKB: Math.round(imgBuffer.length / 1024) });
          } catch (e) {
            resolvePromise({ ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        });
      });
      req.on("error", (e) => resolvePromise({ ok: false, error: e.message }));
      req.on("timeout", () => { req.destroy(); resolvePromise({ ok: false, error: "Request timed out after 600s" }); });
      req.write(body);
      req.end();
    });

    if (result.ok) return result;
    if (attempt < maxRetries) {
      console.log(`  Retry ${attempt}/${maxRetries} for ${id}-${size.label}...`);
      await sleep(10_000);
    } else {
      return result;
    }
  }
  return { ok: false, error: "Unreachable" };
}

// ───── main ─────
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const catalogPath = resolve(process.cwd(), "scripts/nd-catalog.json");
  let catalog: Catalog;
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
  } catch (e) {
    console.error(`Failed to load catalog at ${catalogPath}:`, e instanceof Error ? e.message : e);
    process.exit(1);
  }

  const entries = selectEntries(catalog, args);
  if (entries.length === 0) {
    console.error("No entries matched the selection.");
    process.exit(1);
  }

  const outDir = resolve(process.cwd(), "public/netdragon");
  mkdirSync(outDir, { recursive: true });

  console.log(`\nNetDragon asset generation — ${entries.length} entries, dryRun=${args.dryRun}\n`);

  let succeeded = 0, failed = 0;
  const failures: string[] = [];

  // Build flat list of (id, entry, size) tuples so we can skip the final sleep
  const jobs: Array<{ id: string; entry: CatalogEntry; size: Size }> = [];
  for (const [id, entry] of entries) {
    for (const size of entry.sizes) jobs.push({ id, entry, size });
  }

  for (let i = 0; i < jobs.length; i++) {
    const { id, entry, size } = jobs[i];
    const prompt = buildPrompt(entry);
    console.log(`GEN  ${id} [${size.label} ${size.width}x${size.height}] tier=${entry.tier}`);
    const r = await generateOne(id, entry, prompt, size, outDir, args.dryRun);
    if (r.ok) {
      console.log(`OK   ${id}-${size.label} (${r.sizeKB} KB)`);
      succeeded++;
    } else {
      console.error(`FAIL ${id}-${size.label}: ${r.error}`);
      failed++;
      failures.push(`${id}-${size.label}: ${r.error}`);
    }
    if (!args.dryRun && i < jobs.length - 1) await sleep(3_000);
  }

  console.log("\n" + "─".repeat(50));
  console.log(`Summary: ${succeeded} succeeded, ${failed} failed`);
  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
