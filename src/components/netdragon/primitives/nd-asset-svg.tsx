/**
 * NdAssetSvg — 直接渲染 public/netdragon/_fallback/ 下的 SVG 资产
 *
 * 用途:徽章 / ornament 在首屏 / 高频区已知不走 WebP 时,直接引用 SVG
 *       以获得最佳性能(< 5KB,矢量,不依赖加载)。
 *
 * 用法:
 *   <NdAssetSvg path="scene-generic.svg" alt="通用场景" className="w-full h-auto" />
 */

interface NdAssetSvgProps {
  path: string;
  alt: string;
  className?: string;
}

export function NdAssetSvg({ path, alt, className }: NdAssetSvgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/netdragon/_fallback/${path}`}
      alt={alt}
      className={className}
    />
  );
}
