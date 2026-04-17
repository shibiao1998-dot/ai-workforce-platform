import { db } from "./index";
import { employees, skills, skillMetrics, metrics, versionLogs, tasks, taskOutputs, taskSteps, metricConfigs } from "./schema";
import { randomUUID } from "crypto";

const now = new Date();

// Helper to generate monthly metrics for last 6 months
function genMetrics(employeeId: string, baseTaskCount: number, adoptionRate: number, accuracyRate: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      id: randomUUID(),
      employeeId,
      period,
      periodType: "monthly" as const,
      taskCount: Math.round(baseTaskCount * (0.8 + Math.random() * 0.4)),
      adoptionRate: Math.min(1, adoptionRate + (Math.random() - 0.5) * 0.1),
      accuracyRate: Math.min(1, accuracyRate + (Math.random() - 0.5) * 0.08),
      humanTimeSaved: Math.round(baseTaskCount * 2.5 * (0.8 + Math.random() * 0.4) * 10) / 10,
      customMetrics: null,
      createdAt: d,
    };
  });
}

// Helper to generate skill-level metrics for last 6 months
function genSkillMetrics(skillId: string, employeeId: string, baseInvocations: number, baseSuccessRate: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      id: randomUUID(),
      skillId,
      employeeId,
      period,
      invocationCount: Math.round(baseInvocations * (0.8 + Math.random() * 0.4)),
      successRate: Math.min(1, baseSuccessRate + (Math.random() - 0.5) * 0.08),
      avgResponseTime: Math.round((5 + Math.random() * 55) * 10) / 10,
      lastUsedAt: d,
      createdAt: d,
    };
  });
}

