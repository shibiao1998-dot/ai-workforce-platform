/**
 * NetDragon 后处理脚本
 *
 * 读 catalog,对 public/netdragon/<family>/<id>-<label>.png 做:
 *   - 生成 <id>-<label>.webp     (quality 85,@1x)
 *   - 生成 <id>-<label>@2x.webp  (sharp resize 2x,但 gpt-image-2 原生已高清,这里实际是"identity"作为兜底)
 *
 * 用法:
 *   npm run nd:postprocess                     处理所有已存在的 PNG
 *   npm run nd:postprocess -- --id=smoke-test  只处理单张
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import sharp from "sharp";

interface Size { label: string; width: number; height: number; }
interface CatalogEntry { family: string; sizes: Size[]; }
interface Catalog { version: string; assets: Record<string, CatalogEntry>; }

interface Args { id?: string; }
function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (const a of argv) {
    if (a.startsWith("--id=")) args.id = a.slice(5);
  }
  return args;
}

async function processOne(
  id: string,
  entry: CatalogEntry,
  size: Size,
  publicDir: string,
): Promise<{ ok: boolean; error?: string }> {
  const familyDir = join(publicDir, entry.family);
  const srcPng = join(familyDir, `${id}-${size.label}.png`);
  if (!existsSync(srcPng)) {
    return { ok: false, error: `source PNG missing: ${srcPng}` };
  }

  const dst1x = join(familyDir, `${id}-${size.label}.webp`);
  const dst2x = join(familyDir, `${id}-${size.label}@2x.webp`);

  try {
    // @1x:源 PNG 降采样到 catalog 宽度的 50%,保证 @1x 比 @2x 小 3-4 倍
    await sharp(srcPng)
      .resize({ width: Math.max(1, Math.round(size.width / 2)) })
      .webp({ quality: 85 })
      .toFile(dst1x);

    // @2x:源 PNG 原生宽度(gpt-image-2 已按 catalog 指定尺寸生成)
    await sharp(srcPng)
      .resize({ width: size.width, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(dst2x);

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const catalogPath = resolve(process.cwd(), "scripts/nd-catalog.json");
  const catalog: Catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
  const publicDir = resolve(process.cwd(), "public/netdragon");

  const entries = args.id
    ? Object.entries(catalog.assets).filter(([k]) => k === args.id)
    : Object.entries(catalog.assets);

  if (entries.length === 0) {
    console.error("No matching entries.");
    process.exit(1);
  }

  let ok = 0, fail = 0;
  const failures: string[] = [];

  for (const [id, entry] of entries) {
    for (const size of entry.sizes) {
      const familyDir = join(publicDir, entry.family);
      const srcPng = join(familyDir, `${id}-${size.label}.png`);
      if (!existsSync(srcPng)) {
        console.log(`SKIP ${id}-${size.label} (no source PNG yet)`);
        continue;
      }
      process.stdout.write(`PROC ${id}-${size.label} ... `);
      const r = await processOne(id, entry, size, publicDir);
      if (r.ok) {
        const w1 = statSync(join(familyDir, `${id}-${size.label}.webp`)).size;
        const w2 = statSync(join(familyDir, `${id}-${size.label}@2x.webp`)).size;
        console.log(`OK  @1x=${Math.round(w1/1024)}KB @2x=${Math.round(w2/1024)}KB`);
        ok++;
      } else {
        console.log(`FAIL ${r.error}`);
        failures.push(`${id}-${size.label}: ${r.error}`);
        fail++;
      }
    }
  }

  console.log("\n" + "─".repeat(50));
  console.log(`Summary: ${ok} processed, ${fail} failed`);
  if (fail > 0) {
    for (const f of failures) console.log(`  • ${f}`);
    process.exit(1);
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
