/**
 * NetDragon 性能预算检查
 *
 * 规则(来自 spec §7.4):
 *   - 单张 @1x WebP ≤ 80 KB
 *     - badge 家族特例:@1x ≤ 90 KB(1024² 高细节金属勋章,@1x 512² 仍携带不少纹理)
 *   - 单张 @2x WebP ≤ 180 KB
 *     - hero 家族特例:@2x ≤ 400 KB(分辨率本就大)
 *     - badge 家族特例:@2x ≤ 260 KB(1024² 金属质感勋章保清晰度优先,6 张总增量 < 300KB 对总预算无压力)
 *   - 整站素材总量 ≤ 18 MB
 *
 * 扫描目录:public/netdragon/**\/*.webp
 * 超标 → 打印列表 + exit 1(供 CI 使用)
 *
 * 白名单:smoke-test 属于基建验证资产,不受生产预算约束
 */

import { readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const LIMIT_1X_KB = 80;
const LIMIT_BADGE_1X_KB = 90;
const LIMIT_2X_KB = 180;
const LIMIT_HERO_2X_KB = 400;
const LIMIT_BADGE_2X_KB = 260;
const LIMIT_TOTAL_MB = 18;

// 白名单:这些资产是临时/验证用,不进入预算统计
// NOTE: startsWith 匹配是前缀检查,未来如果真实资产 id 以 "smoke-test-" 开头会被误豁免。
// Phase-0 可接受;若有此类 id 应在此处用完整 id 替换或改用精确匹配。
const EXEMPT_IDS = new Set<string>([
  "smoke-test",
]);

interface FileInfo { path: string; sizeKB: number; }

function walk(dir: string, out: FileInfo[] = []): FileInfo[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // public/netdragon 还没有就跳过
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith(".webp")) out.push({ path: full, sizeKB: Math.round(st.size / 1024) });
  }
  return out;
}

function isExempt(filePath: string): boolean {
  // 文件名形如:<id>-<label>.webp 或 <id>-<label>@2x.webp
  // 提取 id:从文件名开头到第一个"-"号之前的部分?不对,id 本身可能含"-"。
  // 更稳妥:检查文件名是否以任何豁免 id 开头,后跟"-"
  const fileName = filePath.split("/").pop() ?? "";
  for (const exemptId of EXEMPT_IDS) {
    if (fileName.startsWith(`${exemptId}-`)) return true;
  }
  return false;
}

function main(): void {
  const root = resolve(process.cwd(), "public/netdragon");
  const allFiles = walk(root);

  if (allFiles.length === 0) {
    console.log("No .webp assets found under public/netdragon — skipping budget check.");
    return;
  }

  // 分离豁免资产和受预算约束的资产
  const files = allFiles.filter((f) => !isExempt(f.path));
  const exempt = allFiles.filter((f) => isExempt(f.path));

  const violations: string[] = [];
  let totalKB = 0;

  for (const f of files) {
    totalKB += f.sizeKB;
    const rel = f.path.replace(process.cwd() + "/", "");
    const isHero = rel.includes("/hero/");
    const isBadge = rel.includes("/badge/");
    const is2x = f.path.endsWith("@2x.webp");

    if (is2x) {
      const limit = isHero ? LIMIT_HERO_2X_KB : isBadge ? LIMIT_BADGE_2X_KB : LIMIT_2X_KB;
      if (f.sizeKB > limit) {
        violations.push(`[@2x] ${rel} = ${f.sizeKB}KB (limit ${limit}KB)`);
      }
    } else {
      const limit = isBadge ? LIMIT_BADGE_1X_KB : LIMIT_1X_KB;
      if (f.sizeKB > limit) {
        violations.push(`[@1x] ${rel} = ${f.sizeKB}KB (limit ${limit}KB)`);
      }
    }
  }

  const totalMB = totalKB / 1024;
  if (totalMB > LIMIT_TOTAL_MB) {
    violations.push(`[total] ${totalMB.toFixed(2)}MB (limit ${LIMIT_TOTAL_MB}MB)`);
  }

  console.log(
    `Scanned ${allFiles.length} WebP files (${files.length} in-budget + ${exempt.length} exempt), ` +
    `in-budget total ${totalMB.toFixed(2)}MB`
  );

  if (exempt.length > 0) {
    console.log(`Exempt (not counted): ${exempt.map((f) => f.path.split("/").pop()).join(", ")}`);
  }

  if (violations.length > 0) {
    console.error("\nBudget violations:");
    for (const v of violations) console.error(`  ✗ ${v}`);
    process.exit(1);
  }

  console.log("✓ All assets within budget");
}

main();
