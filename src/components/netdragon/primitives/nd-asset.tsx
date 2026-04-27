/**
 * NdAsset — 所有网龙 AI 素材的统一渲染入口
 *
 * 职责:
 *   1. 通过 id 从 catalog 查到 WebP 路径
 *   2. 渲染 <img> 并启用 lazy loading
 *   3. 首选 @1x,支持 @2x 的 srcSet
 *   4. 加载失败时自动切到 fallback(gradient / svg / solid)
 *   5. 用户开了省流模式(saveData)时跳过图片,直接显示 fallback
 *
 * 用法:
 *   <NdAsset id="hero-dashboard" label="desktop" alt="驾驶舱欢迎" />
 *   <NdAsset id="badge-weekly-top" label="default" alt="本周明星" className="w-16 h-16" />
 */

"use client";

import { useEffect, useState } from "react";
import { getNdAsset, getNdAssetPath, type NdAssetFallback } from "./nd-asset-catalog";

interface NdAssetProps {
  id: string;
  label: string;
  alt: string;
  className?: string;
  /** 覆盖 catalog 中的 fallback 样式。注意:id 在 catalog 中不存在时,此参数无效。 */
  fallbackOverride?: NdAssetFallback;
  /** 优先级高的图片(如首屏 hero)可传 eager */
  loading?: "lazy" | "eager";
}

function renderFallback(fb: NdAssetFallback, alt: string, className?: string) {
  if (fb.type === "gradient") {
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{ background: `linear-gradient(135deg, ${fb.from}, ${fb.to})` }}
      />
    );
  }
  if (fb.type === "solid") {
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{ background: fb.color }}
      />
    );
  }
  // svg — catalog 是本地可信文件,但加一层防御避免路径穿越
  if (fb.path.includes("..") || fb.path.startsWith("/")) {
    if (typeof console !== "undefined") {
      console.warn(`[NdAsset] suspicious fallback path rejected: ${fb.path}`);
    }
    return (
      <div
        role="img"
        aria-label={alt}
        className={className}
        style={{ background: "#fef2f2" }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/netdragon/_fallback/${fb.path}`}
      alt={alt}
      className={className}
    />
  );
}

export function NdAsset({
  id,
  label,
  alt,
  className,
  fallbackOverride,
  loading = "lazy",
}: NdAssetProps) {
  const entry = getNdAsset(id);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    // 仅客户端:若用户开了省流,直接 fallback
    const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (conn?.saveData === true) setUseFallback(true);
    if (conn?.effectiveType && ["2g", "slow-2g"].includes(conn.effectiveType)) {
      setUseFallback(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!entry) {
    // catalog 里没有:返回一个 warning 样式的占位,不是硬错误
    return (
      <div
        role="img"
        aria-label={`缺失素材:${id}`}
        className={className}
        style={{ background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}
      >
        missing:{id}
      </div>
    );
  }

  const fb = fallbackOverride ?? entry.fallback;

  if (useFallback) {
    return renderFallback(fb, alt, className);
  }

  const src1x = getNdAssetPath(id, label, "1x");
  const src2x = getNdAssetPath(id, label, "2x");
  if (!src1x) return renderFallback(fb, alt, className);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src1x}
      srcSet={src2x ? `${src1x} 1x, ${src2x} 2x` : undefined}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setUseFallback(true)}
    />
  );
}
