/**
 * NdAssetCatalog — 素材清单的运行时映射
 *
 * 设计意图:
 *   业务组件用 <NdAsset id="hero-dashboard" /> 引用素材,不写死路径。
 *   这里把 scripts/nd-catalog.json 转成浏览器可用的映射。
 *
 *   Next.js App Router 服务端组件默认能 import JSON,
 *   但为了显式且可预测,这里用 TypeScript 声明包一层。
 */

import catalogJson from "../../../../scripts/nd-catalog.json";

export type NdAssetFamily =
  | "hero" | "scene" | "banner" | "badge"
  | "empty-state" | "ornament" | "widget-bg"
  | "milestone" | "texture";

export type NdAssetTier = "top" | "normal";

export interface NdAssetSize {
  label: string;
  width: number;
  height: number;
}

export type NdAssetFallback =
  | { type: "gradient"; from: string; to: string }
  | { type: "svg"; path: string }
  | { type: "solid"; color: string };

export interface NdAssetEntry {
  family: NdAssetFamily;
  subject: string;
  promptVars: Record<string, string>;
  sizes: NdAssetSize[];
  tier: NdAssetTier;
  fallback: NdAssetFallback;
}

interface CatalogShape {
  version: string;
  assets: Record<string, NdAssetEntry>;
}

const catalog = catalogJson as unknown as CatalogShape;

export const ND_CATALOG_VERSION = catalog.version;

export function getNdAsset(id: string): NdAssetEntry | undefined {
  return catalog.assets[id];
}

export function listNdAssets(filter?: {
  family?: NdAssetFamily;
  tier?: NdAssetTier;
}): Array<[string, NdAssetEntry]> {
  const all = Object.entries(catalog.assets);
  if (!filter) return all;
  return all.filter(([, e]) =>
    (!filter.family || e.family === filter.family) &&
    (!filter.tier || e.tier === filter.tier)
  );
}

/**
 * 给定 id 和 label,返回该素材在 public/ 下的路径(WebP 优先)
 * 不保证文件一定存在 —— 调用方需要处理加载失败。
 */
export function getNdAssetPath(id: string, label: string, density: "1x" | "2x" = "1x"): string | null {
  const entry = catalog.assets[id];
  if (!entry) return null;
  if (!entry.sizes.find((s) => s.label === label)) return null;
  const suffix = density === "2x" ? "@2x" : "";
  return `/netdragon/${entry.family}/${id}-${label}${suffix}.webp`;
}