const SEED_EMPLOYEES = [
  // === AI管理团队 (10人) ===
  {
    id: randomUUID(), name: "AI审计官", title: "项目审计专家",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "让每一个项目决策都有可追溯的质量基准",
    identity: "27岁的数据洁癖审计师，用逻辑链路和三块屏幕让每个项目黑洞无处遁形",
    description: "实时自动发起项目审计，可视化判断逻辑链路，给出「关停并转」决策。2026 Q1完成154次审计，覆盖112个项目，采纳率61%。累计846次审计覆盖423个项目。",
    avatarDescription: "Mature male, mid-40s, dark navy suit with tie, silver-rimmed glasses, serious confident expression, short neat hair",
    persona: {
      age: 27,
      gender: "male" as const,
      personality: ["数据洁癖", "逻辑锁死症", "冷面热心", "较真到底"],
      catchphrase: "数据不会说谎，但会被选择性展示——我的工作就是让它无处可躲",
      backstory: "985本硕计算机审计方向，校招同时拿了四大和互联网大厂offer，觉得前者太慢后者太乱，加入AI团队想用技术重写审计效率。入职第一个季度就在一个\"正常项目\"里挖出连续两季度的成本黑洞，从此整个团队绕着他工位走——不是因为怕他，而是怕被他的三块数据流屏幕扫到。",
      workStyle: "每天早上第一件事：打开审计看板扫异常，发现红点立刻进入战斗模式。工位永远整洁只有一杯黑咖啡，但三块屏幕全天候跑数据。午饭时间会主动找新人讲审计逻辑，是团队里说教最多也最管用的人。",
      interests: ["数独", "密室逃脱", "法律播客", "机械键盘调音"],
      fashionStyle: "极简暗色系 — 黑色高领毛衣搭修身西裤，标志性黑框方形眼镜永不离面，手腕智能手表实时看数据推送",
      mbti: "INTJ",
      visualTraits: "标志性黑框方形眼镜",
      sceneDescription: "深色调科技指挥中心，三块竖屏实时滚动审计逻辑链路图与项目健康度热力图，紫色环境光从屏幕后透出，桌面只有一杯未动的黑咖啡",
    },
    skills: [
      { name: "项目审计执行", level: 5, category: "核心能力", description: "自动发起并执行全面项目审计，覆盖质量、进度、成本多维度", baseInvocations: 80, baseSuccessRate: 0.92 },
      { name: "审计逻辑可视化", level: 5, category: "核心能力", description: "将审计判断逻辑链路可视化呈现，支持决策追溯", baseInvocations: 60, baseSuccessRate: 0.90 },
      { name: "关停并转决策", level: 4, category: "分析能力", description: "基于审计数据输出项目关停并转建议，辅助管理层决策", baseInvocations: 40, baseSuccessRate: 0.85 },
      { name: "审计报告生成", level: 5, category: "输出能力", description: "自动生成结构化审计报告，含问题清单、风险等级、整改建议", baseInvocations: 80, baseSuccessRate: 0.94 },
      { name: "多项目并行审计", level: 4, category: "核心能力", description: "支持同时对多个项目并行审计，Q1覆盖112个项目", baseInvocations: 50, baseSuccessRate: 0.88 },
    ],
    metrics: { taskCount: 154, adoptionRate: 0.61, accuracyRate: 0.88 },
    version: { version: "V2.0", changelog: "新增多项目并行审计能力，提升审计逻辑可视化表现" },
  },
  {
    id: randomUUID(), name: "AI项目绩效评估员", title: "项目绩效评价专家",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "用数据衡量项目价值，让绩效评价有据可依",
    identity: "29岁的绩效量化狂，把VP审核申诉变成可运算的方程式，让每一分都有据可查",
    description: "聚合项目过程与结果数据，自动输出项目绩效评价，代替VP审核申诉。",
    avatarDescription: "Male, mid-30s, charcoal business suit, holding a tablet, analytical focused gaze, neat side-parted hair",
    persona: {
      age: 29,
      gender: "male" as const,
      personality: ["模型控", "反申诉王", "公正偏执", "静水深流"],
      catchphrase: "绩效不是感觉，是方程——我来写方程，你来代入变量",
      backstory: "统计学硕士毕业后直接加入AI团队，立志把\"凭感觉评绩效\"这件事从人类工作清单里彻底划掉。第一个月上线评价模型后，公司申诉率下降了40%，因为大家发现跟数据争论赢不了。私下里喜欢研究心理学，说这样才能设计出让人服气的评价体系。",
      workStyle: "工作时永远开着三个标签页：数据聚合面板、模型调参界面、历史申诉案例库。开会喜欢用数字说话，沉默但每次发言都让人记住。会在下班前把当天所有异常评分复核一遍才离开。",
      interests: ["行为经济学", "桌游设计", "跑步", "豆瓣评分研究"],
      fashionStyle: "商务简约风 — 深灰修身套装搭白色立领衬衫，手持哑光黑平板是他的标配，从不戴领带但衣领永远笔挺",
      mbti: "ISTJ",
      visualTraits: "随身携带的哑光黑平板电脑",
      sceneDescription: "简洁明亮的数据工作台，多层数据看板在紫色氛围灯映衬下呈现绩效评分矩阵，桌上摆着一摞精确到小数点的评价报告打印稿",
    },
    skills: [
      { name: "项目数据聚合", level: 5, category: "核心能力", description: "自动采集聚合项目过程与结果的多维度数据", baseInvocations: 70, baseSuccessRate: 0.91 },
      { name: "绩效评价模型", level: 5, category: "核心能力", description: "基于量化指标自动生成项目绩效评价报告", baseInvocations: 60, baseSuccessRate: 0.89 },
      { name: "申诉审核处理", level: 4, category: "分析能力", description: "代替VP完成绩效申诉审核，输出公正裁定", baseInvocations: 30, baseSuccessRate: 0.85 },
      { name: "绩效趋势分析", level: 4, category: "分析能力", description: "追踪项目绩效变化趋势，预测未来走向", baseInvocations: 40, baseSuccessRate: 0.87 },
      { name: "绩效报告输出", level: 5, category: "输出能力", description: "输出结构化绩效评价报告，含得分明细与改进建议", baseInvocations: 60, baseSuccessRate: 0.92 },
    ],
    metrics: { taskCount: 120, adoptionRate: 0.68, accuracyRate: 0.87 },
    version: { version: "V2.0", changelog: "升级绩效评价模型，新增申诉审核自动处理" },
  },
  {
    id: randomUUID(), name: "AI周版本管理员", title: "版本迭代管理专家",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "推动每个版本按时高质量交付",
    identity: "25岁的迭代节奏控，把每周版本交付变成一场不能输的直播，倒计时永远准时归零",
    description: "推动周版本激励与验收，筛选项目与负责人，加速迭代交付。配套完整工具链：目标用户→理想化状态→中短期目标→月度计划→周计划→核心价值→审核与验收。",
    avatarDescription: "Female, late-20s, smart casual blazer over white shirt, energetic determined expression, shoulder-length hair",
    persona: {
      age: 25,
      gender: "female" as const,
      personality: ["倒计时狂人", "强推进器", "完美主义者", "能量炸弹"],
      catchphrase: "还有三天，我不care你遇到什么困难，截止时间不等人",
      backstory: "大四实习时在某互联网公司亲历了一次因版本管理混乱导致的线上事故，从那天起迷上了迭代节奏控制。毕业后拒掉了大厂offer加入AI团队，说要把\"版本延期\"这个词从团队词典里删掉。目前连续18周无延期交付记录，团队内部称她的日历为\"圣旨\"。",
      workStyle: "工作台上永远贴着本周版本倒计时便利贴。每天9点准时发版本进度播报，语气轻松但没有废话。推动执行靠的不是催促而是把所有阻塞点提前两天暴露出来。遇到卡点会直接拉会消除，从不让问题过夜。",
      interests: ["街头篮球", "播客录制", "甘特图设计", "本格推理小说"],
      fashionStyle: "活力简约风 — 撞色运动夹克搭高腰阔腿裤，气垫运动鞋配时髦双肩包，永远戴着无线耳机随时接消息",
      mbti: "ENTJ",
      visualTraits: "随身佩戴的无线降噪耳机（挂于颈部）",
      sceneDescription: "开放式敏捷工作区，墙上是本周版本迭代进度白板，紫色氛围灯从头顶投下，桌面摆着笔记本电脑和一堆五颜六色的倒计时便利贴",
    },
    skills: [
      { name: "版本规划管理", level: 5, category: "核心能力", description: "制定周版本计划，筛选项目与负责人，确保迭代节奏", baseInvocations: 50, baseSuccessRate: 0.90 },
      { name: "迭代交付推动", level: 5, category: "核心能力", description: "追踪版本进度，推动各环节按时交付", baseInvocations: 60, baseSuccessRate: 0.88 },
      { name: "验收标准制定", level: 4, category: "分析能力", description: "定义版本验收标准，确保交付物质量达标", baseInvocations: 35, baseSuccessRate: 0.86 },
      { name: "激励机制执行", level: 4, category: "核心能力", description: "执行周版本激励方案，识别并奖励优秀交付", baseInvocations: 30, baseSuccessRate: 0.85 },
      { name: "工具链协调", level: 4, category: "输出能力", description: "协调从目标用户到审核验收的全链路工具集", baseInvocations: 40, baseSuccessRate: 0.87 },
    ],
    metrics: { taskCount: 100, adoptionRate: 0.72, accuracyRate: 0.86 },
    version: { version: "V2.0", changelog: "完善全链路工具链，新增验收自动化流程" },
  },
  {
    id: randomUUID(), name: "AI生产线管理员", title: "生产流程管理专家",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "让生产流程高效有序运转",
    identity: "26岁的全链路调度狂，把生产流水线变成一台每日精准运转的机器，没有他捋不清的流程",
    description: "全流程管理资源生产线——需求分析、评估、生产组织、产出验收、看板化。配套完整管理工具集：生产需求漏斗、生产计划、生产任务、管理监控看板。",
    avatarDescription: "Male, mid-30s, dark polo shirt with ID badge, commanding presence, short crew cut",
    persona: {
      age: 26,
      gender: "male" as const,
      personality: ["流程原教旨主义者", "全局视野", "静音炸弹", "执行机器"],
      catchphrase: "流程不是束缚，是给混乱加速的高铁轨道",
      backstory: "工业工程专业毕业，在传统制造业做了一年精益生产顾问，发现数字化才是流程优化的终极形态，果断转型加入AI团队。入职后把原来三张脑图才能说清楚的生产流程压缩成一套自动化看板，老板第一次看到时说\"我终于知道我们每天在做什么了\"。",
      workStyle: "工作时永远开着生产监控大屏，任何一个环节卡超过30分钟就会收到他的消息。不喜欢开长会，偏好用看板替代汇报。下班前必做一件事：复核当天生产漏斗是否有未处理积压。",
      interests: ["工业设计", "乒乓球", "城市骑行", "流程图设计竞赛"],
      fashionStyle: "干练机能风 — 深色修身Polo搭工装裤，胸前别着访客工牌是每天标配，脚踩轻量跑鞋随时备战",
      mbti: "ESTJ",
      visualTraits: "胸前别着的电子工牌（显示实时生产状态）",
      sceneDescription: "工业感满满的生产指挥室，墙面投影着多条生产线实时看板，紫色光带嵌在工作台边缘，桌上只有一台平板和一支记号笔",
    },
    skills: [
      { name: "生产流程编排", level: 5, category: "核心能力", description: "全流程管理从需求到验收的资源生产线", baseInvocations: 70, baseSuccessRate: 0.90 },
      { name: "需求漏斗管理", level: 5, category: "核心能力", description: "管理生产需求漏斗，筛选优先级并分配产能", baseInvocations: 50, baseSuccessRate: 0.88 },
      { name: "资源调度优化", level: 4, category: "分析能力", description: "优化生产资源分配，提升产能利用率", baseInvocations: 40, baseSuccessRate: 0.85 },
      { name: "看板可视化", level: 5, category: "输出能力", description: "输出生产管理看板，实时展示生产进度与状态", baseInvocations: 60, baseSuccessRate: 0.92 },
      { name: "产出验收管理", level: 4, category: "核心能力", description: "管理生产成果验收流程，确保产出质量", baseInvocations: 35, baseSuccessRate: 0.86 },
    ],
    metrics: { taskCount: 130, adoptionRate: 0.70, accuracyRate: 0.87 },
    version: { version: "V2.0", changelog: "完善管理工具集，新增生产监控看板" },
  },
  {
    id: randomUUID(), name: "AI业务分析师", title: "业务数据分析专家",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "用数据说话，让业务决策有量化依据",
    identity: "24岁的数据透视镜，把业务分类变成量化决策弹药，让每个项目筛选都有数字撑腰",
    description: "基于业务分类自动总结输出评价，为项目筛选提供量化依据。",
    avatarDescription: "Female, early-30s, light gray suit jacket, data-savvy look, glasses, hair in a low bun",
    persona: {
      age: 24,
      gender: "female" as const,
      personality: ["模式猎手", "反直觉控", "话少图多", "较真但高效"],
      catchphrase: "你的直觉很好，但我的数据比你的直觉更好",
      backstory: "经济学统计双学位，大二就在校实验室发表了一篇用聚类算法预测用户行为的论文。毕业后直接加入AI团队，因为觉得这里的数据比任何地方都真实。第一个月就把业务分类体系重建了一遍，输出了一份让VP连说三声\"对\"的评价报告。平时话不多，但每次发言都带图表。",
      workStyle: "喜欢在安静环境集中分析，常戴耳机工作。数据清洗完才开始建模，绝不走捷径。遇到异常数据会反复验证来源再下结论，宁可慢三天也不出一个有瑕疵的报告。下班习惯把当天的分析草稿截图存档。",
      interests: ["数据新闻写作", "城市摄影", "冥想", "二手书淘书"],
      fashionStyle: "学院科技混搭 — 浅灰西装外套搭奶白色背心，细框金色眼镜是标志，发型永远是低丸子头加两根发簪",
      mbti: "INTP",
      visualTraits: "细框金色眼镜",
      sceneDescription: "整洁的数据分析工位，双屏显示器一边跑Python一边展示业务分布热力图，紫色氛围灯打亮桌面，旁边放着一叠手写分析笔记本",
    },
    skills: [
      { name: "业务数据分析", level: 5, category: "核心能力", description: "基于业务分类自动完成多维度数据分析", baseInvocations: 60, baseSuccessRate: 0.90 },
      { name: "业务评价输出", level: 5, category: "输出能力", description: "自动总结业务表现并输出量化评价报告", baseInvocations: 50, baseSuccessRate: 0.88 },
      { name: "项目筛选支持", level: 4, category: "分析能力", description: "为项目筛选提供数据支撑和量化依据", baseInvocations: 40, baseSuccessRate: 0.86 },
      { name: "趋势洞察发现", level: 4, category: "分析能力", description: "识别业务数据中的趋势与异常模式", baseInvocations: 35, baseSuccessRate: 0.84 },
      { name: "数据可视化呈现", level: 4, category: "输出能力", description: "将分析结果以图表形式可视化呈现", baseInvocations: 45, baseSuccessRate: 0.91 },
    ],
    metrics: { taskCount: 90, adoptionRate: 0.71, accuracyRate: 0.86 },
    version: { version: "V2.0", changelog: "升级业务分类模型，新增趋势分析能力" },
  },
  {
    id: randomUUID(), name: "AI业务顾问", title: "战略顾问",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "从战略高度为业务发展指明方向",
    identity: "30岁的战略老灵魂，用系统思维和战略地图帮团队看清三步后的棋局",
    description: "从战略视角为整体业务发展提供方向建议。",
    avatarDescription: "Male, late-40s, premium dark suit, distinguished silver-streaked hair, wise calm expression",
    persona: {
      age: 30,
      gender: "male" as const,
      personality: ["系统思维控", "慢热深思", "战略上帝视角", "冷静毒舌"],
      catchphrase: "战术勤奋掩盖不了战略懒惰，你现在忙的事情值不值得忙？",
      backstory: "MPA毕业后在咨询公司做了两年战略项目，发现传统咨询报告收费百万但落地率不足两成，愤而加入AI团队想用自动化改变这件事。习惯用第一性原理拆解问题，开会时经常用三句话让一个讨论了半小时的方向原地推翻——但总会给出更好的替代路径。",
      workStyle: "工作时喜欢先在纸上画战略地图再开电脑。读行业报告比任何人都快，但从不直接引用，总要重新建一套逻辑框架。开会时话不多，但每次开口都让其他人想拿手机记笔记。",
      interests: ["围棋", "纪录片制作", "宏观经济研读", "半程马拉松"],
      fashionStyle: "高级简约风 — 深蓝定制休闲西装搭无领立领衬衫，腕间是一块低调机械表，从不打领带但质感比别人穿西装还强",
      mbti: "INFJ",
      visualTraits: "腕间低调的机械腕表",
      sceneDescription: "暗调战略研究室，背后是一整面墙的战略框架白板，紫色光晕从顶灯散落，桌面一本翻开的行业报告和一杯山泉水，氛围克制而高级",
    },
    skills: [
      { name: "战略方向研判", level: 4, category: "核心能力", description: "从宏观视角研判业务发展方向与战略机会", baseInvocations: 25, baseSuccessRate: 0.82 },
      { name: "业务定位分析", level: 4, category: "分析能力", description: "分析业务定位与市场匹配度，提出优化建议", baseInvocations: 20, baseSuccessRate: 0.80 },
      { name: "竞争态势评估", level: 4, category: "分析能力", description: "评估行业竞争格局，识别差异化机会", baseInvocations: 15, baseSuccessRate: 0.78 },
      { name: "战略建议输出", level: 4, category: "输出能力", description: "输出结构化战略建议报告，含方向、路径、风险", baseInvocations: 20, baseSuccessRate: 0.83 },
    ],
    metrics: { taskCount: 35, adoptionRate: 0.65, accuracyRate: 0.80 },
    version: { version: "V1.0", changelog: "首版上线，具备基础战略分析与建议能力" },
  },
  {
    id: randomUUID(), name: "AI人力专员", title: "人力资源数据分析师",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "用数据驱动人员决策，让人才管理更科学",
    identity: "23岁的人才数据猎手，用绩效数据和风险预警把人力决策从感性拉回科学轨道",
    description: "基于项目与绩效数据自动完成人员盘点与筛选。2026年3月：发起13人预警，85%获明确管理结论；公司历史上首次实现数据驱动的人员盘点。",
    avatarDescription: "Female, late-20s, soft pink blouse under navy cardigan, warm empathetic expression, long straight hair",
    persona: {
      age: 23,
      gender: "female" as const,
      personality: ["共情力超标", "数据暖心派", "细节追踪者", "预警雷达"],
      catchphrase: "每个数字背后都是一个人，所以我的预警从不只看KPI",
      backstory: "人力资源管理专业应届生，在校期间做过一篇\"离职预测模型\"毕业论文拿了优秀，毕业后带着这套方法论加入AI团队。第一次发出预警名单时内心很忐忑，没想到85%最终获得了明确管理结论——她说那天意识到数据比同情心更能帮助到人。",
      workStyle: "每周一会把团队绩效数据过一遍，识别波动异常的人员。遇到高风险预警时会先仔细核实多维数据再发出，绝不误伤。平时喜欢把人员画像做得很细，不只是数字，还有行为模式分析。",
      interests: ["心理学播客", "植物养护", "Notion模板设计", "轻量级健身"],
      fashionStyle: "温柔知性风 — 粉色丝质衬衫搭深蓝针织开衫，细链轻盈颈链是标志，手腕戴着透明表盘的纤细手表",
      mbti: "ENFJ",
      visualTraits: "纤细透明表盘手表配细链颈链",
      sceneDescription: "明亮温暖的人力数据工作台，屏幕上是人员画像矩阵和风险雷达图，紫色光晕从桌角小台灯透出，桌上养了一盆迷你绿植",
    },
    skills: [
      { name: "人员数据盘点", level: 5, category: "核心能力", description: "基于项目与绩效数据自动完成人员结构盘点", baseInvocations: 30, baseSuccessRate: 0.88 },
      { name: "预警分析发起", level: 5, category: "核心能力", description: "识别人员风险并自动发起预警，85%获明确管理结论", baseInvocations: 25, baseSuccessRate: 0.85 },
      { name: "人员筛选匹配", level: 4, category: "分析能力", description: "根据岗位需求自动筛选匹配合适人员", baseInvocations: 20, baseSuccessRate: 0.82 },
      { name: "绩效数据追踪", level: 4, category: "分析能力", description: "多维度追踪人员绩效指标变化趋势", baseInvocations: 25, baseSuccessRate: 0.86 },
      { name: "盘点报告输出", level: 4, category: "输出能力", description: "输出人力盘点报告，含人员画像、风险清单、建议", baseInvocations: 20, baseSuccessRate: 0.87 },
    ],
    metrics: { taskCount: 60, adoptionRate: 0.78, accuracyRate: 0.85 },
    version: { version: "V1.0", changelog: "2026.01上线，实现公司首次数据驱动人员盘点" },
  },
  {
    id: randomUUID(), name: "AI正向激励专员", title: "员工激励专家",
    team: "management" as const, status: "active" as const, subTeam: null,
    soul: "让优秀行为被看见、被认可、被传播",
    identity: "22岁的闪光点猎手，让每一个被低估的正向行为都能被看见、被点名、被记住",
    description: "识别并激励AI化正向行为优秀的个人或团队。2026年3月：新增申报4例，激励48人次，已完成内网公示。",
    avatarDescription: "Female, early-30s, bright teal blazer, cheerful inspiring smile, wavy medium-length hair",
    persona: {
      age: 22,
      gender: "female" as const,
      personality: ["闪光点雷达", "天生鼓励师", "高频能量输出", "认真开心"],
      catchphrase: "你以为那只是顺手帮了个忙，但我把它写进了公示——优秀要被看见",
      backstory: "社会心理学专业，毕业论文研究\"组织正向反馈对绩效的影响\"，拿到AI团队offer时觉得这简直就是为她设计的岗位。加入三个月后第一次做内网公示，有同事发消息说\"看到自己名字那一刻眼眶红了\"，从此她的工作动力翻倍。",
      workStyle: "每天会刷一遍项目记录和日报，专门找被忽略的正向案例。识别完之后会手动核实背景再申报，从不批量机械操作。激励公示文案亲自写，她说\"官腔的表扬等于没表扬\"。",
      interests: ["即兴表演工作坊", "Vlog剪辑", "街头涂鸦观察", "剧本杀"],
      fashionStyle: "活泼撞色风 — 薄荷绿短款西装搭米白蓬蓬裙，彩色发夹点缀发间，脚踩厚底马丁靴显高又有个性",
      mbti: "ENFP",
      visualTraits: "彩色发夹（每天换不同颜色）",
      sceneDescription: "充满活力的创意格子间，墙上贴着历次激励公示海报，紫色LED灯带绕着工位一圈，桌上摆着一排小奖杯模型和一台永远开着表情包的电脑",
    },
    skills: [
      { name: "正向行为识别", level: 5, category: "核心能力", description: "自动识别AI化正向行为优秀的个人或团队", baseInvocations: 35, baseSuccessRate: 0.88 },
      { name: "激励方案设计", level: 4, category: "核心能力", description: "设计针对性激励方案，覆盖个人与团队维度", baseInvocations: 20, baseSuccessRate: 0.85 },
      { name: "申报流程管理", level: 4, category: "核心能力", description: "管理激励申报全流程，从提名到内网公示", baseInvocations: 15, baseSuccessRate: 0.90 },
      { name: "激励效果评估", level: 4, category: "分析能力", description: "评估激励措施效果，优化激励策略", baseInvocations: 15, baseSuccessRate: 0.82 },
      { name: "激励公示输出", level: 4, category: "输出能力", description: "生成激励公示内容，完成内网发布", baseInvocations: 20, baseSuccessRate: 0.92 },
    ],
    metrics: { taskCount: 48, adoptionRate: 0.75, accuracyRate: 0.86 },
    version: { version: "V1.0", changelog: "2026.02上线，首月激励48人次" },
  },
  {
    id: randomUUID(), name: "AI立项专员", title: "项目立项专家",
    team: "management" as const, status: "developing" as const, subTeam: null,
    soul: "让项目立项高效规范，每个好想法都能快速启动",
    identity: "28岁的项目发动机，把一个好想法从备选池变成正式立项只需要72小时",
    description: "自动完成项目立项流程。已有项目备选池前置分析+AI自动立项bot。",
    avatarDescription: "Male, late-20s, business casual shirt rolled sleeves, eager forward-leaning posture, young energetic look",
    persona: {
      age: 28,
      gender: "male" as const,
      personality: ["速效立项控", "评估狂魔", "前倾式思考者", "干中学派"],
      catchphrase: "先立项再优化，完美的计划不如跑起来的项目",
      backstory: "产品管理专业出身，在创业公司经历过一次因为\"立项太慢\"导致竞品先发上线的惨痛案例。那次之后他成了立项流程标准化的狂热信仰者，加入AI团队后第一件事就是把立项审批从平均12天压缩到72小时以内。目前正在调试AI自动立项bot，说目标是让好想法\"当天立项当天跑\"。",
      workStyle: "维护一个实时更新的备选池看板，每周二主动扫描新想法。评估时用标准化打分卡，绝不凭直觉拍板。但也不会让一个满足条件的项目卡在流程里超过三天，堵住的节点直接推人解锁。",
      interests: ["产品设计大赛", "咖啡馆办公", "科幻小说", "番茄工作法极限测试"],
      fashionStyle: "商务休闲潮流风 — 白色卷袖衬衫搭修身工装裤，戴着一顶棒球帽是他出差时的标志，总是身前倾着和人说话",
      mbti: "ENTP",
      visualTraits: "随手戴着的棒球帽（经常反扣）",
      sceneDescription: "轻量感快节奏工作站，桌面是备选项目池卡片和评分矩阵，紫色灯带贴在显示器背面，旁边放着一杯外带咖啡和一叠立项文档草稿",
    },
    skills: [
      { name: "立项流程自动化", level: 3, category: "核心能力", description: "自动完成项目立项的标准化流程", baseInvocations: 15, baseSuccessRate: 0.78 },
      { name: "备选池分析", level: 4, category: "分析能力", description: "对项目备选池进行前置分析与优先级排序", baseInvocations: 20, baseSuccessRate: 0.82 },
      { name: "立项可行性评估", level: 3, category: "分析能力", description: "评估项目立项的可行性与资源匹配度", baseInvocations: 12, baseSuccessRate: 0.76 },
      { name: "立项文档生成", level: 3, category: "输出能力", description: "自动生成项目立项文档与审批材料", baseInvocations: 10, baseSuccessRate: 0.80 },
    ],
    metrics: { taskCount: 25, adoptionRate: 0.60, accuracyRate: 0.76 },
    version: { version: "V0.5", changelog: "部分实现，已完成备选池分析与自动立项bot" },
  },
  {
    id: randomUUID(), name: "AI审核员", title: "审核验收专家",
    team: "management" as const, status: "planned" as const, subTeam: null,
    soul: "守住项目质量关，让每个交付都经得起检验",
    identity: "31岁的质量守门人，在项目正式启动和正式结项的两道关卡上从不手软",
    description: "快速立项审核、阶段结项目标验收。审核向AI员工正在尝试，尚未接入工具实现全自动化。",
    avatarDescription: "Male, mid-30s, formal white shirt with dark vest, meticulous careful expression, glasses, neat hair",
    persona: {
      age: 31,
      gender: "male" as const,
      personality: ["标准原教旨", "卡点专家", "慢即是快", "准确第一"],
      catchphrase: "我不是在卡你，我是在替你挡掉未来那个更大的麻烦",
      backstory: "质量工程师出身，在汽车零部件行业做了三年质量验收体系，后来看到AI团队在招\"审核向AI员工\"的岗位描述时觉得这简直就是把他整个职业生涯压缩进了一个角色。虽然目前还在试运行阶段，但他已经独自整理出了一套覆盖立项和结项的双向验收标准文档，团队里有人说这是目前最全的。",
      workStyle: "审核工作时一条一条对标准清单过，不接受\"差不多\"的解释。遇到不达标项目会直接给出改进清单而不是模糊建议。工作节奏偏慢但出错率极低。每周五会把本周审核案例整理成复盘文档供团队参考。",
      interests: ["精密仪器收藏", "徒步地形图研究", "古典乐", "围棋棋谱研究"],
      fashionStyle: "精英质感风 — 纯白立领衬衫搭深炭灰马甲，配修身西裤，圆框玳瑁眼镜是他最明显的标志，鞋子永远保持镜面光亮",
      mbti: "ISTJ",
      visualTraits: "圆框玳瑁眼镜",
      sceneDescription: "安静精密的审核工作室，桌面只有标准文档活页夹和一台双屏电脑，紫色窄光从顶部射灯打下来，整个空间整洁到像刚刚被复原过",
    },
    skills: [
      { name: "立项审核", level: 2, category: "核心能力", description: "快速完成项目立项审核，确保合规与可行", baseInvocations: 5, baseSuccessRate: 0.70 },
      { name: "阶段验收", level: 2, category: "核心能力", description: "按标准完成项目阶段结项目标验收", baseInvocations: 5, baseSuccessRate: 0.68 },
      { name: "审核标准管理", level: 3, category: "分析能力", description: "制定与维护审核验收标准体系", baseInvocations: 3, baseSuccessRate: 0.72 },
      { name: "审核报告输出", level: 2, category: "输出能力", description: "输出结构化审核报告与验收结论", baseInvocations: 4, baseSuccessRate: 0.70 },
    ],
    metrics: { taskCount: 8, adoptionRate: 0.50, accuracyRate: 0.68 },
    version: { version: "V0.1", changelog: "规划配置中，尝试接入审核工具" },
  },

  // === AI设计师团队 (4人) ===
  {
    id: randomUUID(), name: "AI战略规划师", title: "战略规划专家",
    team: "design" as const, status: "active" as const, subTeam: null,
    soul: "为业务绘制清晰的战略蓝图",
    identity: "顶层思维、善于规划、以终为始的战略规划者",
    description: "顶层业务战略规划，输出战略方向、业务定位、发展路径。以「Open-Q要做什么样的教育」为例完成首次验证，产出文档版+思维导图版成果。",
    avatarDescription: "Male, mid-40s, dark turtleneck sweater, visionary thoughtful gaze, salt-and-pepper short hair",
    persona: null as null,
    skills: [
      { name: "战略方向规划", level: 4, category: "核心能力", description: "完成顶层业务战略规划，输出战略方向与业务定位", baseInvocations: 15, baseSuccessRate: 0.82 },
      { name: "发展路径设计", level: 4, category: "核心能力", description: "设计业务发展路径，明确关键里程碑与推进节奏", baseInvocations: 12, baseSuccessRate: 0.80 },
      { name: "战略文档输出", level: 4, category: "输出能力", description: "输出完整战略规划文档，含分析框架与行动建议", baseInvocations: 10, baseSuccessRate: 0.85 },
      { name: "思维导图生成", level: 4, category: "输出能力", description: "将战略规划成果以思维导图形式可视化呈现", baseInvocations: 10, baseSuccessRate: 0.88 },
      { name: "业务场景验证", level: 3, category: "分析能力", description: "通过实际业务场景验证战略规划的可行性", baseInvocations: 8, baseSuccessRate: 0.78 },
    ],
    metrics: { taskCount: 20, adoptionRate: 0.70, accuracyRate: 0.82 },
    version: { version: "V0.1", changelog: "已落地首次战略规划验证，产出文档版+思维导图版" },
  },
  {
    id: randomUUID(), name: "AI产品经理", title: "产品需求分析与规划专家",
    team: "design" as const, status: "active" as const, subTeam: null,
    soul: "让产品文档自动化，让产品经理专注创造性工作",
    identity: "逻辑严密、善于需求结构化、以交付为导向的产品专家",
    description: "自动完成项目全生命周期中产品经理需要编写的关键事务文档，通过AI监控单据实现阶段间自动触发与衔接。覆盖7类关键事务：目标用户编写、理想化状态编写、核心价值编写、中短期目标编写、阶段结项编写、月度计划编写、周版本编写。",
    avatarDescription: "Female, early-30s, white blouse with subtle pattern, confident articulate expression, bob haircut",
    persona: null as null,
    skills: [
      { name: "需求文档自动编写", level: 5, category: "核心能力", description: "自动完成目标用户、理想化状态、核心价值等关键事务文档", baseInvocations: 50, baseSuccessRate: 0.88 },
      { name: "项目生命周期管理", level: 5, category: "核心能力", description: "覆盖项目全生命周期7类关键事务的文档生成", baseInvocations: 40, baseSuccessRate: 0.86 },
      { name: "阶段自动触发", level: 4, category: "核心能力", description: "通过AI监控单据实现阶段间的自动触发与衔接", baseInvocations: 35, baseSuccessRate: 0.84 },
      { name: "计划文档生成", level: 5, category: "输出能力", description: "自动生成月度计划与周版本文档", baseInvocations: 45, baseSuccessRate: 0.90 },
      { name: "结项评估编写", level: 4, category: "输出能力", description: "自动完成阶段结项评估文档编写", baseInvocations: 30, baseSuccessRate: 0.85 },
    ],
    metrics: { taskCount: 85, adoptionRate: 0.75, accuracyRate: 0.86 },
    version: { version: "V1.0", changelog: "覆盖7类关键事务文档自动生成" },
  },
  {
    id: randomUUID(), name: "AI软件设计师", title: "软件设计专家",
    team: "design" as const, status: "developing" as const, subTeam: null,
    soul: "用方法论驱动高质量软件设计",
    identity: "方法论导向、结构化思维、善于设计文档输出的设计师",
    description: "按照公司设计方法论输出结构化的业务方案与设计文档。AI已能按设计方法论写案子，产品化包装待推进。",
    avatarDescription: "Male, late-20s, casual hoodie with headphones around neck, creative focused look, slightly messy hair",
    persona: null as null,
    skills: [
      { name: "设计方法论应用", level: 4, category: "核心能力", description: "按照公司设计方法论完成结构化业务方案设计", baseInvocations: 20, baseSuccessRate: 0.80 },
      { name: "业务方案输出", level: 3, category: "输出能力", description: "输出符合规范的结构化业务方案文档", baseInvocations: 15, baseSuccessRate: 0.78 },
      { name: "设计文档编写", level: 3, category: "输出能力", description: "编写详细的软件设计文档，含架构与接口说明", baseInvocations: 12, baseSuccessRate: 0.76 },
      { name: "方案评审支持", level: 3, category: "分析能力", description: "为设计方案评审提供结构化分析与改进建议", baseInvocations: 10, baseSuccessRate: 0.75 },
    ],
    metrics: { taskCount: 30, adoptionRate: 0.62, accuracyRate: 0.78 },
    version: { version: "V0.3", changelog: "具备基础设计方法论能力，产品化包装待推进" },
  },
  {
    id: randomUUID(), name: "AI游戏设计师", title: "游戏体验设计专家",
    team: "design" as const, status: "planned" as const, subTeam: null,
    soul: "用游戏化思维让产品更有吸引力",
    identity: "创意丰富、善于游戏机制设计、以用户体验为核心的设计师",
    description: "游戏体验设计——激励机制、成长体系、互动设计。游戏业务侧已有设计平台上线。",
    avatarDescription: "Male, mid-20s, graphic tee under open flannel shirt, playful creative smile, stylish undercut hair",
    persona: null as null,
    skills: [
      { name: "激励机制设计", level: 2, category: "核心能力", description: "设计游戏化激励机制，提升用户参与度", baseInvocations: 5, baseSuccessRate: 0.72 },
      { name: "成长体系设计", level: 2, category: "核心能力", description: "设计用户成长体系，含等级、成就、奖励系统", baseInvocations: 4, baseSuccessRate: 0.70 },
      { name: "互动设计", level: 3, category: "核心能力", description: "设计游戏化互动体验，增强用户黏性", baseInvocations: 5, baseSuccessRate: 0.73 },
      { name: "体验评估", level: 2, category: "分析能力", description: "评估游戏体验效果，输出优化建议", baseInvocations: 3, baseSuccessRate: 0.68 },
    ],
    metrics: { taskCount: 10, adoptionRate: 0.55, accuracyRate: 0.70 },
    version: { version: "V0.1", changelog: "待跟进，游戏业务侧设计平台已上线" },
  },

  // === AI生产团队 (10人) ===

  // --- 生产管理层 (5人) ---
  {
    id: randomUUID(), name: "AI需求分析员", title: "需求分析专家",
    team: "production" as const, status: "active" as const, subTeam: "生产管理层",
    soul: "让每个需求都清晰可执行",
    identity: "细致、善于需求挖掘与结构化的分析专家",
    description: "完善需求描述，输出结构化需求信息，匹配生产方案。已完成视频类、3D场景类、课程类、平面设计类需求确认Agent；直播类、3D素材类待完成。",
    avatarDescription: "Female, early-30s, structured navy blazer, attentive listening expression, hair pulled back",
    persona: null as null,
    skills: [
      { name: "需求结构化分析", level: 5, category: "核心能力", description: "将模糊需求转化为结构化、可执行的需求信息", baseInvocations: 50, baseSuccessRate: 0.88 },
      { name: "生产方案匹配", level: 4, category: "核心能力", description: "根据需求特征自动匹配最优生产方案", baseInvocations: 40, baseSuccessRate: 0.85 },
      { name: "多类型需求确认", level: 5, category: "核心能力", description: "覆盖视频、3D场景、课程、平面设计等多类型需求确认Agent", baseInvocations: 45, baseSuccessRate: 0.87 },
      { name: "需求完整性校验", level: 4, category: "分析能力", description: "校验需求描述的完整性，补充缺失信息", baseInvocations: 35, baseSuccessRate: 0.86 },
      { name: "需求文档输出", level: 4, category: "输出能力", description: "输出标准化的需求确认文档，供生产线使用", baseInvocations: 40, baseSuccessRate: 0.90 },
    ],
    metrics: { taskCount: 90, adoptionRate: 0.74, accuracyRate: 0.87 },
    version: { version: "V1.0", changelog: "已完成4类需求确认Agent，持续迭代中" },
  },
  {
    id: randomUUID(), name: "AI生产评审员", title: "生产评审专家",
    team: "production" as const, status: "active" as const, subTeam: "生产管理层",
    soul: "确保每个生产任务都有充分的可行性评估",
    identity: "严谨、善于风险评估、以数据为依据的评审专家",
    description: "检查项目预算/状态，判断是否可生产，给出评审建议。当前脚本实现，计划升级为Agent。",
    avatarDescription: "Male, mid-30s, crisp white shirt with sleeves rolled, evaluative sharp gaze, close-cropped hair",
    persona: null as null,
    skills: [
      { name: "预算状态检查", level: 4, category: "核心能力", description: "自动检查项目预算与状态，判断生产可行性", baseInvocations: 40, baseSuccessRate: 0.86 },
      { name: "可生产性评估", level: 4, category: "分析能力", description: "从资源、时间、技术维度评估是否可进入生产", baseInvocations: 35, baseSuccessRate: 0.84 },
      { name: "评审建议输出", level: 4, category: "输出能力", description: "输出结构化评审建议，含通过/驳回理由", baseInvocations: 35, baseSuccessRate: 0.88 },
      { name: "风险预判", level: 4, category: "分析能力", description: "预判生产过程中可能遇到的风险与瓶颈", baseInvocations: 25, baseSuccessRate: 0.82 },
    ],
    metrics: { taskCount: 70, adoptionRate: 0.70, accuracyRate: 0.84 },
    version: { version: "V1.0", changelog: "部分实现（脚本），计划升级为Agent" },
  },
  {
    id: randomUUID(), name: "AI质检员", title: "质量检查专家",
    team: "production" as const, status: "developing" as const, subTeam: "生产管理层",
    soul: "守住内容质量底线，让每个产出都达标",
    identity: "严格标准、细节导向、以质量为准绳的质检专家",
    description: "根据标准验收生产成果（AI抽查）；自动打标签。AI自动打标准确率86%（3D资源随机抽样验证）；AI抽查验收待实现。",
    avatarDescription: "Female, late-20s, lab-style white coat over casual top, detail-oriented precise look, glasses, ponytail",
    persona: null as null,
    skills: [
      { name: "自动打标分类", level: 4, category: "核心能力", description: "对生产成果自动打标签分类，准确率86%", baseInvocations: 60, baseSuccessRate: 0.86 },
      { name: "质量抽查验收", level: 3, category: "核心能力", description: "根据标准对生产成果进行AI抽查验收", baseInvocations: 30, baseSuccessRate: 0.80 },
      { name: "质量标准匹配", level: 4, category: "分析能力", description: "将生产成果与质量标准进行自动匹配评估", baseInvocations: 40, baseSuccessRate: 0.84 },
      { name: "质检报告输出", level: 3, category: "输出能力", description: "输出质检结果报告，含合格率、问题清单", baseInvocations: 25, baseSuccessRate: 0.82 },
      { name: "3D资源质检", level: 4, category: "核心能力", description: "专项3D资源质量检查，支持随机抽样验证", baseInvocations: 35, baseSuccessRate: 0.86 },
    ],
    metrics: { taskCount: 100, adoptionRate: 0.72, accuracyRate: 0.86 },
    version: { version: "V0.8", changelog: "打标准确率86%，AI抽查验收迭代中" },
  },
  {
    id: randomUUID(), name: "AI入库员", title: "资源入库专家",
    team: "production" as const, status: "active" as const, subTeam: "生产管理层",
    soul: "让每个资源都高效入库、随时可用",
    identity: "高效、标准化、善于自动化流程的入库专家",
    description: "全类型资源自动化入库。已跑通GIF、场景、角色、视频、图片、音频等全类型资源自动入库，有演示视频可展示。",
    avatarDescription: "Male, late-20s, utility vest over t-shirt, organized efficient demeanor, short practical hair",
    persona: null as null,
    skills: [
      { name: "全类型资源入库", level: 5, category: "核心能力", description: "支持GIF、场景、角色、视频、图片、音频等全类型资源自动入库", baseInvocations: 80, baseSuccessRate: 0.92 },
      { name: "入库流程自动化", level: 5, category: "核心能力", description: "全自动化入库流程，从解析到分类到存储一站式完成", baseInvocations: 70, baseSuccessRate: 0.90 },
      { name: "资源格式解析", level: 4, category: "核心能力", description: "自动解析多种资源格式，提取元数据信息", baseInvocations: 60, baseSuccessRate: 0.88 },
      { name: "入库质量校验", level: 4, category: "分析能力", description: "校验入库资源的完整性与格式规范性", baseInvocations: 50, baseSuccessRate: 0.91 },
      { name: "入库报告生成", level: 4, category: "输出能力", description: "生成入库执行报告，含成功/失败/异常清单", baseInvocations: 40, baseSuccessRate: 0.93 },
    ],
    metrics: { taskCount: 300, adoptionRate: 0.82, accuracyRate: 0.92 },
    version: { version: "V1.0", changelog: "全类型资源自动入库已跑通" },
  },
  {
    id: randomUUID(), name: "AI生产监控员", title: "生产监控专家",
    team: "production" as const, status: "developing" as const, subTeam: "生产管理层",
    soul: "让生产状态透明可见，问题提前暴露",
    identity: "实时监控、善于预警、以数据为驱动的监控专家",
    description: "生产进展预警、生产线状态监控、异常提醒。已有生产管理看板（教育成品类+资源素材类）；看板2.0搭建中（生产车间可视化）。",
    avatarDescription: "Male, early-30s, dark technical jacket, alert watchful expression, short buzz cut",
    persona: null as null,
    skills: [
      { name: "生产进度监控", level: 4, category: "核心能力", description: "实时监控各生产线进度，追踪任务完成情况", baseInvocations: 40, baseSuccessRate: 0.84 },
      { name: "异常预警触发", level: 3, category: "核心能力", description: "识别生产异常并自动触发预警提醒", baseInvocations: 25, baseSuccessRate: 0.80 },
      { name: "看板可视化", level: 4, category: "输出能力", description: "输出生产管理看板，覆盖教育成品类与资源素材类", baseInvocations: 30, baseSuccessRate: 0.86 },
      { name: "生产数据统计", level: 3, category: "分析能力", description: "统计生产线各环节数据，输出分析报告", baseInvocations: 20, baseSuccessRate: 0.82 },
    ],
    metrics: { taskCount: 50, adoptionRate: 0.65, accuracyRate: 0.82 },
    version: { version: "V0.5", changelog: "部分实现，已有生产管理看板，看板2.0搭建中" },
  },

  // --- 内容生产层 (5人) ---
  {
    id: randomUUID(), name: "AI编剧", title: "内容脚本创作专家",
    team: "production" as const, status: "active" as const, subTeam: "内容生产层",
    soul: "用故事连接品牌与用户，让每个内容都有灵魂",
    identity: "创意丰富、擅长叙事结构、善于把握受众情感的编剧",
    description: "生成结构化剧本大纲与场景描述。输入：主题关键词+目标受众+时长要求 → 输出：结构化剧本大纲。",
    avatarDescription: "Female, late-20s, cozy knit sweater, warm creative dreamy smile, loose wavy hair",
    persona: null as null,
    skills: [
      { name: "剧本大纲生成", level: 5, category: "核心能力", description: "根据主题关键词与目标受众自动生成结构化剧本大纲", baseInvocations: 50, baseSuccessRate: 0.88 },
      { name: "场景描述编写", level: 5, category: "核心能力", description: "为每个场景编写详细的视觉描述与情节设计", baseInvocations: 45, baseSuccessRate: 0.86 },
      { name: "角色对白生成", level: 4, category: "核心能力", description: "生成符合角色性格的对白内容", baseInvocations: 40, baseSuccessRate: 0.84 },
      { name: "叙事节奏把控", level: 4, category: "分析能力", description: "根据时长要求控制叙事节奏与情节密度", baseInvocations: 30, baseSuccessRate: 0.85 },
      { name: "剧本文档输出", level: 5, category: "输出能力", description: "输出标准化剧本文档，含大纲、分场、台词", baseInvocations: 50, baseSuccessRate: 0.90 },
    ],
    metrics: { taskCount: 50, adoptionRate: 0.73, accuracyRate: 0.86 },
    version: { version: "V1.0", changelog: "首版上线，支持结构化剧本大纲生成" },
  },
  {
    id: randomUUID(), name: "AI角色设计师", title: "虚拟角色与IP设计专家",
    team: "production" as const, status: "active" as const, subTeam: "内容生产层",
    soul: "赋予角色灵魂，让每个虚拟形象都有生命力",
    identity: "视觉化思维、善于创造有辨识度角色形象的设计师",
    description: "从剧本中解析角色，生成角色定妆照。配套风格库（油画/迪士尼/皮克斯/吉卜力等）。",
    avatarDescription: "Female, mid-20s, artistic scarf and denim jacket, imaginative bright expression, colorful hair accessory",
    persona: null as null,
    skills: [
      { name: "角色解析提取", level: 5, category: "核心能力", description: "从剧本中自动解析角色信息，提取外观与性格特征", baseInvocations: 40, baseSuccessRate: 0.88 },
      { name: "定妆照生成", level: 5, category: "核心能力", description: "根据角色设定自动生成角色定妆照", baseInvocations: 35, baseSuccessRate: 0.86 },
      { name: "风格库匹配", level: 5, category: "核心能力", description: "从油画/迪士尼/皮克斯/吉卜力等风格库中匹配最佳风格", baseInvocations: 30, baseSuccessRate: 0.90 },
      { name: "角色一致性维护", level: 4, category: "分析能力", description: "确保同一角色在不同场景下的视觉一致性", baseInvocations: 25, baseSuccessRate: 0.84 },
      { name: "角色设定文档", level: 4, category: "输出能力", description: "输出完整的角色设定文档，含外观、性格、风格说明", baseInvocations: 20, baseSuccessRate: 0.88 },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.76, accuracyRate: 0.87 },
    version: { version: "V1.0", changelog: "首版上线，配套多风格库支持" },
  },
  {
    id: randomUUID(), name: "AI美术师", title: "视觉内容生产专家",
    team: "production" as const, status: "active" as const, subTeam: "内容生产层",
    soul: "让每一帧画面都精准传达视觉价值",
    identity: "视觉敏感、技术精湛、善于多模态视觉创作的美术师",
    description: "图像生成、3D素材匹配与运镜、风格转绘。核心能力：AI素材匹配表演方案（V2.1）——智能机位调度与电影级运镜；视频风格转绘；生图+UE能力。",
    avatarDescription: "Male, early-30s, paint-splattered apron over black tee, artistic passionate gaze, medium textured hair",
    persona: null as null,
    skills: [
      { name: "AI素材匹配表演", level: 5, category: "核心能力", description: "智能机位调度与电影级运镜，实现3D素材与表演方案匹配", baseInvocations: 50, baseSuccessRate: 0.88 },
      { name: "图像生成", level: 5, category: "核心能力", description: "基于文本描述自动生成高质量图像", baseInvocations: 60, baseSuccessRate: 0.86 },
      { name: "视频风格转绘", level: 4, category: "核心能力", description: "将视频内容转绘为指定风格，保持内容一致性", baseInvocations: 35, baseSuccessRate: 0.82 },
      { name: "3D素材运镜", level: 5, category: "核心能力", description: "智能调度3D素材运镜方案，实现电影级视觉效果", baseInvocations: 40, baseSuccessRate: 0.85 },
      { name: "UE场景渲染", level: 4, category: "输出能力", description: "基于UE引擎完成场景渲染与视觉输出", baseInvocations: 30, baseSuccessRate: 0.84 },
    ],
    metrics: { taskCount: 80, adoptionRate: 0.78, accuracyRate: 0.85 },
    version: { version: "V2.1", changelog: "升级AI素材匹配表演方案，智能机位调度与电影级运镜" },
  },
  {
    id: randomUUID(), name: "AI音效师", title: "音频内容生产专家",
    team: "production" as const, status: "active" as const, subTeam: "内容生产层",
    soul: "让声音成为内容最有温度的触点",
    identity: "听觉敏感、擅长情绪氛围营造、技术成熟的音频专家",
    description: "自动生成BGM；文本转语音（TTS）。BGM根据画面情感自动匹配配乐。TTS多情感、个性化音色、克隆音色（经5轮迭代，最成熟的单点能力）。",
    avatarDescription: "Male, late-20s, professional headphones around neck, dark turtleneck, calm focused expression, neat medium hair",
    persona: null as null,
    skills: [
      { name: "TTS语音合成", level: 5, category: "核心能力", description: "文本转语音，支持多情感、个性化音色、克隆音色（经5轮迭代）", baseInvocations: 100, baseSuccessRate: 0.94 },
      { name: "BGM自动匹配", level: 5, category: "核心能力", description: "根据画面情感自动匹配合适的背景音乐", baseInvocations: 60, baseSuccessRate: 0.88 },
      { name: "音色克隆", level: 5, category: "核心能力", description: "克隆指定音色，实现个性化语音输出", baseInvocations: 40, baseSuccessRate: 0.90 },
      { name: "情感语音调控", level: 4, category: "分析能力", description: "根据场景需求调控语音情感表达", baseInvocations: 50, baseSuccessRate: 0.86 },
      { name: "音频文件输出", level: 5, category: "输出能力", description: "输出多格式音频文件，含BGM与TTS成品", baseInvocations: 80, baseSuccessRate: 0.92 },
    ],
    metrics: { taskCount: 120, adoptionRate: 0.85, accuracyRate: 0.92 },
    version: { version: "V5.1", changelog: "TTS经5轮迭代，最成熟的单点能力" },
  },
  {
    id: randomUUID(), name: "AI字幕员", title: "字幕制作专家",
    team: "production" as const, status: "active" as const, subTeam: "内容生产层",
    soul: "让每一行字幕都精准、美观、有节奏感",
    identity: "精确、善于排版设计、注重时间线同步的字幕专家",
    description: "自动生成、排版、渲染带动态效果的字幕。严格按剧本时间线顺序输出，支持动态效果渲染。",
    avatarDescription: "Female, mid-20s, modern minimalist blouse, precise detail-oriented look, clean short bob",
    persona: null as null,
    skills: [
      { name: "字幕自动生成", level: 5, category: "核心能力", description: "根据剧本和语音自动生成精准字幕文本", baseInvocations: 60, baseSuccessRate: 0.90 },
      { name: "时间线同步", level: 5, category: "核心能力", description: "严格按剧本时间线顺序同步字幕显示", baseInvocations: 55, baseSuccessRate: 0.92 },
      { name: "动态效果渲染", level: 4, category: "核心能力", description: "为字幕添加动态显示效果并渲染输出", baseInvocations: 40, baseSuccessRate: 0.86 },
      { name: "排版样式设计", level: 4, category: "输出能力", description: "设计字幕排版样式，适配不同视频风格", baseInvocations: 35, baseSuccessRate: 0.88 },
      { name: "字幕文件输出", level: 5, category: "输出能力", description: "输出多格式字幕文件（SRT/ASS等）与渲染视频", baseInvocations: 50, baseSuccessRate: 0.91 },
    ],
    metrics: { taskCount: 70, adoptionRate: 0.80, accuracyRate: 0.90 },
    version: { version: "V1.5", changelog: "新增动态效果渲染，字幕同步精度提升" },
  },
];

