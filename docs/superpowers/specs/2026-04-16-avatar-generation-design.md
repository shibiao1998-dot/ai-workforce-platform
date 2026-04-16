# AI 员工头像批量生成设计

## 背景

AI员工花名册的卡片已重设计为画像式布局（120px头像+160px展示区），当前使用程序化SVG机器人占位。需要为24名员工生成风格统一、突出职业特征的2D数字插画人像。

## API

- **模型:** `gemini-3.1-flash-image-preview`
- **端点:** `POST https://ai-gateway.aiae.ndhy.com/v1/chat/completions`
- **认证:** `Authorization: Bearer <API_KEY>`
- **请求参数:** `model`, `messages`, `modalities: ["text", "image"]`
- **响应格式:** `{ data: [{ b64_json: "<base64 PNG>" }] }`
- **凭证来源:** `.env.local` 中的 `GEMINI_GATEWAY_URL` 和 `GEMINI_API_KEY`

## 图片规格

- **尺寸:** 512x768 竖版
- **格式:** PNG
- **预计大小:** 300-600KB/张，24张总计 ~10-15MB
- **存储位置:** `public/avatars/{员工名}.png`

## Prompt 设计

### 统一风格前缀

所有员工共用，确保视觉一致性：

```
Create a professional 2D digital illustration portrait of a Chinese professional.
Clean modern style with soft shading, head and shoulders composition,
solid light gradient background, soft studio lighting.
The character should look approachable and competent.
```

### 每人个性化描述

按角色的职业特征定制性别、年龄段、着装、气质。完整映射：

| 员工 | Prompt 个性化部分 |
|---|---|
| AI审计官 | Mature male, mid-40s, dark navy suit with tie, silver-rimmed glasses, serious confident expression, short neat hair |
| AI项目绩效评估员 | Male, mid-30s, charcoal business suit, holding a tablet, analytical focused gaze, neat side-parted hair |
| AI周版本管理员 | Female, late-20s, smart casual blazer over white shirt, energetic determined expression, shoulder-length hair |
| AI生产线管理员 | Male, mid-30s, dark polo shirt with ID badge, commanding presence, short crew cut |
| AI业务分析师 | Female, early-30s, light gray suit jacket, data-savvy look, glasses, hair in a low bun |
| AI业务顾问 | Male, late-40s, premium dark suit, distinguished silver-streaked hair, wise calm expression |
| AI人力专员 | Female, late-20s, soft pink blouse under navy cardigan, warm empathetic expression, long straight hair |
| AI正向激励专员 | Female, early-30s, bright teal blazer, cheerful inspiring smile, wavy medium-length hair |
| AI立项专员 | Male, late-20s, business casual shirt rolled sleeves, eager forward-leaning posture, young energetic look |
| AI审核员 | Male, mid-30s, formal white shirt with dark vest, meticulous careful expression, glasses, neat hair |
| AI战略规划师 | Male, mid-40s, dark turtleneck sweater, visionary thoughtful gaze, salt-and-pepper short hair |
| AI产品经理 | Female, early-30s, white blouse with subtle pattern, confident articulate expression, bob haircut |
| AI软件设计师 | Male, late-20s, casual hoodie with headphones around neck, creative focused look, slightly messy hair |
| AI游戏设计师 | Male, mid-20s, graphic tee under open flannel shirt, playful creative smile, stylish undercut hair |
| AI需求分析员 | Female, early-30s, structured navy blazer, attentive listening expression, hair pulled back |
| AI生产评审员 | Male, mid-30s, crisp white shirt with sleeves rolled, evaluative sharp gaze, close-cropped hair |
| AI质检员 | Female, late-20s, lab-style white coat over casual top, detail-oriented precise look, glasses, ponytail |
| AI入库员 | Male, late-20s, utility vest over t-shirt, organized efficient demeanor, short practical hair |
| AI生产监控员 | Male, early-30s, dark technical jacket, alert watchful expression, short buzz cut |
| AI编剧 | Female, late-20s, cozy knit sweater, warm creative dreamy smile, loose wavy hair |
| AI角色设计师 | Female, mid-20s, artistic scarf and denim jacket, imaginative bright expression, colorful hair accessory |
| AI美术师 | Male, early-30s, paint-splattered apron over black tee, artistic passionate gaze, medium textured hair |
| AI音效师 | Male, late-20s, professional headphones around neck, dark turtleneck, calm focused expression, neat medium hair |
| AI字幕员 | Female, mid-20s, modern minimalist blouse, precise detail-oriented look, clean short bob |

## 脚本设计

### 文件

`scripts/generate-avatars.ts` — 独立 build-time 脚本，通过 `tsx` 运行。

### 执行逻辑

1. 从 `.env.local` 读取 `GEMINI_GATEWAY_URL` 和 `GEMINI_API_KEY`
2. 定义24人的 prompt 映射数组
3. 顺序处理每个员工：
   - 检查 `public/avatars/{name}.png` 是否已存在，存在则跳过（断点续传）
   - 拼接统一前缀 + 个性化描述为完整 prompt
   - 调用 API，解析 `data[0].b64_json`
   - base64 解码写入 PNG 文件
   - 打印进度 `[N/24] {name} ✓ (size KB)`
   - 等待 3 秒后处理下一个
4. 处理失败时打印错误但继续下一个（不中断）
5. 结束时汇总：成功 N 个，失败 N 个

### 错误处理

- API 返回 `IMAGE_RECITATION` → 记录失败，继续下一个
- 网络超时 (90s) → 记录失败，继续
- 响应格式异常 → 记录失败，继续
- 脚本可重复运行，已存在的文件自动跳过

## 集成

### package.json

```json
"generate:avatars": "tsx scripts/generate-avatars.ts"
```

### .env.local

```
GEMINI_GATEWAY_URL=https://ai-gateway.aiae.ndhy.com
GEMINI_API_KEY=sk-nd-x0hURzXLt6ecXY5EAe524aFd016a48B58aCa75A5Af1e3
```

### seed.ts

生成完成后，更新每个员工的 `avatar` 字段：
```ts
avatar: "/avatars/AI审计官.png",
```

### 组件层

`AiAvatar` 组件已支持图片 URL（`avatar` 为 truthy 时渲染 `<img>`），无需改动。

## 验证

1. `npm run generate:avatars` — 24张图片全部生成到 `public/avatars/`
2. `npm run db:seed` — seed 数据包含 avatar 路径
3. `npm run build` — 构建通过
4. `npm run dev` — 浏览器打开花名册页，24张人像正确显示在卡片中
