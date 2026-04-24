---

# AI 员工形象照升级：gpt-image-2 真实感肖像

## 概述

将 AI Workforce Platform 的 24 位员工形象照从 Gemini 3.1 Flash 2D 插画风格升级为 gpt-image-2 真实感商业摄影风格。要求：中国人面孔、真实服化道、真实背景，彻底消除 AI 感和动漫感。

## 决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 图片尺寸 | 2560×1440 (2K QHD) | 标准 2K、16:9 与现有一致、宽高被 16 整除、展示区仅 h-80(320px) 无需 4K |
| 图片质量 | high | 用户要求，真实感需要更多细节 |
| API 方式 | fetch 直调 /v1/images/generations | 零依赖、现有代码结构一致、自定义尺寸无类型问题 |
| 环境变量 | IMAGE_API_GATEWAY_URL / IMAGE_API_KEY | 覆盖替换旧 GEMINI_ 变量，不做 fallback |
| 预估费用 | ~1.0-1.3 CNY/张 × 24 = ~25-30 CNY | high quality 2K 分辨率 |

## 改动范围

### 1. 环境变量 (.env.local)

```
# 旧
GEMINI_GATEWAY_URL=https://ai-gateway.aiae.ndhy.com
GEMINI_API_KEY=sk-nd-x0hURzXLt6ecXY5EAe524aFd016a48B58aCa75A5Af1e3

# 新
IMAGE_API_GATEWAY_URL=https://ai-gateway.aiae.ndhy.com
IMAGE_API_KEY=sk-nd-x0hURzXLt6ecXY5EAe524aFd016a48B58aCa75A5Af1e3
```

### 2. Prompt 模板

**新 STYLE_PREFIX（替换 2D 插画风格）：**

```
Professional commercial portrait photograph of a young Chinese professional.
Shot on Canon EOS R5 with 85mm f/1.4 lens. Shallow depth of field, natural lighting
with soft fill light. Photorealistic, high-end corporate magazine editorial style.
Frame from chest up, centered with breathing room. Real fabric textures, real accessories,
real hair. LANDSCAPE orientation (16:9, 2560x1440). No illustration, no anime,
no CGI, no AI-generated artifacts. The person must look like a real Chinese individual
with natural skin texture, natural facial features, and natural expression.
```

**buildPrompt 结构不变：**
```
[STYLE_PREFIX] + [性别/年龄/服饰] + [表情] + [标志物] + [背景场景] + [团队色调灯光]
```

每位员工的 persona 数据（fashionStyle、visualTraits、sceneDescription）继续原样使用。

### 3. API 调用层改造

**请求：**
```
旧：POST {gateway}/v1/chat/completions
    { model: "gemini-3.1-flash-image-preview", messages: [...], modalities: ["text","image"] }

新：POST {gateway}/v1/images/generations
    { model: "gpt-image-2", prompt: "...", n: 1, size: "2560x1440", quality: "high" }
```

**响应解析：** `json.data[0].b64_json` — 结构相同无需改。

**超时：** 90s → 300s（gpt-image-2 单张 2-3 分钟）。

**批量间隔：** 3s → 5s（避免 429）。

### 4. 文件改动清单

| 文件 | 改动内容 |
|---|---|
| `.env.local` | 变量名 GEMINI_* → IMAGE_API_* |
| `scripts/generate-avatars.ts` | 环境变量名、API 端点/请求体、STYLE_PREFIX、超时、间隔、去掉 existsSync 跳过逻辑（全量覆盖重新生成） |
| `src/lib/avatar-generator.ts` | 环境变量名、API 端点/请求体、STYLE_PREFIX、超时、generateAvatarDescription 更新 |
| `CLAUDE.md` | generate:avatars 脚本说明更新为 gpt-image-2 |

### 5. 不涉及的部分

- UI 组件：不改动。AiAvatar 组件的 `object-fit: cover` + `object-position: center 25%` 自动适配 16:9 2K 图片。
- 数据库 schema：不改动。avatar 字段存的是 `/avatars/{name}.png` 路径，不变。
- 其他 API 路由：不改动。

## API 实测约束（2026-04-24）

基于对 gpt-image-2 网关的实际测试：

- **size**: 支持预设值 + 任意自定义 WxH（宽高被 16 整除、最长边 ≤ 3840、宽高比 ≤ 3:1、像素范围 ~655K-~8.3M）
- **quality**: low / medium / high / auto（auto=high）
- **output_format**: png / jpeg（不支持 webp）
- **background**: auto / opaque（不支持 transparent）
- **n**: 1-10
- **详细文档**: `/Users/bill_huang/personal/apikey/gpt-image-2-接入文档.md`