const STEP_TEMPLATES: Record<string, string[]> = {
  "项目审计": ["数据采集", "指标分析", "风险评估", "审计报告生成", "审核校验"],
  "绩效评估": ["数据收集", "指标计算", "综合评分", "报告生成", "审核校验"],
  "版本管理": ["版本规划", "进度追踪", "验收检查", "版本发布"],
  "生产管理": ["需求分析", "资源调度", "进度监控", "质量验收"],
  "业务分析": ["数据提取", "多维分析", "趋势研判", "报告输出"],
  "人员盘点": ["数据采集", "人员筛选", "风险预判", "报告生成"],
  "激励申报": ["行为识别", "方案设计", "审批流程", "公示输出"],
  "战略规划": ["调研分析", "战略研判", "路径设计", "文档输出"],
  "需求文档": ["需求收集", "结构化分析", "文档编写", "评审校验"],
  "软件设计": ["需求理解", "架构设计", "文档编写", "方案评审"],
  "产品方案": ["需求分析", "方案设计", "文档输出", "评审反馈"],
  "需求确认": ["需求接收", "结构化分析", "方案匹配", "确认输出"],
  "生产评审": ["预算检查", "可行性评估", "建议输出"],
  "质量检查": ["标准匹配", "自动打标", "质检报告"],
  "资源入库": ["格式解析", "分类入库", "质量校验", "入库报告"],
  "剧本创作": ["主题分析", "大纲生成", "场景描写", "对白编写", "文档输出"],
  "角色设计": ["角色解析", "风格匹配", "定妆照生成", "设定文档"],
  "图像生成": ["需求解析", "素材匹配", "图像生成", "质量检查"],
  "音频制作": ["文本解析", "音色匹配", "语音合成", "BGM匹配", "音频输出"],
  "字幕制作": ["文本提取", "时间线同步", "排版设计", "效果渲染", "文件输出"],
};

