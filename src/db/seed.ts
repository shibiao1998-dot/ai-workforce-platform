import { db } from "./index";
import { employees, skills, metrics, versionLogs, tasks, taskOutputs } from "./schema";
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

const SEED_EMPLOYEES = [
  // === AI管理团队 (10人) ===
  {
    id: randomUUID(), name: "AI审计官", title: "项目审计专家",
    team: "management" as const, status: "active" as const,
    soul: "让每一个项目决策都有可追溯的质量基准",
    identity: "严谨、数据驱动、以事实说话的审计专家",
    description: "负责对所有在执行项目进行质量与合规审计，输出结构化审计报告，累计完成846次项目审计，Q1建议采纳率61%。",
    skills: [
      { name: "项目审计", level: 5, category: "核心能力", description: "质量基准检查与风险识别" },
      { name: "报告生成", level: 4, category: "输出能力", description: "结构化审计报告自动生成" },
      { name: "风险预警", level: 4, category: "核心能力", description: "项目风险识别与预警机制" },
    ],
    metrics: { taskCount: 140, adoptionRate: 0.61, accuracyRate: 0.88 },
    version: { version: "V2.1", changelog: "新增多项目并行审计能力，提升报告生成速度40%" },
  },
  {
    id: randomUUID(), name: "AI人力专员", title: "人力资源数据分析师",
    team: "management" as const, status: "active" as const,
    soul: "用数据驱动人员决策，让人才管理更科学",
    identity: "细致、洞察力强、以数据为核心的人力分析师",
    description: "负责人员数据盘点、绩效追踪与人才预警，每月输出人力健康报告，预警准确率达85%。",
    skills: [
      { name: "人员盘点", level: 5, category: "核心能力", description: "数据驱动的人员结构分析" },
      { name: "绩效追踪", level: 4, category: "核心能力", description: "多维度绩效指标跟踪" },
      { name: "预警分析", level: 5, category: "核心能力", description: "人员风险早期预警" },
    ],
    metrics: { taskCount: 60, adoptionRate: 0.78, accuracyRate: 0.85 },
    version: { version: "V1.5", changelog: "集成离职风险模型，预警准确率提升至85%" },
  },
  {
    id: randomUUID(), name: "AI决策官", title: "战略决策支持专家",
    team: "management" as const, status: "active" as const,
    soul: "为每个关键决策提供结构化的分析框架和数据支撑",
    identity: "理性、系统化思考、善于在复杂信息中提炼关键",
    description: "负责重大项目决策的前置分析，提供多方案对比、风险评估与建议报告，辅助管理层科学决策。",
    skills: [
      { name: "决策分析", level: 5, category: "核心能力", description: "结构化决策框架与多方案对比" },
      { name: "风险评估", level: 4, category: "核心能力", description: "系统性风险识别与量化" },
      { name: "报告撰写", level: 4, category: "输出能力", description: "高质量决策报告生成" },
    ],
    metrics: { taskCount: 45, adoptionRate: 0.72, accuracyRate: 0.82 },
    version: { version: "V1.2", changelog: "优化多方案对比模板，决策报告生成速度提升60%" },
  },
  {
    id: randomUUID(), name: "AI项目监控", title: "项目进度追踪官",
    team: "management" as const, status: "active" as const,
    soul: "让每个项目的进度透明可见，风险提前暴露",
    identity: "精准、实时追踪、善于识别进度偏差的监控专家",
    description: "实时监控所有在执行项目的进度、里程碑达成情况，自动识别延期风险并触发预警。",
    skills: [
      { name: "进度追踪", level: 5, category: "核心能力", description: "多项目实时进度监控" },
      { name: "里程碑管理", level: 4, category: "核心能力", description: "关键节点识别与追踪" },
      { name: "延期预警", level: 5, category: "核心能力", description: "智能延期风险识别" },
    ],
    metrics: { taskCount: 200, adoptionRate: 0.69, accuracyRate: 0.91 },
    version: { version: "V1.8", changelog: "新增多维度进度偏差分析，预警时效提升至T+1" },
  },
  {
    id: randomUUID(), name: "AI合规官", title: "合规与法务支持专家",
    team: "management" as const, status: "developing" as const,
    soul: "守住合规红线，让业务在安全边界内高速奔跑",
    identity: "严谨、规则驱动、善于发现潜在合规风险",
    description: "负责合同审查、合规检查与法务风险评估，目前处于开发中，计划Q2上线。",
    skills: [
      { name: "合同审查", level: 3, category: "核心能力", description: "合同条款风险识别" },
      { name: "合规检查", level: 4, category: "核心能力", description: "业务合规性自动检查" },
    ],
    metrics: { taskCount: 20, adoptionRate: 0.65, accuracyRate: 0.78 },
    version: { version: "V0.5", changelog: "完成基础合同审查能力，合规知识库建设中" },
  },
  {
    id: randomUUID(), name: "AI战略分析师", title: "市场与竞争情报分析师",
    team: "management" as const, status: "active" as const,
    soul: "洞察市场动向，为战略布局提供情报支撑",
    identity: "前瞻性强、善于整合多源信息、提炼战略洞察",
    description: "负责市场趋势分析、竞品情报收集与战略机会识别，每月产出战略情报简报。",
    skills: [
      { name: "市场分析", level: 5, category: "核心能力", description: "多维度市场趋势分析" },
      { name: "竞品研究", level: 4, category: "核心能力", description: "竞品动向追踪与对比" },
      { name: "战略简报", level: 4, category: "输出能力", description: "高质量战略洞察报告" },
    ],
    metrics: { taskCount: 35, adoptionRate: 0.74, accuracyRate: 0.80 },
    version: { version: "V1.3", changelog: "扩展数据源至12个竞品跟踪维度" },
  },
  {
    id: randomUUID(), name: "AI质量官", title: "产品质量管理专家",
    team: "management" as const, status: "active" as const,
    soul: "建立质量防线，让每一个产出都达到可交付标准",
    identity: "高标准、细节驱动、以质量为核心价值的管理专家",
    description: "负责产品与项目的质量管理，制定质量标准、执行质量检查、输出改进建议。",
    skills: [
      { name: "质量标准制定", level: 5, category: "核心能力", description: "行业最佳实践与内部质量基准" },
      { name: "质检执行", level: 5, category: "核心能力", description: "自动化质量检查流程" },
      { name: "改进分析", level: 4, category: "输出能力", description: "质量问题根因分析" },
    ],
    metrics: { taskCount: 180, adoptionRate: 0.71, accuracyRate: 0.89 },
    version: { version: "V2.0", changelog: "建立三层质量防线体系，覆盖设计/开发/交付全链路" },
  },
  {
    id: randomUUID(), name: "AI预算官", title: "财务预算分析专家",
    team: "management" as const, status: "developing" as const,
    soul: "让每一分预算都花在刀刃上，实现ROI最大化",
    identity: "精确计算、成本敏感、善于财务模型建构",
    description: "负责项目预算追踪、成本分析与ROI评估，目前开发中，计划Q3上线。",
    skills: [
      { name: "预算追踪", level: 3, category: "核心能力", description: "项目预算实时监控" },
      { name: "ROI分析", level: 3, category: "核心能力", description: "多维度投资回报分析" },
    ],
    metrics: { taskCount: 15, adoptionRate: 0.60, accuracyRate: 0.75 },
    version: { version: "V0.3", changelog: "基础预算追踪模型完成，ROI分析模板建设中" },
  },
  {
    id: randomUUID(), name: "AI知识官", title: "企业知识库管理专家",
    team: "management" as const, status: "active" as const,
    soul: "让组织知识流动起来，避免经验沉没在个人脑袋里",
    identity: "系统化整理、善于知识结构化、强调知识可复用",
    description: "负责企业知识的采集、整理、标注与检索优化，维护公司知识库体系。",
    skills: [
      { name: "知识采集", level: 4, category: "核心能力", description: "多源知识自动采集与清洗" },
      { name: "知识结构化", level: 5, category: "核心能力", description: "非结构化信息转结构化知识" },
      { name: "知识检索", level: 4, category: "核心能力", description: "语义检索与知识推荐" },
    ],
    metrics: { taskCount: 90, adoptionRate: 0.76, accuracyRate: 0.87 },
    version: { version: "V1.6", changelog: "知识库词条突破5000条，检索准确率提升至87%" },
  },
  {
    id: randomUUID(), name: "AI运营官", title: "业务运营数据分析师",
    team: "management" as const, status: "planned" as const,
    soul: "以数据驱动运营决策，让增长有迹可循",
    identity: "数据导向、善于发现运营异常、以增长为核心目标",
    description: "负责业务运营数据监控、增长分析与运营策略优化，计划Q4上线。",
    skills: [
      { name: "数据监控", level: 2, category: "核心能力", description: "业务核心指标监控" },
      { name: "增长分析", level: 2, category: "核心能力", description: "用户增长与转化分析" },
    ],
    metrics: { taskCount: 5, adoptionRate: 0.55, accuracyRate: 0.70 },
    version: { version: "V0.1", changelog: "需求调研完成，技术方案评估中" },
  },

  // === AI设计师团队 (4人) ===
  {
    id: randomUUID(), name: "AI产品经理", title: "产品需求分析与规划专家",
    team: "design" as const, status: "active" as const,
    soul: "将用户痛点转化为清晰可执行的产品方案",
    identity: "用户视角、逻辑缜密、善于需求挖掘和优先级判断",
    description: "负责需求收集、用户故事编写、PRD文档生成，支持7类业务事务的自动触发，文档采纳率75%。",
    skills: [
      { name: "需求分析", level: 5, category: "核心能力", description: "用户访谈分析与需求结构化" },
      { name: "PRD编写", level: 5, category: "输出能力", description: "标准化产品需求文档生成" },
      { name: "优先级判断", level: 4, category: "核心能力", description: "RICE/MoSCoW框架需求排序" },
    ],
    metrics: { taskCount: 85, adoptionRate: 0.75, accuracyRate: 0.83 },
    version: { version: "V2.3", changelog: "新增7类事务自动触发规则，支持敏捷迭代PRD模板" },
  },
  {
    id: randomUUID(), name: "AI UX设计师", title: "用户体验设计专家",
    team: "design" as const, status: "active" as const,
    soul: "用设计连接用户与产品，让每个交互都有温度",
    identity: "以用户为中心、审美敏锐、善于用可视化传达复杂逻辑",
    description: "负责用户研究、交互设计方案输出与设计系统维护，输出Figma可交付物。",
    skills: [
      { name: "用户研究", level: 4, category: "核心能力", description: "用研方案设计与洞察输出" },
      { name: "交互设计", level: 5, category: "核心能力", description: "线框图、流程图、原型设计" },
      { name: "设计系统", level: 4, category: "核心能力", description: "组件库与设计规范维护" },
    ],
    metrics: { taskCount: 60, adoptionRate: 0.79, accuracyRate: 0.84 },
    version: { version: "V1.7", changelog: "建立品牌设计系统，组件覆盖率达90%" },
  },
  {
    id: randomUUID(), name: "AI架构师", title: "系统架构设计专家",
    team: "design" as const, status: "active" as const,
    soul: "为系统奠定稳固可扩展的技术基础",
    identity: "系统化思维、善于技术选型与架构权衡",
    description: "负责系统架构设计、技术选型评估与架构文档输出，保障系统可扩展性与稳定性。",
    skills: [
      { name: "架构设计", level: 5, category: "核心能力", description: "分布式系统与微服务架构" },
      { name: "技术选型", level: 5, category: "核心能力", description: "技术方案评估与对比" },
      { name: "架构文档", level: 4, category: "输出能力", description: "C4模型架构文档生成" },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.81, accuracyRate: 0.88 },
    version: { version: "V1.4", changelog: "扩展微服务架构模板库至28个场景" },
  },
  {
    id: randomUUID(), name: "AI测试专家", title: "质量保障与自动化测试专家",
    team: "design" as const, status: "active" as const,
    soul: "用系统化测试保障每一次发布的质量",
    identity: "严谨细致、善于发现边界问题、以质量为底线",
    description: "负责测试方案设计、自动化测试用例生成与质量报告输出，覆盖功能/性能/安全多维度。",
    skills: [
      { name: "测试方案设计", level: 5, category: "核心能力", description: "全链路测试策略制定" },
      { name: "自动化测试", level: 4, category: "核心能力", description: "测试用例自动生成与执行" },
      { name: "性能测试", level: 4, category: "核心能力", description: "压测方案与瓶颈分析" },
    ],
    metrics: { taskCount: 110, adoptionRate: 0.77, accuracyRate: 0.92 },
    version: { version: "V2.0", changelog: "自动化测试覆盖率提升至85%，新增安全扫描模块" },
  },

  // === AI生产团队 (10人) ===
  {
    id: randomUUID(), name: "AI编剧", title: "内容脚本创作专家",
    team: "production" as const, status: "active" as const,
    soul: "用故事连接品牌与用户，让每个内容都有灵魂",
    identity: "创意丰富、擅长叙事结构、善于把握受众情感",
    description: "负责品牌内容脚本、营销文案与短视频脚本创作，月均产出剧本50+篇。",
    skills: [
      { name: "脚本创作", level: 5, category: "核心能力", description: "多类型内容脚本创作" },
      { name: "叙事结构", level: 5, category: "核心能力", description: "三幕式与非线性叙事" },
      { name: "营销文案", level: 4, category: "核心能力", description: "品牌传播文案撰写" },
    ],
    metrics: { taskCount: 50, adoptionRate: 0.73, accuracyRate: 0.82 },
    version: { version: "V1.9", changelog: "新增行业垂直脚本模板12套" },
  },
  {
    id: randomUUID(), name: "AI角色设计师", title: "虚拟角色与IP设计专家",
    team: "production" as const, status: "active" as const,
    soul: "赋予角色灵魂，让每个虚拟形象都有生命力",
    identity: "视觉化思维、善于创造有辨识度的角色形象",
    description: "负责虚拟角色的形象设计、性格设定与IP体系建设，累计设计角色200+。",
    skills: [
      { name: "角色形象设计", level: 5, category: "核心能力", description: "角色视觉形象生成" },
      { name: "性格体系", level: 4, category: "核心能力", description: "角色性格与行为逻辑设定" },
      { name: "IP体系", level: 4, category: "核心能力", description: "角色IP延伸设计" },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.76, accuracyRate: 0.85 },
    version: { version: "V1.6", changelog: "优化角色一致性生成，跨场景保持率提升至90%" },
  },
  {
    id: randomUUID(), name: "AI视频制作", title: "AI视频内容生产专家",
    team: "production" as const, status: "active" as const,
    soul: "让每一帧画面都精准传达品牌价值",
    identity: "视觉敏感、节奏感强、善于处理复杂视觉叙事",
    description: "负责短视频内容的AI辅助生产，包括分镜设计、素材调度与后期脚本，月产出视频30+条。",
    skills: [
      { name: "分镜设计", level: 4, category: "核心能力", description: "视频分镜脚本自动生成" },
      { name: "视频剪辑逻辑", level: 4, category: "核心能力", description: "剪辑节奏与转场设计" },
      { name: "素材管理", level: 5, category: "核心能力", description: "素材库智能调度" },
    ],
    metrics: { taskCount: 30, adoptionRate: 0.70, accuracyRate: 0.80 },
    version: { version: "V1.4", changelog: "支持竖屏/横屏双格式自动适配" },
  },
  {
    id: randomUUID(), name: "AI音频专家", title: "音频内容生产与处理专家",
    team: "production" as const, status: "active" as const,
    soul: "让声音成为品牌最有温度的触点",
    identity: "听觉敏感、擅长情绪氛围营造、善于声音品牌化",
    description: "负责品牌音频内容生产，包括配音脚本、音效设计与播客脚本，月产出音频40+条。",
    skills: [
      { name: "配音脚本", level: 5, category: "核心能力", description: "多风格配音文案创作" },
      { name: "音效设计", level: 4, category: "核心能力", description: "品牌声音设计与音效库" },
      { name: "播客策划", level: 4, category: "核心能力", description: "播客选题与脚本规划" },
    ],
    metrics: { taskCount: 40, adoptionRate: 0.72, accuracyRate: 0.83 },
    version: { version: "V1.5", changelog: "新增5种音频风格模板，TTS质量优化" },
  },
  {
    id: randomUUID(), name: "AI质检员", title: "内容质量检查专家",
    team: "production" as const, status: "active" as const,
    soul: "守住内容质量底线，让每个发布都无懈可击",
    identity: "严格标准、细节导向、以规范为准绳",
    description: "负责所有AI生产内容的质量检查，打标准确率86%，实现生产流程的质量闭环。",
    skills: [
      { name: "内容质检", level: 5, category: "核心能力", description: "多维度内容质量评估" },
      { name: "打标分类", level: 5, category: "核心能力", description: "内容标签精准标注" },
      { name: "质量报告", level: 4, category: "输出能力", description: "质检结果可视化报告" },
    ],
    metrics: { taskCount: 420, adoptionRate: 0.86, accuracyRate: 0.86 },
    version: { version: "V2.4", changelog: "打标准确率提升至86%，新增敏感内容过滤模块" },
  },
  {
    id: randomUUID(), name: "AI资源管理", title: "数字资产库管理专家",
    team: "production" as const, status: "active" as const,
    soul: "建立有序可检索的数字资产体系，让资源产生复用价值",
    identity: "系统化管理、善于分类标准化、以资源可复用为目标",
    description: "负责数字资产的入库、分类、标注与检索优化，资源入库成功率92%。",
    skills: [
      { name: "资源入库", level: 5, category: "核心能力", description: "自动化资源采集与入库" },
      { name: "分类标注", level: 5, category: "核心能力", description: "多维度资源分类与标签" },
      { name: "检索优化", level: 4, category: "核心能力", description: "语义检索与推荐算法" },
    ],
    metrics: { taskCount: 300, adoptionRate: 0.82, accuracyRate: 0.92 },
    version: { version: "V2.1", changelog: "资源入库成功率提升至92%，检索响应优化至200ms内" },
  },
  {
    id: randomUUID(), name: "AI数据清洗", title: "训练数据处理专家",
    team: "production" as const, status: "active" as const,
    soul: "高质量数据是AI能力的根基，让每一条训练数据都有价值",
    identity: "精确、标准化、善于识别数据噪声",
    description: "负责AI训练数据的采集、清洗、格式化与质量验证，月处理数据量10万+条。",
    skills: [
      { name: "数据采集", level: 4, category: "核心能力", description: "多源数据自动采集" },
      { name: "数据清洗", level: 5, category: "核心能力", description: "噪声过滤与格式标准化" },
      { name: "质量验证", level: 4, category: "核心能力", description: "数据质量多维度评估" },
    ],
    metrics: { taskCount: 250, adoptionRate: 0.79, accuracyRate: 0.94 },
    version: { version: "V1.8", changelog: "清洗准确率提升至94%，支持15种数据格式" },
  },
  {
    id: randomUUID(), name: "AI内容分发", title: "内容发布与渠道管理专家",
    team: "production" as const, status: "developing" as const,
    soul: "让优质内容精准触达目标受众，实现传播价值最大化",
    identity: "渠道敏感、数据导向、善于内容与平台匹配",
    description: "负责内容跨平台发布策略与自动化分发，目前开发中，计划Q2上线。",
    skills: [
      { name: "渠道策略", level: 3, category: "核心能力", description: "多平台内容分发策略" },
      { name: "发布自动化", level: 3, category: "核心能力", description: "定时发布与平台API对接" },
    ],
    metrics: { taskCount: 25, adoptionRate: 0.65, accuracyRate: 0.75 },
    version: { version: "V0.6", changelog: "完成主流平台API对接，发布工作流设计中" },
  },
  {
    id: randomUUID(), name: "AI效果分析", title: "内容效果数据分析师",
    team: "production" as const, status: "planned" as const,
    soul: "用数据揭示什么内容真正有效，让创作有据可依",
    identity: "数据导向、善于发现内容传播规律",
    description: "负责内容效果的数据追踪与分析，计划Q3上线。",
    skills: [
      { name: "效果追踪", level: 2, category: "核心能力", description: "内容传播数据收集" },
      { name: "归因分析", level: 2, category: "核心能力", description: "内容效果归因模型" },
    ],
    metrics: { taskCount: 8, adoptionRate: 0.55, accuracyRate: 0.68 },
    version: { version: "V0.1", changelog: "需求分析完成，数据指标体系设计中" },
  },
  {
    id: randomUUID(), name: "AI本地化", title: "内容本地化与多语言专家",
    team: "production" as const, status: "planned" as const,
    soul: "消除语言壁垒，让内容在全球范围内自然流动",
    identity: "语言敏感、跨文化理解、善于保留内容灵魂的同时适应本地语境",
    description: "负责内容多语言翻译与本地化适配，计划Q4上线。",
    skills: [
      { name: "多语言翻译", level: 2, category: "核心能力", description: "高质量AI辅助翻译" },
      { name: "文化适配", level: 2, category: "核心能力", description: "跨文化内容本地化" },
    ],
    metrics: { taskCount: 5, adoptionRate: 0.50, accuracyRate: 0.65 },
    version: { version: "V0.1", changelog: "支持语言范围评估中，翻译质量基准测试进行中" },
  },
];

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(taskOutputs);
  await db.delete(tasks);
  await db.delete(versionLogs);
  await db.delete(metrics);
  await db.delete(skills);
  await db.delete(employees);

  for (const emp of SEED_EMPLOYEES) {
    const employeeId = emp.id;
    const ts = new Date();

    // Insert employee
    await db.insert(employees).values({
      id: employeeId,
      name: emp.name,
      avatar: null,
      title: emp.title,
      team: emp.team,
      status: emp.status,
      soul: emp.soul,
      identity: emp.identity,
      description: emp.description,
      createdAt: ts,
      updatedAt: ts,
    });

    // Insert skills
    for (const skill of emp.skills) {
      await db.insert(skills).values({
        id: randomUUID(),
        employeeId,
        name: skill.name,
        level: skill.level,
        category: skill.category,
        description: skill.description,
      });
    }

    // Insert 6 months of metrics
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
    management: ["项目审计", "预警分析", "决策报告", "人员盘点", "知识整理"],
    design: ["PRD编写", "交互设计", "架构评审", "测试方案"],
    production: ["脚本创作", "角色设计", "视频分镜", "内容质检", "资源入库", "数据清洗"],
  };

  const activeEmployees = SEED_EMPLOYEES.filter((e) => e.status === "active");

  for (const emp of activeEmployees) {
    const types = TASK_TYPES[emp.team];
    // 2 running tasks per active employee
    for (let i = 0; i < 2; i++) {
      const taskId = randomUUID();
      const started = new Date(Date.now() - Math.random() * 3600000);
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
      });
    }
    // 10 completed tasks per active employee
    for (let i = 0; i < 10; i++) {
      const taskId = randomUUID();
      const daysAgo = Math.floor(Math.random() * 30);
      const started = new Date(Date.now() - daysAgo * 86400000 - Math.random() * 3600000);
      const duration = 600000 + Math.random() * 3600000;
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
      });
    }
  }

  console.log(`Seeded tasks for ${activeEmployees.length} active employees.`);
}

seed().catch(console.error);
