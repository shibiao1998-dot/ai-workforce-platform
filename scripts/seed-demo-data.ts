import { employees, tasks, taskSteps, taskOutputs } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import path from "path";

const DEMO_TASK_SOURCE = "seed-demo-data";
const DEMO_TASK_METADATA = JSON.stringify({ source: DEMO_TASK_SOURCE });

function assertDemoDatabaseTarget() {
  const dbPath = process.env.DATABASE_PATH;
  if (!dbPath) {
    throw new Error(
      "Refusing to seed demo data without DATABASE_PATH. Point DATABASE_PATH at a separate demo database, for example /tmp/ai-workforce-demo.db.",
    );
  }

  const normalized = path.resolve(dbPath).toLowerCase();
  const basename = path.basename(normalized);
  if (!normalized.includes("demo") || basename === "local.db") {
    throw new Error(
      `Refusing to seed demo data into ${dbPath}. Use a separate database path with "demo" in the name.`,
    );
  }
}

// Task types by team
const TASK_TYPES: Record<string, string[]> = {
  management: ["项目审计", "绩效评估", "版本管理", "生产管理", "业务分析", "人员盘点", "激励申报"],
  design: ["战略规划", "需求文档", "软件设计", "产品方案"],
  production: ["需求确认", "生产评审", "质量检查", "资源入库", "剧本创作", "角色设计", "图像生成", "音频制作", "字幕制作"],
};

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

function generateCompletedSteps(taskId: string, taskType: string, startTime: Date) {
  const templateKey = Object.keys(STEP_TEMPLATES).find(k => taskType.includes(k)) ?? Object.keys(STEP_TEMPLATES)[0];
  const stepNames = STEP_TEMPLATES[templateKey];
  return stepNames.map((name, i) => ({
    id: randomUUID(),
    taskId,
    stepOrder: i + 1,
    name,
    status: "completed" as const,
    thought: Math.random() > 0.4 ? COT_THOUGHTS[Math.floor(Math.random() * COT_THOUGHTS.length)] : null,
    startedAt: new Date(startTime.getTime() + i * 180000),
    completedAt: new Date(startTime.getTime() + i * 180000 + 60000 + Math.random() * 240000),
  }));
}

function generateRunningSteps(taskId: string, taskType: string, startTime: Date) {
  const templateKey = Object.keys(STEP_TEMPLATES).find(k => taskType.includes(k)) ?? Object.keys(STEP_TEMPLATES)[0];
  const stepNames = STEP_TEMPLATES[templateKey];
  const pivotIdx = Math.floor(Math.random() * (stepNames.length - 1)) + 1;
  return stepNames.map((name, i) => {
    let status: "pending" | "running" | "completed" = "pending";
    let thought: string | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    if (i < pivotIdx) {
      status = "completed";
      startedAt = new Date(startTime.getTime() + i * 180000);
      completedAt = new Date(startedAt.getTime() + 60000 + Math.random() * 240000);
      if (Math.random() > 0.5) thought = COT_THOUGHTS[Math.floor(Math.random() * COT_THOUGHTS.length)];
    } else if (i === pivotIdx) {
      status = "running";
      startedAt = new Date(startTime.getTime() + i * 180000);
    }
    return { id: randomUUID(), taskId, stepOrder: i + 1, name, status, thought, startedAt, completedAt };
  });
}

function generateOutputs(taskId: string, count: number, createdAt: Date) {
  const types: Array<"document" | "resource" | "report" | "media" | "other"> = ["document", "document", "report", "report", "resource", "media", "other"];
  return Array.from({ length: count }, () => {
    const type = types[Math.floor(Math.random() * types.length)];
    const titles = OUTPUT_TITLES[type];
    return {
      id: randomUUID(),
      taskId,
      type,
      title: titles[Math.floor(Math.random() * titles.length)],
      content: type === "document" || type === "report" ? "这是一份自动生成的模拟内容。该文档包含了任务执行过程中产生的分析数据、关键发现和建议措施。内容经过AI审核，确保数据准确性和逻辑完整性。" : null,
      url: type === "media" || type === "resource" ? `/outputs/${randomUUID().slice(0, 8)}.${type === "media" ? "mp4" : "zip"}` : null,
      createdAt,
    };
  });
}