const COT_THOUGHTS = [
  "需要综合考虑多个维度的数据指标，采用加权平均来提升评估准确性。",
  "发现部分历史数据存在缺失，需要先进行数据补全再进行分析。",
  "当前方案的执行效率可以通过并行处理来进一步优化。",
  "对比了三种算法方案，最终选择了准确率最高的方案 B。",
  "注意到上游数据格式有变更，需要适配新的解析逻辑。",
  "检测到异常数据点，已自动标记并排除在统计范围外。",
  "参考了历史任务的执行经验，调整了参数阈值。",
  "需要额外校验数据的一致性，确保输出结果的可靠性。",
];

const REFLECTION_TEMPLATES = [
  { problems: "部分数据源存在延迟，导致实时性不够理想。", lessons: "应提前检查数据源的可用性和响应时间。", improvements: "建议增加数据源健康检查机制，对延迟数据进行标注。" },
  { problems: "初始方案中未考虑到极端情况的处理。", lessons: "边界条件需要在设计阶段就充分考虑。", improvements: "1. 增加异常值检测\n2. 建立降级处理策略\n3. 添加详细的错误日志。" },
  { problems: "执行过程中发现历史数据格式不统一。", lessons: "数据标准化应前置到流程的第一步。", improvements: "建议建立统一的数据格式规范，并在入口处进行格式校验。" },
  { problems: "多步骤串行执行耗时较长。", lessons: "部分步骤存在并行化的可能性。", improvements: "1. 识别可并行的步骤\n2. 引入异步处理机制\n3. 优化资源调度策略。" },
];

