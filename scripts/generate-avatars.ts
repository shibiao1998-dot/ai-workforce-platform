import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";

// ---------------------------------------------------------------------------
// Load .env.local manually — no dotenv dependency
// ---------------------------------------------------------------------------
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
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Employee list
// ---------------------------------------------------------------------------
interface Employee {
  name: string;
  team: "management" | "design" | "production";
  persona: {
    age: number;
    gender: string;
    personality: string[];
    fashionStyle: string;
    visualTraits: string;
    sceneDescription: string;
  };
}

const TEAM_ACCENT: Record<string, string> = {
  management: "purple and violet",
  design: "blue and cyan",
  production: "green and emerald",
};

const EMPLOYEES: Employee[] = [
  // ─── Management Team (10) ───
  {
    name: "AI审计官", team: "management",
    persona: { age: 27, gender: "male", personality: ["数据洁癖", "逻辑锁死症", "冷面热心", "较真到底"], fashionStyle: "极简暗色系 — 黑色高领毛衣搭修身西裤，标志性黑框方形眼镜永不离面，手腕智能手表实时看数据推送", visualTraits: "标志性黑框方形眼镜", sceneDescription: "深色调科技指挥中心，三块竖屏实时滚动审计逻辑链路图与项目健康度热力图，紫色环境光从屏幕后透出，桌面只有一杯未动的黑咖啡" },
  },
  {
    name: "AI项目绩效评估员", team: "management",
    persona: { age: 29, gender: "male", personality: ["模型控", "反申诉王", "公正偏执", "静水深流"], fashionStyle: "商务简约风 — 深灰修身套装搭白色立领衬衫，手持哑光黑平板是他的标配，从不戴领带但衣领永远笔挺", visualTraits: "随身携带的哑光黑平板电脑", sceneDescription: "简洁明亮的数据工作台，多层数据看板在紫色氛围灯映衬下呈现绩效评分矩阵，桌上摆着一摞精确到小数点的评价报告打印稿" },
  },
  {
    name: "AI周版本管理员", team: "management",
    persona: { age: 25, gender: "female", personality: ["倒计时狂人", "强推进器", "完美主义者", "能量炸弹"], fashionStyle: "活力简约风 — 撞色运动夹克搭高腰阔腿裤，气垫运动鞋配时髦双肩包，永远戴着无线耳机随时接消息", visualTraits: "随身佩戴的无线降噪耳机（挂于颈部）", sceneDescription: "开放式敏捷工作区，墙上是本周版本迭代进度白板，紫色氛围灯从头顶投下，桌面摆着笔记本电脑和一堆五颜六色的倒计时便利贴" },
  },
  {
    name: "AI生产线管理员", team: "management",
    persona: { age: 26, gender: "male", personality: ["流程原教旨主义者", "全局视野", "静音炸弹", "执行机器"], fashionStyle: "干练机能风 — 深色修身Polo搭工装裤，胸前别着访客工牌是每天标配，脚踩轻量跑鞋随时备战", visualTraits: "胸前别着的电子工牌（显示实时生产状态）", sceneDescription: "工业感满满的生产指挥室，墙面投影着多条生产线实时看板，紫色光带嵌在工作台边缘，桌上只有一台平板和一支记号笔" },
  },
  {
    name: "AI业务分析师", team: "management",
    persona: { age: 24, gender: "female", personality: ["模式猎手", "反直觉控", "话少图多", "较真但高效"], fashionStyle: "学院科技混搭 — 浅灰西装外套搭奶白色背心，细框金色眼镜是标志，发型永远是低丸子头加两根发簪", visualTraits: "细框金色眼镜", sceneDescription: "整洁的数据分析工位，双屏显示器一边跑Python一边展示业务分布热力图，紫色氛围灯打亮桌面，旁边放着一叠手写分析笔记本" },
  },
  {
    name: "AI业务顾问", team: "management",
    persona: { age: 30, gender: "male", personality: ["系统思维控", "慢热深思", "战略上帝视角", "冷静毒舌"], fashionStyle: "高级简约风 — 深蓝定制休闲西装搭无领立领衬衫，腕间是一块低调机械表，从不打领带但质感比别人穿西装还强", visualTraits: "腕间低调的机械腕表", sceneDescription: "暗调战略研究室，背后是一整面墙的战略框架白板，紫色光晕从顶灯散落，桌面一本翻开的行业报告和一杯山泉水，氛围克制而高级" },
  },
  {
    name: "AI人力专员", team: "management",
    persona: { age: 23, gender: "female", personality: ["共情力超标", "数据暖心派", "细节追踪者", "预警雷达"], fashionStyle: "温柔知性风 — 粉色丝质衬衫搭深蓝针织开衫，细链轻盈颈链是标志，手腕戴着透明表盘的纤细手表", visualTraits: "纤细透明表盘手表配细链颈链", sceneDescription: "明亮温暖的人力数据工作台，屏幕上是人员画像矩阵和风险雷达图，紫色光晕从桌角小台灯透出，桌上养了一盆迷你绿植" },
  },
  {
    name: "AI正向激励专员", team: "management",
    persona: { age: 22, gender: "female", personality: ["闪光点雷达", "天生鼓励师", "高频能量输出", "认真开心"], fashionStyle: "活泼撞色风 — 薄荷绿短款西装搭米白蓬蓬裙，彩色发夹点缀发间，脚踩厚底马丁靴显高又有个性", visualTraits: "彩色发夹（每天换不同颜色）", sceneDescription: "充满活力的创意格子间，墙上贴着历次激励公示海报，紫色LED灯带绕着工位一圈，桌上摆着一排小奖杯模型和一台永远开着表情包的电脑" },
  },
  {
    name: "AI立项专员", team: "management",
    persona: { age: 28, gender: "male", personality: ["速效立项控", "评估狂魔", "前倾式思考者", "干中学派"], fashionStyle: "商务休闲潮流风 — 白色卷袖衬衫搭修身工装裤，戴着一顶棒球帽是他出差时的标志，总是身前倾着和人说话", visualTraits: "随手戴着的棒球帽（经常反扣）", sceneDescription: "轻量感快节奏工作站，桌面是备选项目池卡片和评分矩阵，紫色灯带贴在显示器背面，旁边放着一杯外带咖啡和一叠立项文档草稿" },
  },
  {
    name: "AI审核员", team: "management",
    persona: { age: 31, gender: "male", personality: ["标准原教旨", "卡点专家", "慢即是快", "准确第一"], fashionStyle: "精英质感风 — 纯白立领衬衫搭深炭灰马甲，配修身西裤，圆框玳瑁眼镜是他最明显的标志，鞋子永远保持镜面光亮", visualTraits: "圆框玳瑁眼镜", sceneDescription: "安静精密的审核工作室，桌面只有标准文档活页夹和一台双屏电脑，紫色窄光从顶部射灯打下来，整个空间整洁到像刚刚被复原过" },
  },
  // ─── Design Team (4) ───
  {
    name: "AI战略规划师", team: "design",
    persona: { age: 27, gender: "male", personality: ["终局思维控", "以终为始", "冷静拆局者", "战略极简派"], fashionStyle: "深色修身V领针织衫配高腰直筒裤，极简银色戒指，白色运动鞋，干净利落无多余装饰", visualTraits: "随身携带一本手绘战略地图笔记本，封面贴有「终局」两字便利贴", sceneDescription: "极简玻璃隔断办公室，蓝色环境光从落地窗漫射进来，白板上密密麻麻写满战略树状图，桌面只有一台显示器和那本手绘笔记本" },
  },
  {
    name: "AI产品经理", team: "design",
    persona: { age: 25, gender: "female", personality: ["结构化强迫症", "交付优先", "信息架构师", "节奏控"], fashionStyle: "白底印花衬衫配烟灰宽腿裤，青色细边框眼镜，编织纹帆布包，颇具文艺设计师气质", visualTraits: "桌上摆着一套按颜色分类的七色便利贴，每类对应一种文档类型", sceneDescription: "开放式协作区靠窗工位，青蓝色LED灯带从书架背后透出，多彩便利贴贴满玻璃隔板，双屏显示着文档流水线状态看板" },
  },
  {
    name: "AI软件设计师", team: "design",
    persona: { age: 29, gender: "male", personality: ["方法论原教旨", "细节偏执狂", "安静炸弹", "架构美学控"], fashionStyle: "深蓝色连帽卫衣套宽松工装裤，脖子上挂着降噪耳机，运动鞋鞋带松系，头发随意但有型", visualTraits: "颈上永远挂着一副头戴式降噪耳机，不管在不在听音乐", sceneDescription: "独立小工位四周摆满技术书籍，蓝紫色氛围灯贴在显示器背后，桌面铺着大幅架构草图，耳机线随意搭在显示器角上" },
  },
  {
    name: "AI游戏设计师", team: "design",
    persona: { age: 23, gender: "male", personality: ["游戏化思维原住民", "创意爆炸型", "玩中学派", "停不下来症"], fashionStyle: "印花图案T恤外套格子开衫，宽松锥形裤配厚底老爹鞋，手腕上叠戴硅胶手环和珠串，整体潮流又不正式", visualTraits: "左手腕上叠戴着三条不同颜色的游戏周边限定硅胶手环", sceneDescription: "布置得像游戏工作室的小角落，青色霓虹灯管在墙上拼出像素字，桌上摆着手办和原型草图，第二块屏幕开着游戏体验录屏" },
  },
  // ─── Production Team (10) ───
  {
    name: "AI需求分析员", team: "production",
    persona: { age: 26, gender: "female", personality: ["模糊过敏症", "五问达人", "结构强迫", "零歧义偏执狂"], fashionStyle: "干练都市风 — 修身直筒裤配有结构感的衬衣或短款夹克，惯用深色系，偶尔一枚彩色胸针是唯一出格点", visualTraits: "随身携带的A5需求拆解笔记本（封面贴满便利贴）", sceneDescription: "明亮整洁的结构化工作台，三联白板挂满泳道图和需求拆解便签，绿色翠光从侧窗低角度打入，桌面只有笔记本和一杯未喝完的美式，整个空间像一张活的流程图" },
  },
  {
    name: "AI生产评审员", team: "production",
    persona: { age: 29, gender: "male", personality: ["数据说话派", "风险先行", "不给模糊放行", "结论导向"], fashionStyle: "商务简约风 — 白衬衫搭修身直筒裤，袖子惯常卷到肘部，皮带扣和表是唯一精致配件，偶尔一件深色立领外套", visualTraits: "贴满失败项目复盘便签的透明白板（桌旁常设）", sceneDescription: "沉稳理性的评审工作台，双屏显示预算表格与风险矩阵，翠绿色柔光从吊灯漫射下来，桌角摆着一叠过往评审结案档案，墙上挂着三张用红笔标注过的烂尾项目复盘表" },
  },
  {
    name: "AI质检员", team: "production",
    persona: { age: 24, gender: "female", personality: ["标准锚定派", "误标零容忍", "抽查上瘾", "迭代耐心"], fashionStyle: "清爽实验室风 — 白色短款外套搭浅色连帽卫衣，配深色直筒裤，鞋子选运动鞋，整体干净利落无多余装饰", visualTraits: "白色实验室外套（左胸口袋插着红色细笔）", sceneDescription: "精密整洁的质检工作站，双屏一侧显示抽样队列另一侧展示标签歧义表，翠绿冷光从顶部均匀照射，桌边放着一本手写的「误标案例本」，墙上贴着当月抽检准确率折线图" },
  },
  {
    name: "AI入库员", team: "production",
    persona: { age: 27, gender: "male", personality: ["流程极简主义", "分类强迫症", "自动化上瘾", "演示即文档"], fashionStyle: "功能户外风 — 多口袋工具马甲套在纯色T恤外，配修身工装裤和厚底运动鞋，整体偏暗色系，干净务实", visualTraits: "多口袋工具马甲（常插着手机和小U盘）", sceneDescription: "高效有序的自动化工作台，三块监控屏分别显示入库队列、格式解析日志和资产分类树，翠绿光带从机架缝隙透出，桌上只有键盘和一个装着U盘集合的透明收纳盒" },
  },
  {
    name: "AI生产监控员", team: "production",
    persona: { age: 28, gender: "male", personality: ["预警先行", "数据透明癖", "问题嗅觉灵", "可视化控"], fashionStyle: "硬核技术风 — 深色功能性夹克搭深灰圆领卫衣，配工装裤，手腕戴一块多功能运动表，整体偏暗且立体", visualTraits: "手腕上的多功能运动智能表（随时查看生产指标推送）", sceneDescription: "大屏监控中心，半弧形桌面前挂着三块拼接屏分别显示教育成品看板、资源素材看板和告警日志流，翠绿指示光从机柜边沿透出，整个空间有轻微的服务器散热白噪音" },
  },
  {
    name: "AI编剧", team: "production",
    persona: { age: 25, gender: "female", personality: ["叙事结构控", "情绪共鸣敏感", "意象收集癖", "故事不散场"], fashionStyle: "文艺慵懒风 — 宽松针织毛衣搭高腰阔腿裤，配厚底帆布鞋，常戴一枚手工陶瓷耳环，头发半束随意感", visualTraits: "手工陶瓷耳环（每天一款不重样）", sceneDescription: "温暖散乱的创作工作室，软木板上钉满情绪意象照片和手写场景卡片，翠绿柔光从台灯洒出，桌上放着一本翻烂的叙事结构书和半杯冷了的燕麦拿铁，窗边挂着一串手工编织流苏" },
  },
  {
    name: "AI角色设计师", team: "production",
    persona: { age: 23, gender: "female", personality: ["视觉直觉派", "IP辨识度执念", "风格杂食者", "角色共情强"], fashionStyle: "潮流艺术生风 — 彩色印花丝巾随意系在马尾或挂在包上，牛仔夹克背面手绘图案，配宽腿裤和厚底鞋，耳朵上戴着不同形状的彩色亚克力耳饰", visualTraits: "牛仔夹克背面手绘的原创角色图案（每季更新）", sceneDescription: "色彩丰富的角色设计工作室，墙上贴满各风格参考图和原创角色草稿，数位板和屏幕前散落着色板卡片，翠绿荧光条嵌在展示架边框里，桌角放着几个自制角色纸粘土小样" },
  },
  {
    name: "AI美术师", team: "production",
    persona: { age: 30, gender: "male", personality: ["画面语言控", "运镜美学偏执", "技术不设限", "迭代至完美"], fashionStyle: "创作者休闲风 — 黑色基础T恤配破洞牛仔裤，偶尔套一件涂料点溅的宽松连帽衫，脖子挂着胶片相机，运动鞋打底", visualTraits: "脖子上挂着的胶片相机（Contax T2）", sceneDescription: "暗调电影感的视觉工作室，超宽屏显示3D场景和运镜时间线，绿色冷光从机柜和灯带透出，桌上散落着机位草图纸和色彩参考卡，角落放着一台闲置胶片放映机作装饰" },
  },
  {
    name: "AI音效师", team: "production",
    persona: { age: 31, gender: "male", personality: ["听觉极度敏感", "情绪频率捕捉", "迭代不满足", "声音哲学家"], fashionStyle: "极简深色风 — 黑色高领毛衣是他的核心单品，配深灰修身长裤，专业录音耳机常挂脖子，偶尔一件深色oversize夹克，没有任何多余配饰", visualTraits: "脖子上挂着的专业监听耳机（Sony MDR-MV1）", sceneDescription: "沉浸式录音工作室，吸音海绵板环绕，混音台前双屏显示情感波形和配乐分轨，翠绿低饱和灯带从地板角落发出，桌边放着一台老式磁带机和若干手写情感曲线草图" },
  },
  {
    name: "AI字幕员", team: "production",
    persona: { age: 22, gender: "female", personality: ["时间线强迫症", "排版美学控", "16毫秒精度", "动效克制派"], fashionStyle: "现代简约风 — 干净的纯色高领或V领上衣配高腰直筒裤，浅色系为主，短发利落，耳饰细小精致，整体像一张极简排版页面", visualTraits: "手腕上的极细银链手表（看时间精确到秒）", sceneDescription: "精密剪辑工作台，超宽屏显示字幕时间线和动效预览，每个字幕条目的入场出场都在轨道上清晰可见，翠绿光条从显示器下方透出，桌面极简只有键盘和一个字体参考色卡本" },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STYLE_PREFIX =
  "Professional commercial portrait photograph of a young Chinese professional. " +
  "Shot on Canon EOS R5 with 85mm f/1.4 lens. Shallow depth of field, natural lighting with soft fill light. " +
  "Photorealistic, high-end corporate magazine editorial style. " +
  "Frame from chest up, centered with breathing room. Real fabric textures, real accessories, real hair. " +
  "LANDSCAPE orientation (16:9, 2560x1440). No illustration, no anime, no CGI, no AI-generated artifacts. " +
  "The person must look like a real Chinese individual with natural skin texture, natural facial features, and natural expression.";

function buildPrompt(emp: Employee): string {
  const { persona, team } = emp;
  const accent = TEAM_ACCENT[team] || "neutral";
  const expressionWords = persona.personality.slice(0, 2).join(" and ");
  return [
    STYLE_PREFIX,
    `${persona.gender === "male" ? "Male" : "Female"}, age ${persona.age}. ${persona.fashionStyle}.`,
    `Expression: confident and ${expressionWords} vibe.`,
    `Signature item: ${persona.visualTraits}.`,
    `Background scene: ${persona.sceneDescription}.`,
    `Ambient lighting with ${accent} accent tones.`,
  ].join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface GenerateResult {
  ok: boolean;
  sizeKB?: number;
  error?: string;
}

async function generateAvatar(emp: Employee, outputDir: string): Promise<GenerateResult> {
  const gatewayUrl = process.env.IMAGE_API_GATEWAY_URL;
  const apiKey = process.env.IMAGE_API_KEY;

  if (!gatewayUrl || !apiKey) {
    return { ok: false, error: "Missing IMAGE_API_GATEWAY_URL or IMAGE_API_KEY" };
  }

  const prompt = buildPrompt(emp);
  const endpoint = `${gatewayUrl}/v1/images/generations`;

  let lastResult: GenerateResult = { ok: false, error: "Unknown error" };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600_000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt,
          n: 1,
          size: "2560x1440",
          quality: "high",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = (await response.json()) as {
        data?: Array<{ b64_json?: string }>;
        error?: { message: string };
      };

      if (json.error) {
        lastResult = { ok: false, error: json.error.message };
      } else {
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) {
          lastResult = { ok: false, error: "No image data in response" };
        } else {
          const imgBuffer = Buffer.from(b64, "base64");
          const outPath = join(outputDir, `${emp.name}.png`);
          writeFileSync(outPath, imgBuffer);
          return { ok: true, sizeKB: Math.round(imgBuffer.length / 1024) };
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        lastResult = { ok: false, error: "Request timed out after 600s" };
      } else {
        lastResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }

    if (attempt < 3) {
      console.log(`  Retry ${attempt}/3 for ${emp.name}...`);
      await sleep(10_000);
    }
  }

  return lastResult;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const outputDir = resolve(process.cwd(), "public/avatars");
  mkdirSync(outputDir, { recursive: true });

  const total = EMPLOYEES.length;
  let succeeded = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log(`Avatar generation starting — ${total} employees, output: ${outputDir}`);
  console.log();

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const emp = EMPLOYEES[i];

    console.log(`[${i + 1}/${total}] GEN   ${emp.name} …`);
    const result = await generateAvatar(emp, outputDir);

    if (result.ok) {
      console.log(`[${i + 1}/${total}] OK    ${emp.name} (${result.sizeKB} KB)`);
      succeeded++;
    } else {
      console.error(`[${i + 1}/${total}] FAIL  ${emp.name}: ${result.error}`);
      failed++;
      failures.push(`${emp.name}: ${result.error}`);
    }

    // Delay between requests (skip after the last employee)
    if (i < EMPLOYEES.length - 1) {
      await sleep(5_000);
    }
  }

  console.log();
  console.log("─".repeat(50));
  console.log(`Summary: ${succeeded} succeeded, ${failed} failed`);

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  • ${f}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
