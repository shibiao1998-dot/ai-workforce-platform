/**
 * NetDragon 基建 smoke-test 页面
 *
 * 用途:验证 Task 1-8 的基建全部生效。阶段 1 结束后删除此文件。
 *
 * 验收点:
 *   1. 页面能打开(http://localhost:3000/nd-smoke)
 *   2. 能看到 4 个色块,分别用 bg-nd-primary / bg-nd-secondary / bg-nd-accent / bg-nd-emerald
 *   3. 看到一张 smoke-test WebP 图(生成于 Task 4-5)
 *   4. 看到一个带能量流动动效的进度条
 *   5. 看到一个字体为 Orbitron 的大数字
 *   6. 看到 scene-generic.svg 占位图(NdAssetSvg 直接渲染)
 */

import { NdAsset, NdAssetSvg } from "@/components/netdragon";

export default function NdSmokePage() {
  return (
    <main className="min-h-screen bg-nd-canvas p-10 font-nd-sans">
      <div className="mx-auto max-w-5xl space-y-10">
        <header>
          <h1 className="text-xl font-bold text-nd-ink">网龙基建 Smoke Test</h1>
          <p className="text-sm text-nd-ink-soft mt-2">
            这是阶段 0 的验收页面。阶段 1 结束后删除此文件。
          </p>
        </header>

        {/* 1. Token 色块 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            1. Tokens — 颜色
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-nd-lg bg-nd-primary shadow-nd-md p-4 text-white text-sm">
              primary · 电光蓝
            </div>
            <div className="rounded-nd-lg bg-nd-secondary shadow-nd-md p-4 text-white text-sm">
              secondary · 科技青
            </div>
            <div className="rounded-nd-lg bg-nd-accent shadow-nd-md p-4 text-nd-ink text-sm">
              accent · 琥珀金
            </div>
            <div className="rounded-nd-lg bg-nd-emerald shadow-nd-md p-4 text-white text-sm">
              emerald · 生产绿
            </div>
          </div>
        </section>

        {/* 2. Orbitron 字体 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            2. Tokens — 字体(Orbitron)
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6 text-center">
            <div className="text-sm text-nd-ink-soft">本月完成任务</div>
            <div className="text-5xl font-bold text-nd-ink font-nd-display mt-2">
              2,847
            </div>
          </div>
        </section>

        {/* 3. 能量流动 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            3. 能量流动动效(.nd-flow)
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <div className="h-2 rounded-nd-full bg-nd-line nd-flow" />
            <p className="text-xs text-nd-ink-soft mt-3">
              应当看到一道光从左到右循环流动。
            </p>
          </div>
        </section>

        {/* 4. NdAsset:真实 WebP */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            4. NdAsset — smoke-test WebP
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <NdAsset
              id="smoke-test"
              label="default"
              alt="Smoke test ornament"
              className="w-64 h-64 rounded-nd-lg object-cover"
              loading="eager"
            />
            <p className="text-xs text-nd-ink-soft mt-3">
              应当显示 Task 4 生成的 ornament 图。
            </p>
          </div>
        </section>

        {/* 5. NdAsset 的 fallback 路径:故意引用不存在的 id */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            5. NdAsset — fallback(引用不存在的 id)
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <NdAsset
              id="does-not-exist-xyz"
              label="default"
              alt="不存在的素材"
              className="w-64 h-64 rounded-nd-lg"
            />
            <p className="text-xs text-nd-ink-soft mt-3">
              应当显示红色 "missing:does-not-exist-xyz" 提示,而不是崩溃。
            </p>
          </div>
        </section>

        {/* 6. NdAssetSvg 直接渲染 */}
        <section>
          <h2 className="text-base font-semibold text-nd-ink mb-3">
            6. NdAssetSvg — 直接渲染降级 SVG
          </h2>
          <div className="rounded-nd-lg bg-white shadow-nd-sm p-6">
            <NdAssetSvg
              path="scene-generic.svg"
              alt="通用场景占位"
              className="w-64 h-auto rounded-nd-lg"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