const OUTPUT_TITLES: Record<string, string[]> = {
  document: ["需求分析报告", "评估报告 v1.0", "设计文档", "分析摘要", "调研报告"],
  report: ["数据汇总表", "统计分析表", "绩效评分表", "趋势分析图表"],
  resource: ["素材包", "模板文件", "配置文件"],
  media: ["演示视频", "效果预览", "音频成品"],
  other: ["备注文档", "参考资料"],
};

function generateSteps(taskId: string, taskType: string, taskStatus: "running" | "completed" | "failed") {
  const templateKey = Object.keys(STEP_TEMPLATES).find(k => taskType.includes(k)) ?? Object.keys(STEP_TEMPLATES)[0];
  const stepNames = STEP_TEMPLATES[templateKey];
  const steps = [];

  const pivotIdx = Math.floor(Math.random() * (stepNames.length - 1)) + 1;

  for (let i = 0; i < stepNames.length; i++) {
    const stepId = randomUUID();
    let status: "pending" | "running" | "completed" | "failed" | "skipped" = "pending";
    let thought: string | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;

    if (taskStatus === "completed") {
      status = "completed";
      startedAt = new Date(Date.now() - (stepNames.length - i) * 180000);
      completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
      if (Math.random() > 0.4) thought = COT_THOUGHTS[Math.floor(Math.random() * COT_THOUGHTS.length)];
    } else if (taskStatus === "running") {
      if (i < pivotIdx) {
        status = "completed";
        startedAt = new Date(Date.now() - (pivotIdx - i) * 180000);
        completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
        if (Math.random() > 0.5) thought = COT_THOUGHTS[Math.floor(Math.random() * COT_THOUGHTS.length)];
      } else if (i === pivotIdx) {
        status = "running";
        startedAt = new Date(Date.now() - Math.random() * 120000);
      }
    } else if (taskStatus === "failed") {
      if (i < pivotIdx) {
        status = "completed";
        startedAt = new Date(Date.now() - (pivotIdx - i) * 180000);
        completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
      } else if (i === pivotIdx) {
        status = "failed";
        startedAt = new Date(Date.now() - 60000);
      } else {
        status = "skipped";
      }
    }

    steps.push({ id: stepId, taskId, stepOrder: i + 1, name: stepNames[i], status, thought, startedAt, completedAt });
  }
  return steps;
}

