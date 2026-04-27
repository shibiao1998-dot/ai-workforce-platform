# 网龙风 UI 基建 · 使用文档

本文档描述阶段 0 基建的用法。完整设计见
[spec](../superpowers/specs/2026-04-27-netdragon-ui-design.md)。

## 可用脚本

| 命令 | 作用 |
|---|---|
| `npm run nd:generate` | 根据 `scripts/nd-catalog.json` 生成素材(调用 gpt-image-2) |
| `npm run nd:postprocess` | 把 PNG 母版转成 WebP + 派生多尺寸 |
| `npm run nd:budget-check` | 扫描 public/netdragon/**/*.webp,超预算则 fail |

## 常用工作流

### 生成一张新素材

1. 在 `scripts/nd-catalog.json` 里加一条 entry,指定 family、promptVars、sizes、tier、fallback
2. 生成:
   ```bash
   npm run nd:generate -- --id=<your-id>
   ```
3. 肉眼确认 PNG 母版符合风格(`public/netdragon/<family>/<id>-<label>.png`)
4. 后处理:
   ```bash
   npm run nd:postprocess -- --id=<your-id>
   ```
5. 预算检查:
   ```bash
   npm run nd:budget-check
   ```
6. 在业务组件里引用:
   ```tsx
   import { NdAsset } from "@/components/netdragon";
   <NdAsset id="your-id" label="desktop" alt="描述" />
   ```

### 生成整批 top-tier 素材(阶段 1 开始用)

```bash
npm run nd:generate -- --batch=1      # 只跑 tier=top 的
npm run nd:postprocess                # 后处理所有已有 PNG
npm run nd:budget-check
```

### Dry-run(调试 prompt,不烧 API)

```bash
npm run nd:generate -- --id=<id> --dry-run
```

## 目录结构

```
scripts/
  nd-catalog.json          素材清单(单一数据源)
  nd-prompts/              9 个家族的 prompt 模板 + 1 个全局锚点
  generate-netdragon-assets.ts
  nd-post-process.ts
  nd-budget-check.ts

public/netdragon/
  <family>/                hero / scene / banner / ...
    <id>-<label>.png       PNG 母版(.gitignore,本地保留)
    <id>-<label>.webp      @1x WebP(入 git)
    <id>-<label>@2x.webp   @2x WebP(入 git)
  _fallback/               SVG 降级替身

src/components/netdragon/
  primitives/
    nd-asset.tsx           <NdAsset />
    nd-asset-svg.tsx       <NdAssetSvg />
    nd-asset-catalog.ts    catalog 的类型和 loader
    index.ts
  index.ts                 顶级导出
```

## Design Tokens

Tokens 在 `src/app/globals.css` 的 `@theme inline` 块中,以 `--color-nd-*` /
`--font-nd-*` / `--radius-nd-*` / `--shadow-nd-*` 命名。Tailwind v4 会自动
识别并生成 `bg-nd-primary` / `text-nd-ink` / `shadow-nd-md` / `font-nd-display`
/ `rounded-nd-lg` 等工具类。

能量流动动效通过 `.nd-flow` 这个 utility class 使用。

## 品牌 DNA

所有 AI 生图都基于"**网龙星舰企业号总部 + 东方数字龙**"这套组合视觉 DNA。
全局锚点固化在 `scripts/nd-prompts/global-anchor.txt`,每次生图自动注入。

详见 spec §2(设计语言)和批次 1 素材审核原则。

## 约束

- Tier 为 `top` 的素材允许 8 次 API 重试(色调/构图/细节追求最高质量)
- Tier 为 `normal` 只重试 3 次
- 单张 @1x WebP 预算 80KB,hero 家族 @2x 例外允许 400KB
- `smoke-test` 是基建验证资产,在 `nd:budget-check` 白名单,不受生产预算约束
- 业务组件不直接写 `bg-nd-*` 之类的 Tailwind 类做定制设计 —— 应当通过
  `netdragon/` 的高层组件消费设计语言(阶段 1 开始落地)