async function seedDemoData() {
  assertDemoDatabaseTarget();
  const { db } = await import("../src/db/index");
  console.log("Generating rolling demo data for the last 7 days plus today...");

  // Get all active employees
  const activeEmps = await db.select().from(employees).where(eq(employees.status, "active"));
  console.log(`Found ${activeEmps.length} active employees`);

  const existingDemoTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.metadata, DEMO_TASK_METADATA));
  console.log(`Removing ${existingDemoTasks.length} existing demo tasks before reseeding...`);
  if (existingDemoTasks.length > 0) {
    await db.delete(tasks).where(eq(tasks.metadata, DEMO_TASK_METADATA));
  }

  // Generate a rolling demo window.
  // Historical days are completed; only the actual seed day gets running tasks.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAgo = (days: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);

  const DEMO_DATES = [
    { date: daysAgo(7), completed: [3, 5], running: 0 },
    { date: daysAgo(6), completed: [3, 5], running: 0 },
    { date: daysAgo(5), completed: [3, 5], running: 0 },
    { date: daysAgo(4), completed: [2, 4], running: 0 },
    { date: daysAgo(3), completed: [2, 4], running: 0 },
    { date: daysAgo(2), completed: [2, 4], running: 0 },
    { date: daysAgo(1), completed: [2, 4], running: 0 },
    { date: today, completed: [2, 4], running: 2 },
  ];

  let totalTasks = 0;

  for (const dayConfig of DEMO_DATES) {
    const dateStr = dayConfig.date.toISOString().slice(0, 10);
    console.log(`Generating tasks for ${dateStr}...`);

    for (const emp of activeEmps) {
      const types = TASK_TYPES[emp.team];

      // Completed tasks for this day
      const completedCount = dayConfig.completed[0] + Math.floor(Math.random() * (dayConfig.completed[1] - dayConfig.completed[0] + 1));
      for (let i = 0; i < completedCount; i++) {
        const taskId = randomUUID();
        const type = types[Math.floor(Math.random() * types.length)];
        // Random hour between 8am and 6pm
        const hour = 8 + Math.floor(Math.random() * 10);
        const minute = Math.floor(Math.random() * 60);
        const startTime = new Date(dayConfig.date.getFullYear(), dayConfig.date.getMonth(), dayConfig.date.getDate(), hour, minute);
        const duration = 600000 + Math.random() * 3600000; // 10min to 1hr
        const endTime = new Date(startTime.getTime() + duration);

        await db.insert(tasks).values({
          id: taskId,
          employeeId: emp.id,
          team: emp.team,
          name: `${type} #${Math.floor(Math.random() * 900) + 100}`,
          type,
          status: "completed",
          progress: 100,
          currentStep: "已完成",
          startTime,
          estimatedEndTime: endTime,
          actualEndTime: endTime,
          metadata: DEMO_TASK_METADATA,
          qualityScore: 70 + Math.floor(Math.random() * 28),
          retryCount: Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 3),
          tokenUsage: Math.floor(1000 + Math.random() * 7000),
          reflection: Math.random() < 0.3 ? JSON.stringify(REFLECTION_TEMPLATES[Math.floor(Math.random() * REFLECTION_TEMPLATES.length)]) : null,
        });

        const steps = generateCompletedSteps(taskId, type, startTime);
        for (const step of steps) {
          await db.insert(taskSteps).values(step);
        }

        const outputCount = 1 + Math.floor(Math.random() * 3);
        const outputs = generateOutputs(taskId, outputCount, endTime);
        for (const output of outputs) {
          await db.insert(taskOutputs).values(output);
        }
        totalTasks++;
      }

      // Running tasks for this day
      for (let i = 0; i < dayConfig.running; i++) {
        const taskId = randomUUID();
        const type = types[Math.floor(Math.random() * types.length)];
        // Running tasks started recently (within last 1-2 hours of that day)
        const hour = 14 + Math.floor(Math.random() * 4); // 2pm-6pm
        const minute = Math.floor(Math.random() * 60);
        const startTime = new Date(dayConfig.date.getFullYear(), dayConfig.date.getMonth(), dayConfig.date.getDate(), hour, minute);

        await db.insert(tasks).values({
          id: taskId,
          employeeId: emp.id,
          team: emp.team,
          name: `${type} #${Math.floor(Math.random() * 900) + 100}`,
          type,
          status: "running",
          progress: Math.floor(Math.random() * 80) + 10,
          currentStep: "AI正在处理中...",
          startTime,
          estimatedEndTime: new Date(startTime.getTime() + 1800000),
          actualEndTime: null,
          metadata: DEMO_TASK_METADATA,
          qualityScore: null,
          retryCount: 0,
          tokenUsage: Math.floor(1000 + Math.random() * 5000),
          reflection: Math.random() < 0.5 ? JSON.stringify(REFLECTION_TEMPLATES[Math.floor(Math.random() * REFLECTION_TEMPLATES.length)]) : null,
        });

        const steps = generateRunningSteps(taskId, type, startTime);
        for (const step of steps) {
          await db.insert(taskSteps).values(step);
        }
        totalTasks++;
      }
    }
  }

  console.log(`Done! Generated ${totalTasks} new tasks across ${DEMO_DATES.length} days for ${activeEmps.length} employees.`);
}

seedDemoData().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