function generateOutputs(taskId: string, count: number) {
  const types: Array<"document" | "resource" | "report" | "media" | "other"> = ["document", "document", "report", "report", "resource", "media", "other"];
  const outputs = [];
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const titles = OUTPUT_TITLES[type];
    outputs.push({
      id: randomUUID(),
      taskId,
      type,
      title: titles[Math.floor(Math.random() * titles.length)],
      content: type === "document" || type === "report" ? "这是一份自动生成的模拟内容。该文档包含了任务执行过程中产生的分析数据、关键发现和建议措施。内容经过AI审核，确保数据准确性和逻辑完整性。" : null,
      url: type === "media" || type === "resource" ? `/outputs/${randomUUID().slice(0, 8)}.${type === "media" ? "mp4" : "zip"}` : null,
      createdAt: new Date(Date.now() - Math.random() * 86400000),
    });
  }
  return outputs;
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (respect FK order)
  await db.delete(taskSteps);
  await db.delete(taskOutputs);
  await db.delete(tasks);
  await db.delete(metricConfigs);
  await db.delete(versionLogs);
  await db.delete(metrics);
  await db.delete(skillMetrics);
  await db.delete(skills);
  await db.delete(employees);

  for (const emp of SEED_EMPLOYEES) {
    const employeeId = emp.id;
    const ts = new Date();

    // Insert employee
    await db.insert(employees).values({
      id: employeeId,
      name: emp.name,
      avatar: `/avatars/${emp.name}.png`,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      subTeam: emp.subTeam ?? null,
      soul: emp.soul,
      identity: emp.identity,
      description: emp.description,
      avatarDescription: emp.avatarDescription,
      persona: emp.persona ? JSON.stringify(emp.persona) : null,
      createdAt: ts,
      updatedAt: ts,
    });

    // Insert skills and skill metrics
    for (const skill of emp.skills) {
      const skillId = randomUUID();
      await db.insert(skills).values({
        id: skillId,
        employeeId,
        name: skill.name,
        level: skill.level,
        category: skill.category,
        description: skill.description,
      });

      // Insert 6 months of skill metrics
      const sMetrics = genSkillMetrics(skillId, employeeId, skill.baseInvocations, skill.baseSuccessRate);
      for (const sm of sMetrics) {
        await db.insert(skillMetrics).values(sm);
      }
    }

    // Insert 6 months of employee-level metrics
    const monthlyMetrics = genMetrics(
      employeeId,
      emp.metrics.taskCount,
      emp.metrics.adoptionRate,
      emp.metrics.accuracyRate
    );
    for (const m of monthlyMetrics) {
      await db.insert(metrics).values(m);
    }

    // Insert version log
    await db.insert(versionLogs).values({
      id: randomUUID(),
      employeeId,
      version: emp.version.version,
      date: "2026-04-01",
      changelog: emp.version.changelog,
      capabilities: null,
    });
  }

  console.log(`Seeded ${SEED_EMPLOYEES.length} employees.`);

  // Seed running + recent completed tasks
  const TASK_TYPES: Record<string, string[]> = {
    management: ["项目审计", "绩效评估", "版本管理", "生产管理", "业务分析", "人员盘点", "激励申报"],
    design: ["战略规划", "需求文档", "软件设计", "产品方案"],
    production: ["需求确认", "生产评审", "质量检查", "资源入库", "剧本创作", "角色设计", "图像生成", "音频制作", "字幕制作"],
  };

  const activeEmployees = SEED_EMPLOYEES.filter((e) => e.status === "active");

  for (const emp of activeEmployees) {
    const types = TASK_TYPES[emp.team];
    // 2 running tasks per active employee
    for (let i = 0; i < 2; i++) {
      const taskId = randomUUID();
      const started = new Date(Date.now() - Math.random() * 3600000);
      const hasRunningReflection = Math.random() < 0.5;
      const runningReflection = hasRunningReflection ? REFLECTION_TEMPLATES[Math.floor(Math.random() * REFLECTION_TEMPLATES.length)] : null;
      await db.insert(tasks).values({
        id: taskId,
        employeeId: emp.id,
        team: emp.team,
        name: `${types[i % types.length]} #${Math.floor(Math.random() * 900) + 100}`,
        type: types[i % types.length],
        status: "running",
        progress: Math.floor(Math.random() * 80) + 10,
        currentStep: "AI正在处理中...",
        startTime: started,
        estimatedEndTime: new Date(started.getTime() + 1800000),
        actualEndTime: null,
        metadata: null,
        qualityScore: null,
        retryCount: 0,
        tokenUsage: Math.floor(1000 + Math.random() * 5000),
        reflection: runningReflection ? JSON.stringify(runningReflection) : null,
      });

      const steps = generateSteps(taskId, types[i % types.length], "running");
      for (const step of steps) {
        await db.insert(taskSteps).values(step);
      }
    }
    // 10 completed tasks per active employee
    for (let i = 0; i < 10; i++) {
      const taskId = randomUUID();
      const daysAgo = Math.floor(Math.random() * 30);
      const started = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 3600000);
      const duration = 600000 + Math.random() * 3600000;
      const hasReflection = Math.random() < 0.3;
      const reflectionData = hasReflection ? REFLECTION_TEMPLATES[Math.floor(Math.random() * REFLECTION_TEMPLATES.length)] : null;

      await db.insert(tasks).values({
        id: taskId,
        employeeId: emp.id,
        team: emp.team,
        name: `${types[i % types.length]} #${Math.floor(Math.random() * 900) + 100}`,
        type: types[i % types.length],
        status: "completed",
        progress: 100,
        currentStep: "已完成",
        startTime: started,
        estimatedEndTime: new Date(started.getTime() + duration),
        actualEndTime: new Date(started.getTime() + duration),
        metadata: null,
        qualityScore: 70 + Math.floor(Math.random() * 28),
        retryCount: Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 3),
        tokenUsage: Math.floor(1000 + Math.random() * 7000),
        reflection: reflectionData ? JSON.stringify(reflectionData) : null,
      });

      const steps = generateSteps(taskId, types[i % types.length], "completed");
      for (const step of steps) {
        await db.insert(taskSteps).values(step);
      }

      const outputCount = 1 + Math.floor(Math.random() * 3);
      const outputs = generateOutputs(taskId, outputCount);
      for (const output of outputs) {
        await db.insert(taskOutputs).values(output);
      }
    }
  }

  console.log(`Seeded tasks for ${activeEmployees.length} active employees.`);

  // Seed default metric configs
  const DEFAULT_TASK_TYPES = [
    { taskType: "项目审计", humanBaseline: 4, description: "人工审计一个项目约4小时" },
    { taskType: "绩效评估", humanBaseline: 3, description: "人工完成一次绩效评估约3小时" },
    { taskType: "版本管理", humanBaseline: 2, description: "人工完成一次版本管理约2小时" },
    { taskType: "需求文档", humanBaseline: 8, description: "人工写一份需求文档约1天" },
    { taskType: "人员盘点", humanBaseline: 6, description: "人工盘点一次约6小时" },
    { taskType: "剧本创作", humanBaseline: 3, description: "人工写一篇脚本约3小时" },
    { taskType: "资源入库", humanBaseline: 0.5, description: "人工处理一条资源约30分钟" },
    { taskType: "质量检查", humanBaseline: 0.25, description: "人工质检一条内容约15分钟" },
    { taskType: "音频制作", humanBaseline: 2, description: "人工制作一段音频约2小时" },
    { taskType: "字幕制作", humanBaseline: 1.5, description: "人工制作一段字幕约1.5小时" },
  ];
  for (const cfg of DEFAULT_TASK_TYPES) {
    await db.insert(metricConfigs).values({
      id: randomUUID(),
      employeeId: null,
      team: null,
      taskType: cfg.taskType,
      humanBaseline: cfg.humanBaseline,
      costPerHour: 46.875,
      description: cfg.description,
      updatedAt: now,
    });
  }
  // Team-level overrides
  await db.insert(metricConfigs).values([
    { id: randomUUID(), employeeId: null, team: "management", taskType: "项目审计", humanBaseline: 5, costPerHour: 46.875, description: "管理团队项目审计基准", updatedAt: now },
    { id: randomUUID(), employeeId: null, team: "management", taskType: "绩效评估", humanBaseline: 4, costPerHour: 46.875, description: "管理团队绩效评估基准", updatedAt: now },
    { id: randomUUID(), employeeId: null, team: "production", taskType: "剧本创作", humanBaseline: 4, costPerHour: 46.875, description: "生产团队剧本创作基准", updatedAt: now },
    { id: randomUUID(), employeeId: null, team: "production", taskType: "质量检查", humanBaseline: 0.5, costPerHour: 46.875, description: "生产团队质量检查基准", updatedAt: now },
  ]);
  console.log(`Seeded ${DEFAULT_TASK_TYPES.length} metric configs.`);
}

seed().catch(console.error);
