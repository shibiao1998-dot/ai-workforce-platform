import { db } from "./index";
import { helpCategories, helpArticles } from "./schema";
import { randomUUID } from "crypto";

export async function seedHelpDocs() {
  // Delete existing help data (idempotent)
  await db.delete(helpArticles);
  await db.delete(helpCategories);

  const now = new Date();

  // Create category IDs
  const catIds = {
    quickStart: randomUUID(),
    features: randomUUID(),
    metrics: randomUUID(),
    workflow: randomUUID(),
  };

  await db.insert(helpCategories).values([
    { id: catIds.quickStart, name: "快速开始", icon: "🚀", sortOrder: 1, createdAt: now, updatedAt: now },
    { id: catIds.features,   name: "功能模块", icon: "📊", sortOrder: 2, createdAt: now, updatedAt: now },
    { id: catIds.metrics,    name: "数据指标", icon: "📋", sortOrder: 3, createdAt: now, updatedAt: now },
    { id: catIds.workflow,   name: "任务工作流", icon: "⚙️", sortOrder: 4, createdAt: now, updatedAt: now },
  ]);

  const articles = [
    // ── 快速开始（3 篇）────────────────────────────────────────────
    {
      id: randomUUID(),
      categoryId: catIds.quickStart,
      title: "平台简介",
      summary: "了解 AI Workforce Platform 的定位、三大业务团队及整体架构。",
      sortOrder: 1,
      content: `<h2>产品概述</h2>
<p>AI Workforce Platform 是一个内部管理看板，用于管理一支由 24 名 AI 员工组成的虚拟团队。团队分为三条业务线：<strong>管理团队</strong>、<strong>设计师团队</strong>、<strong>生产团队</strong>。平台通过可视化看板展示 AI 员工的工作状态、绩效指标和价值产出，帮助管理层实时掌握 AI 团队运营情况。</p>
<p>技术栈：Next.js 16、React 19、TypeScript、Tailwind CSS v4、shadcn/ui、SQLite + Drizzle ORM、ECharts、React Flow。</p>

<h2>三大团队</h2>
<table>
  <thead>
    <tr><th>团队</th><th>英文标识</th><th>主题色</th><th>活跃员工数</th></tr>
  </thead>
  <tbody>
    <tr><td>管理团队</td><td><code>management</code></td><td>紫色（#8b5cf6）</td><td>约 7 人</td></tr>
    <tr><td>设计师团队</td><td><code>design</code></td><td>蓝色（#3b82f6）</td><td>约 4 人</td></tr>
    <tr><td>生产团队</td><td><code>production</code></td><td>绿色（#22c55e）</td><td>约 7 人</td></tr>
  </tbody>
</table>
<p>全平台共约 24 名员工，其中约 18 名处于在岗（active）状态。团队在 UI 中通过左侧边框颜色区分：紫色 = 管理、蓝色 = 设计、绿色 = 生产。</p>

<h2>子团队</h2>
<p>生产团队通过 <code>employees.subTeam</code> 列进一步细分为两个层级：</p>
<ul>
  <li><strong>生产管理层</strong>：负责生产任务的调度与审核</li>
  <li><strong>内容生产层</strong>：负责具体内容的创作与生产</li>
</ul>

<h2>员工状态</h2>
<table>
  <thead>
    <tr><th>状态</th><th>英文标识</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>在岗</td><td><code>active</code></td><td>正常运行中，参与任务分配</td></tr>
    <tr><td>开发中</td><td><code>developing</code></td><td>正在培养/开发阶段</td></tr>
    <tr><td>规划中</td><td><code>planned</code></td><td>尚在规划阶段，未上线</td></tr>
    <tr><td>已停用</td><td><code>inactive</code></td><td>已下线，不再分配任务</td></tr>
  </tbody>
</table>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.quickStart,
      title: "团队组织",
      summary: "详细介绍三大团队结构、子团队划分、员工状态及 IP 人设系统。",
      sortOrder: 2,
      content: `<h2>团队总览</h2>
<p>AI Workforce Platform 管理 24 名 AI 员工，按职能分为三条业务线。每条业务线有独立的主题色和专属任务类型。</p>
<table>
  <thead>
    <tr><th>团队</th><th>英文标识</th><th>主题色</th><th>活跃员工数</th></tr>
  </thead>
  <tbody>
    <tr><td>管理团队</td><td><code>management</code></td><td>紫色（#8b5cf6）</td><td>约 7 人</td></tr>
    <tr><td>设计师团队</td><td><code>design</code></td><td>蓝色（#3b82f6）</td><td>约 4 人</td></tr>
    <tr><td>生产团队</td><td><code>production</code></td><td>绿色（#22c55e）</td><td>约 7 人</td></tr>
  </tbody>
</table>

<h2>生产团队子层级</h2>
<p>生产团队通过 <code>employees.subTeam</code> 字段进一步细分：</p>
<ul>
  <li><strong>生产管理层</strong>：负责任务调度、审核和质量把控</li>
  <li><strong>内容生产层</strong>：负责具体的内容创作与生产执行</li>
</ul>

<h2>员工状态说明</h2>
<table>
  <thead>
    <tr><th>状态</th><th>英文标识</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>在岗</td><td><code>active</code></td><td>正常运行中，参与任务分配</td></tr>
    <tr><td>开发中</td><td><code>developing</code></td><td>正在培养/开发阶段，暂不接受任务</td></tr>
    <tr><td>规划中</td><td><code>planned</code></td><td>尚在规划阶段，未上线</td></tr>
    <tr><td>已停用</td><td><code>inactive</code></td><td>已下线，不再分配任务</td></tr>
  </tbody>
</table>

<h2>IP 人设系统（EmployeePersona）</h2>
<p>每位 AI 员工均配有完整的 IP 人设，存储于 <code>employees.persona</code> 字段（JSON 字符串），对应 <code>src/lib/types.ts</code> 中的 <code>EmployeePersona</code> 接口。解析方式：<code>JSON.parse(employee.persona) as EmployeePersona</code>。</p>
<table>
  <thead>
    <tr><th>字段</th><th>类型</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td><code>age</code></td><td>number</td><td>年龄</td></tr>
    <tr><td><code>gender</code></td><td>string</td><td>性别</td></tr>
    <tr><td><code>mbti</code></td><td>string</td><td>MBTI 性格类型</td></tr>
    <tr><td><code>personality</code></td><td>string[]</td><td>性格标签数组</td></tr>
    <tr><td><code>catchphrase</code></td><td>string</td><td>口头禅</td></tr>
    <tr><td><code>backstory</code></td><td>string</td><td>背景故事</td></tr>
    <tr><td><code>workStyle</code></td><td>string</td><td>工作方式</td></tr>
    <tr><td><code>interests</code></td><td>string[]</td><td>兴趣爱好</td></tr>
    <tr><td><code>fashionStyle</code></td><td>string</td><td>穿搭风格</td></tr>
    <tr><td><code>visualTraits</code></td><td>string</td><td>视觉特征描述</td></tr>
    <tr><td><code>sceneDescription</code></td><td>string</td><td>场景描述（用于 AI 肖像生成提示词）</td></tr>
  </tbody>
</table>
<p>AI 肖像为 AI 生成的横版（1376×768）PNG 图片，存储于 <code>public/avatars/{name}.png</code>。当 <code>avatar</code> 为 null 时，<code>AiAvatar</code> 组件会根据员工 ID 程序化生成 SVG 机器人头像（按团队上色）。</p>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.quickStart,
      title: "快速上手指南",
      summary: "5 分钟掌握平台的 5 大导航页面及基本操作流程。",
      sortOrder: 3,
      content: `<h2>平台导航结构</h2>
<p>平台共有 5 条主要路由，通过左侧图标导航栏访问：</p>
<ol>
  <li><strong>花名册 <code>/roster</code></strong>（默认首页）— 浏览和搜索所有 AI 员工，查看员工详情、技能、绩效和版本日志。</li>
  <li><strong>驾驶舱 <code>/dashboard</code></strong> — 全团队 KPI 总览、热力图、实时排行榜、团队效能对比。</li>
  <li><strong>生产看板 <code>/production</code></strong> — 实时任务监控、历史记录、数据面板，支持时间范围筛选。</li>
  <li><strong>组织架构 <code>/org</code></strong> — 交互式层级图，展示团队与员工的上下级关系。</li>
  <li><strong>系统设置 <code>/settings</code></strong> — 员工管理、指标基准配置、数据导入/导出。</li>
</ol>

<h2>基本操作流程</h2>
<h3>查看员工详情</h3>
<ol>
  <li>进入<strong>花名册</strong>页面</li>
  <li>使用顶部 Tab 按团队筛选，或在搜索框输入员工姓名/职位</li>
  <li>点击员工卡片打开详情弹窗</li>
  <li>在弹窗中切换「档案」「技能」「指标」「版本」四个 Tab 查看详细信息</li>
</ol>

<h3>监控实时任务</h3>
<ol>
  <li>进入<strong>生产看板</strong>，默认显示「实时看板」Tab</li>
  <li>页面每 15 秒自动刷新运行中的任务</li>
  <li>点击任务卡片查看 SOP 步骤详情、产出内容和执行反思</li>
  <li>切换到「数据面板」Tab 查看按团队分组的趋势图和质量仪表盘</li>
</ol>

<h3>配置指标基准</h3>
<ol>
  <li>进入<strong>系统设置</strong> → 「指标基准配置」Tab</li>
  <li>系统采用三级优先级：员工级覆盖 &gt; 团队级覆盖 &gt; 全局基准</li>
  <li>为特定任务类型设置人工基准工时和时薪，系统自动计算节省成本</li>
</ol>

<h2>员工卡片说明</h2>
<p>每张员工卡片包含以下信息：</p>
<ul>
  <li>AI 生成的横版肖像图（或程序化 SVG 机器人头像）</li>
  <li>姓名、职位、状态徽章</li>
  <li>团队色左边框（紫色/蓝色/绿色）</li>
  <li>本月任务量、采纳率、准确率三项核心指标</li>
  <li>「查看详情」按钮 — 打开居中的 Dialog 弹窗，<strong>不跳转页面</strong></li>
</ul>`,
    },

    // ── 功能模块（5 篇）────────────────────────────────────────────
    {
      id: randomUUID(),
      categoryId: catIds.features,
      title: "驾驶舱指南",
      summary: "掌握驾驶舱页面的各个组件：综合运营指数、KPI 卡片、热力图、排行榜及团队效能对比。",
      sortOrder: 1,
      content: `<h2>驾驶舱概览（/dashboard）</h2>
<p>驾驶舱是平台的总览页面，聚合全团队的关键绩效指标，帮助管理层实时掌握 AI 团队运营情况。</p>

<h2>综合运营指数仪表盘</h2>
<p>弧形进度仪表盘，显示 0–100 的综合指数。计算公式：</p>
<pre><code>round(((adoptionRate + accuracyRate) / 2) × 100)</code></pre>
<p>颜色含义：</p>
<ul>
  <li>≥ 80：<strong>绿色</strong>（优秀）</li>
  <li>60–79：<strong>黄色</strong>（良好）</li>
  <li>&lt; 60：<strong>红色</strong>（需关注）</li>
</ul>

<h2>团队状态概览</h2>
<p>3 个团队卡片分别显示各团队的健康率（在岗员工数 / 总员工数）。点击卡片可展开团队抽屉，查看成员列表、等级和经验值。</p>

<h2>6 个 KPI 卡片</h2>
<table>
  <thead>
    <tr><th>KPI 名称</th><th>单位</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>本月任务量</td><td>个</td><td>当月完成的任务总数</td></tr>
    <tr><td>工具采用率</td><td>%</td><td>AI 工具在业务中的渗透率</td></tr>
    <tr><td>任务准确率</td><td>%</td><td>任务结果的正确性比例</td></tr>
    <tr><td>节省人工时</td><td>h</td><td>相比人工完成同等任务节省的时间</td></tr>
    <tr><td>节省人力成本</td><td>¥ 元</td><td>节省人工时 × 时薪</td></tr>
  </tbody>
</table>
<p>每个 KPI 卡片均包含<strong>环比趋势箭头</strong>和<strong>迷你折线图（sparkline）</strong>。</p>

<h2>团队效能对比</h2>
<p>分组柱状图，展示近 5 个月数据，每团队 3 条数据系列。点击图表可联动过滤下方热力图。</p>

<h2>AI 员工近 30 天活跃热力图</h2>
<p>以「员工 × 日期」为坐标轴，展示每位员工每天的已完成任务数。点击任意格子可打开对应员工的详情弹窗。</p>

<h2>实时排行榜</h2>
<p>按经验值（XP）展示 Top 5 员工，支持切换本周 / 本月维度。每行显示：</p>
<ul>
  <li>等级徽章（新手🌱 / 熟练⚡ / 精英🔥 / 大师💎 / 传奇👑）</li>
  <li>XP 值</li>
  <li>名次变化（↑↓ 箭头）</li>
</ul>

<h2>成就动态 & 最近任务动态</h2>
<p>「成就动态」展示近期成就解锁的信息流；「最近任务动态」实时显示最新 8 条任务，带实时更新指示器。</p>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.features,
      title: "花名册指南",
      summary: "了解如何浏览员工卡片、使用筛选搜索，以及通过详情弹窗查看档案、技能、指标和版本日志。",
      sortOrder: 2,
      content: `<h2>花名册概览（/roster）</h2>
<p>花名册是平台的员工目录，以卡片网格形式展示所有 AI 员工，支持多维度筛选和关键词搜索。</p>

<h2>筛选与搜索</h2>
<ul>
  <li><strong>团队 Tab 筛选</strong>：全部 / 管理 / 设计 / 生产，一键切换</li>
  <li><strong>关键词搜索</strong>：实时过滤员工姓名和职位</li>
</ul>

<h2>员工卡片结构</h2>
<p>每张卡片采用竖向肖像布局：</p>
<ul>
  <li>顶部大图区域（h-80）：AI 生成肖像 + 团队色渐变背景，状态徽章悬浮右上角</li>
  <li>姓名（<code>text-lg font-bold</code>）+ 职位 + 员工描述</li>
  <li>3 个核心指标行：本月任务量 / 采纳率 / 准确率</li>
  <li>「查看详情」按钮</li>
</ul>
<p>团队色通过卡片左边框体现：紫色 = 管理团队，蓝色 = 设计师团队，绿色 = 生产团队。</p>

<h2>员工详情弹窗（4 个 Tab）</h2>
<h3>档案 Tab</h3>
<p>展示员工基本信息和完整的 IP 人设卡，包含：年龄、MBTI、性格标签、口头禅、背景故事、工作方式、兴趣爱好、穿搭风格、视觉特征。</p>

<h3>技能 Tab</h3>
<p>按类别分组展示员工技能。每项技能含：</p>
<ul>
  <li>技能名称 + 类别</li>
  <li>星级评分（1–5 星）</li>
  <li>按月统计指标：调用次数 / 成功率 / 平均响应时间</li>
</ul>

<h3>指标 Tab</h3>
<p>4 个 KPI 卡片 + ECharts 趋势折线图，涵盖以下维度（历史月度数据）：</p>
<ul>
  <li>任务数量</li>
  <li>节省工时（小时）</li>
  <li>工具采用率</li>
  <li>任务准确率</li>
</ul>

<h3>版本 Tab</h3>
<p>时间线形式展示员工版本日志，包含：版本号（如 v1.0.0）、发布日期、变更说明、能力变更摘要。</p>

<h2>直接 URL 访问</h2>
<p>员工详情也可通过 <code>/roster/[id]</code> 路由直接访问，适合分享链接或书签。</p>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.features,
      title: "生产看板指南",
      summary: "掌握生产看板的三个 Tab：实时监控、数据面板和历史记录，以及任务详情弹窗的各项信息。",
      sortOrder: 3,
      content: `<h2>生产看板概览（/production）</h2>
<p>生产看板是平台的任务监控中心，提供实时运行状态、历史数据分析和多维数据面板。</p>

<h2>顶部统计卡片（4 张）</h2>
<table>
  <thead>
    <tr><th>卡片</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td>今日任务</td><td>当日创建的任务总数</td></tr>
    <tr><td>完成率</td><td>已完成任务 / 总任务数</td></tr>
    <tr><td>执行中</td><td>当前 running 状态的任务数</td></tr>
    <tr><td>平均质量分</td><td>已完成任务的 qualityScore 均值</td></tr>
  </tbody>
</table>

<h2>三个 Tab 页签</h2>
<h3>实时看板</h3>
<ul>
  <li>每 15 秒自动轮询，拉取最新 running 状态任务</li>
  <li>支持按团队筛选</li>
  <li>每张任务卡片显示迷你 SOP 步骤条（步骤当前进度一览）</li>
  <li>点击卡片打开任务详情弹窗</li>
</ul>

<h3>数据面板</h3>
<ul>
  <li><strong>按日趋势图</strong>：ECharts 折线图，按管理 / 设计 / 生产三团队分组</li>
  <li><strong>任务类型分布</strong>：饼图展示各类型任务占比</li>
  <li><strong>质量仪表盘</strong>：弧形仪表盘展示平均质量分</li>
  <li><strong>员工排名</strong>：按完成任务数排序的员工榜单</li>
</ul>
<p>数据面板支持 <code>timeRange</code>（today / 7d / 30d）和 <code>date</code>（YYYY-MM-DD）参数，可与顶部时间范围选择器联动。</p>

<h3>历史记录</h3>
<p>分页表格，支持多维筛选：</p>
<ul>
  <li>搜索（任务名称/执行者）</li>
  <li>按团队筛选</li>
  <li>按状态筛选（running / completed / failed）</li>
</ul>
<p>表格列：任务名称 / 执行者 / 类型 / 状态 / 质量分 / 开始时间 / 耗时。</p>

<h2>任务详情弹窗</h2>
<p>点击任务卡片或历史记录行打开详情弹窗，包含：</p>
<ul>
  <li><strong>4 项统计条</strong>：质量评分 / 执行耗时 / 重试次数 / 预估费用（人民币）</li>
  <li><strong>执行步骤 Tab</strong>：垂直时间线展示各 SOP 步骤，含状态图标和 COT 思维链</li>
  <li><strong>产出内容 Tab</strong>：该任务的输出文档/资源/报告列表</li>
  <li><strong>执行反思 Tab</strong>：发现的问题（琥珀色）/ 踩过的坑（红色）/ 改进建议（绿色）</li>
</ul>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.features,
      title: "组织架构指南",
      summary: "使用 React Flow 交互式图表浏览团队层级关系，了解节点信息和图例含义。",
      sortOrder: 4,
      content: `<h2>组织架构概览（/org）</h2>
<p>组织架构页面基于 React Flow（<code>@xyflow/react</code>）实现交互式层级图，直观展示团队与员工的上下级关系。</p>

<h2>层级布局</h2>
<p>图表采用自上而下的层级布局：</p>
<ol>
  <li><strong>根节点</strong>：平台总入口节点</li>
  <li><strong>团队负责人</strong>：三大团队的负责人节点</li>
  <li><strong>管理层</strong>：各团队的管理角色员工</li>
  <li><strong>员工</strong>：各管理层下属的具体执行员工</li>
</ol>

<h2>节点信息</h2>
<p>每个员工节点（<code>EmployeeNode</code>）显示：</p>
<ul>
  <li><strong>团队色边框</strong>：紫色（管理）/ 蓝色（设计）/ 绿色（生产）</li>
  <li><strong>SVG 进度环</strong>：可视化当前经验值在本等级中的进度</li>
  <li><strong>状态点</strong>：实时显示员工在岗/开发中/规划中/停用状态</li>
  <li><strong>等级徽章</strong>：当前等级数字</li>
  <li><strong>MBTI 徽章</strong>：员工 MBTI 性格类型</li>
  <li><strong>连续活跃天数徽章</strong>：streak 连续工作天数</li>
</ul>

<h2>交互控制</h2>
<ul>
  <li><strong>团队筛选</strong>：仅显示指定团队的节点和连线</li>
  <li><strong>缩放</strong>：鼠标滚轮或控制栏按钮</li>
  <li><strong>自适应视图</strong>：一键重置到最佳视角</li>
  <li><strong>节点拖拽</strong>：可手动调整节点位置（不影响数据）</li>
</ul>

<h2>图例说明</h2>
<table>
  <thead>
    <tr><th>图例元素</th><th>含义</th></tr>
  </thead>
  <tbody>
    <tr><td>紫色边框</td><td>管理团队</td></tr>
    <tr><td>蓝色边框</td><td>设计师团队</td></tr>
    <tr><td>绿色边框</td><td>生产团队</td></tr>
    <tr><td>绿色状态点</td><td>在岗（active）</td></tr>
    <tr><td>黄色状态点</td><td>开发中（developing）</td></tr>
    <tr><td>灰色状态点</td><td>规划中（planned）或停用（inactive）</td></tr>
  </tbody>
</table>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.features,
      title: "系统设置指南",
      summary: "了解系统设置的三个管理模块：员工管理、指标基准配置和数据指标管理。",
      sortOrder: 5,
      content: `<h2>系统设置概览（/settings）</h2>
<p>系统设置提供平台的后台管理功能，分为三个 Tab 页签。</p>

<h2>Tab 1：员工管理</h2>
<p>提供完整的员工 CRUD 操作：</p>
<ul>
  <li><strong>新建员工</strong>：填写姓名、职位、团队、子团队、状态等基本信息</li>
  <li><strong>编辑员工</strong>：修改员工资料，包括描述和 persona JSON</li>
  <li><strong>状态管理</strong>：快速切换员工在岗（active）/ 下岗（inactive）状态</li>
  <li><strong>头像生成</strong>：触发 Gemini AI 生成员工肖像（需配置 <code>GEMINI_API_KEY</code>），生成后自动保存至 <code>public/avatars/{name}.png</code></li>
  <li><strong>删除员工</strong>：级联删除员工的所有关联数据（技能、指标、任务、版本日志等）</li>
</ul>

<h2>Tab 2：指标基准配置</h2>
<p>管理三级指标配置体系（详见「指标配置体系」文章）：</p>
<ul>
  <li>查看和编辑全局基准配置</li>
  <li>添加团队级覆盖配置</li>
  <li>添加员工级覆盖配置</li>
  <li>配置字段：任务类型、人工基准工时（小时）、时薪（元/小时）</li>
</ul>
<p>解析接口 <code>GET /api/metric-configs/resolve?taskType=&amp;employeeId=</code> 会按优先级瀑布查找，返回最终生效的配置。</p>

<h2>Tab 3：数据指标管理</h2>
<p>员工绩效数据、技能指标数据、任务数据的增删改查表格。支持：</p>
<ul>
  <li><strong>分页浏览</strong>：每页可调整显示条数</li>
  <li><strong>筛选过滤</strong>：按员工、时间段、团队等条件过滤</li>
  <li><strong>下钻查看</strong>：点击记录查看关联的详细数据</li>
  <li><strong>数据导出</strong>：支持 CSV 和 Excel 格式导出，接口为 <code>GET /api/data/export?type=&amp;format=csv|xlsx</code></li>
</ul>`,
    },

    // ── 数据指标（4 篇）────────────────────────────────────────────
    {
      id: randomUUID(),
      categoryId: catIds.metrics,
      title: "核心运营指标",
      summary: "平台 9 项核心运营指标的定义、计算公式、单位和取值范围。",
      sortOrder: 1,
      content: `<h2>核心运营指标详解</h2>
<p>以下 9 项指标构成平台的核心运营监控体系，覆盖任务量、效率、质量和团队健康度。</p>
<table>
  <thead>
    <tr><th>指标名称</th><th>英文标识</th><th>单位</th><th>取值范围</th><th>计算公式</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>综合运营指数</td>
      <td><code>operationalIndex</code></td>
      <td>分</td>
      <td>0–100</td>
      <td><code>round(((adoptionRate + accuracyRate) / 2) × 100)</code></td>
      <td>衡量 AI 团队整体运营水平的综合得分</td>
    </tr>
    <tr>
      <td>本月任务量</td>
      <td><code>taskCount</code></td>
      <td>个</td>
      <td>≥ 0</td>
      <td>当月完成任务数汇总</td>
      <td>按月统计</td>
    </tr>
    <tr>
      <td>工具采用率</td>
      <td><code>adoptionRate</code></td>
      <td>%</td>
      <td>0–100</td>
      <td>原始值 0.0–1.0，展示时 × 100</td>
      <td>衡量 AI 工具在业务中的渗透率</td>
    </tr>
    <tr>
      <td>任务准确率</td>
      <td><code>accuracyRate</code></td>
      <td>%</td>
      <td>0–100</td>
      <td>原始值 0.0–1.0，展示时 × 100</td>
      <td>衡量 AI 任务结果的正确性</td>
    </tr>
    <tr>
      <td>节省人工时</td>
      <td><code>humanTimeSaved</code></td>
      <td>小时</td>
      <td>≥ 0</td>
      <td>种子数据：<code>taskCount × 2.5 × random(0.8–1.2)</code></td>
      <td>对比人工完成同等任务所需时间</td>
    </tr>
    <tr>
      <td>节省人力成本</td>
      <td><code>savedCost</code></td>
      <td>元（CNY）</td>
      <td>≥ 0</td>
      <td><code>humanTimeSaved × costPerHour</code></td>
      <td>默认时薪 46.875 元（¥375/天 ÷ 8 小时）</td>
    </tr>
    <tr>
      <td>任务成功率</td>
      <td><code>successRate</code></td>
      <td>%</td>
      <td>0–100</td>
      <td><code>completedTasks / totalTasks × 100</code></td>
      <td>全时段任务完成比例</td>
    </tr>
    <tr>
      <td>完成率</td>
      <td><code>completionRate</code></td>
      <td>%</td>
      <td>0–100</td>
      <td><code>completedTasks / totalTasks × 100</code></td>
      <td>按时间范围过滤的完成比例</td>
    </tr>
    <tr>
      <td>团队健康度</td>
      <td><code>healthRate</code></td>
      <td>%</td>
      <td>0–100</td>
      <td><code>activeEmployees / totalEmployees × 100</code></td>
      <td>在岗率，反映团队可用性</td>
    </tr>
  </tbody>
</table>

<h2>综合运营指数颜色规则</h2>
<ul>
  <li>≥ 80：<strong>绿色</strong>（优秀）</li>
  <li>60–79：<strong>黄色</strong>（良好）</li>
  <li>&lt; 60：<strong>红色</strong>（需关注）</li>
</ul>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.metrics,
      title: "任务质量指标",
      summary: "任务质量评分、Token 用量、费用估算、重试次数及执行耗时的定义与取值范围。",
      sortOrder: 2,
      content: `<h2>任务质量指标（§4.2）</h2>
<p>以下指标记录于 <code>tasks</code> 表，反映单次任务的执行质量和资源消耗。</p>
<table>
  <thead>
    <tr><th>指标</th><th>标识</th><th>范围</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>质量评分</td>
      <td><code>qualityScore</code></td>
      <td>0–100（种子数据：70–97）</td>
      <td>单任务质量打分；运行中任务为 <code>null</code></td>
    </tr>
    <tr>
      <td>Token 用量</td>
      <td><code>tokenUsage</code></td>
      <td>整数（种子数据：1000–8000）</td>
      <td>LLM token 消耗量</td>
    </tr>
    <tr>
      <td>预估费用（API）</td>
      <td><code>estimatedCost</code></td>
      <td>USD</td>
      <td><code>tokenUsage × 0.00015</code></td>
    </tr>
    <tr>
      <td>预估费用（UI 展示）</td>
      <td><code>estimatedCost</code></td>
      <td>元（CNY）</td>
      <td><code>tokenUsage × 0.000006</code>（人民币显示）</td>
    </tr>
    <tr>
      <td>重试次数</td>
      <td><code>retryCount</code></td>
      <td>0–2（种子数据，80% 为 0）</td>
      <td>任务执行期间的自动重试次数</td>
    </tr>
    <tr>
      <td>执行耗时</td>
      <td><code>duration</code></td>
      <td>分钟（种子数据：10–70 分钟）</td>
      <td><code>actualEndTime - startTime</code></td>
    </tr>
  </tbody>
</table>

<h2>技能指标（§4.3）</h2>
<p>以下指标记录于 <code>skill_metrics</code> 表，按技能 + 月份统计。</p>
<table>
  <thead>
    <tr><th>指标</th><th>标识</th><th>范围</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>调用次数</td>
      <td><code>invocationCount</code></td>
      <td>≥ 0</td>
      <td>技能在该月的调用总数</td>
    </tr>
    <tr>
      <td>成功率</td>
      <td><code>successRate</code></td>
      <td>0.0–1.0</td>
      <td>技能调用成功比例（存储为小数）</td>
    </tr>
    <tr>
      <td>平均响应时间</td>
      <td><code>avgResponseTime</code></td>
      <td>秒</td>
      <td>单次调用的平均耗时</td>
    </tr>
    <tr>
      <td>技能等级</td>
      <td><code>level</code></td>
      <td>1–5</td>
      <td>熟练度星级评分，存储于 <code>skills</code> 表</td>
    </tr>
  </tbody>
</table>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.metrics,
      title: "游戏化与成就系统",
      summary: "经验值（XP）、等级、等级称号的计算规则，以及 8 个成就的触发条件。",
      sortOrder: 3,
      content: `<h2>游戏化指标（§4.4）</h2>
<p>平台引入游戏化机制激励 AI 员工持续高质量工作，核心要素包括经验值、等级和连续活跃天数。</p>

<h3>经验值（XP）</h3>
<ul>
  <li><strong>任务 XP</strong>：<code>50 + 50 × (qualityScore / 100)</code>，范围 50–100 XP / 任务</li>
  <li><strong>连续活跃 XP</strong>：
    <ul>
      <li>前 6 天：10 XP / 天</li>
      <li>第 7 天起：20 XP / 天（双倍奖励）</li>
    </ul>
  </li>
</ul>

<h3>等级（Level）</h3>
<p>升级阈值公式：<code>200 × 1.5^(N-1)</code></p>
<ul>
  <li>Level 1：200 XP</li>
  <li>Level 2：300 XP</li>
  <li>Level 3：450 XP</li>
  <li>Level 4：675 XP</li>
  <li>以此类推（每级乘以 1.5）</li>
</ul>

<h3>等级称号</h3>
<table>
  <thead>
    <tr><th>等级范围</th><th>称号</th><th>图标</th></tr>
  </thead>
  <tbody>
    <tr><td>Level 1–3</td><td>新手</td><td>🌱</td></tr>
    <tr><td>Level 4–6</td><td>熟练</td><td>⚡</td></tr>
    <tr><td>Level 7–9</td><td>精英</td><td>🔥</td></tr>
    <tr><td>Level 10–12</td><td>大师</td><td>💎</td></tr>
    <tr><td>Level 13+</td><td>传奇</td><td>👑</td></tr>
  </tbody>
</table>

<h3>连续活跃天数（streak）</h3>
<p>连续有已完成任务的天数，存储于 <code>metrics.streak</code> 字段。断签后重置为 0。</p>

<h2>成就系统（§4.5）</h2>
<p>共 8 个成就，由系统自动检测并解锁，在驾驶舱「成就动态」信息流中展示。</p>
<table>
  <thead>
    <tr><th>成就名称</th><th>英文键</th><th>触发条件</th></tr>
  </thead>
  <tbody>
    <tr><td>首个满分</td><td><code>first_perfect</code></td><td><code>qualityScore === 100</code></td></tr>
    <tr><td>七日之焰</td><td><code>seven_flame</code></td><td><code>streak &gt;= 7</code> 天</td></tr>
    <tr><td>闪电手</td><td><code>flash_hand</code></td><td>单日完成 ≥ 5 个任务</td></tr>
    <tr><td>月度 MVP</td><td><code>mvp</code></td><td>当月 XP 最高</td></tr>
    <tr><td>完美主义</td><td><code>perfectionist</code></td><td>最近 10 个任务 <code>qualityScore</code> 均 &gt; 90</td></tr>
    <tr><td>全能选手</td><td><code>all_rounder</code></td><td>技能数 ≥ 5</td></tr>
    <tr><td>团队之星</td><td><code>team_star</code></td><td>完成 ≥ 3 种不同类型任务</td></tr>
    <tr><td>成长飞速</td><td><code>fast_growth</code></td><td>当月等级提升 ≥ 3</td></tr>
  </tbody>
</table>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.metrics,
      title: "指标配置体系",
      summary: "三级配置优先级、各任务类型的默认基准工时，以及节省人力成本的计算公式。",
      sortOrder: 4,
      content: `<h2>三级配置优先级（§5.1）</h2>
<p>系统采用三级配置结构，用于计算节省人工时和人力成本。优先级从高到低：</p>
<pre><code>员工级覆盖（employeeId ≠ null）
    ↓ 未命中
团队级覆盖（employeeId = null，team ≠ null）
    ↓ 未命中
全局基准（employeeId = null，team = null）</code></pre>
<p>解析接口 <code>GET /api/metric-configs/resolve?taskType=&amp;employeeId=</code> 会依次瀑布查找，返回最终生效的配置。</p>

<h2>默认全局基准（§5.2）</h2>
<table>
  <thead>
    <tr><th>任务类型</th><th>人工基准工时（小时）</th><th>时薪（元/小时）</th><th>备注</th></tr>
  </thead>
  <tbody>
    <tr><td>项目审计</td><td>4（管理团队覆盖：5h）</td><td>46.875</td><td></td></tr>
    <tr><td>绩效评估</td><td>3（管理团队覆盖：4h）</td><td>46.875</td><td></td></tr>
    <tr><td>版本管理</td><td>2</td><td>46.875</td><td></td></tr>
    <tr><td>需求文档</td><td>8</td><td>46.875</td><td></td></tr>
    <tr><td>人员盘点</td><td>6</td><td>46.875</td><td></td></tr>
    <tr><td>剧本创作</td><td>3（生产团队覆盖：4h）</td><td>46.875</td><td></td></tr>
    <tr><td>资源入库</td><td>0.5</td><td>46.875</td><td></td></tr>
    <tr><td>质量检查</td><td>0.25（生产团队覆盖：0.5h）</td><td>46.875</td><td></td></tr>
    <tr><td>音频制作</td><td>2</td><td>46.875</td><td></td></tr>
    <tr><td>字幕制作</td><td>1.5</td><td>46.875</td><td></td></tr>
  </tbody>
</table>

<h2>成本计算公式（§5.3）</h2>
<ul>
  <li><strong>时薪基准</strong>：46.875 元/小时（¥375/天 ÷ 8 小时）</li>
  <li><strong>节省人力成本</strong> = 节省人工时 × 时薪</li>
  <li><strong>Token 费用（API 层）</strong> = <code>tokenUsage × $0.00015</code>（美元）</li>
  <li><strong>Token 费用（UI 展示）</strong> = <code>tokenUsage × ¥0.000006</code>（人民币）</li>
</ul>

<h2>数据库结构</h2>
<p>配置存储于 <code>metric_configs</code> 表：</p>
<table>
  <thead>
    <tr><th>列名</th><th>类型</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>text (PK)</td><td>UUID</td></tr>
    <tr><td><code>employeeId</code></td><td>text (FK, 可 null)</td><td>员工级覆盖时填写</td></tr>
    <tr><td><code>team</code></td><td>text (可 null)</td><td>团队级覆盖时填写</td></tr>
    <tr><td><code>taskType</code></td><td>text</td><td>任务类型名称</td></tr>
    <tr><td><code>humanBaseline</code></td><td>real</td><td>人工基准工时（小时）</td></tr>
    <tr><td><code>costPerHour</code></td><td>real</td><td>时薪（元/小时）</td></tr>
  </tbody>
</table>`,
    },

    // ── 任务工作流（2 篇）────────────────────────────────────────────
    {
      id: randomUUID(),
      categoryId: catIds.workflow,
      title: "任务类型与SOP步骤",
      summary: "20 种任务类型按团队分类，以及每种类型对应的标准化 SOP 步骤序列。",
      sortOrder: 1,
      content: `<h2>任务类型分类（§6.1）</h2>
<p>平台共有 20 种任务类型，按执行团队划分：</p>

<h3>管理团队（7 种）</h3>
<ul>
  <li>项目审计</li>
  <li>绩效评估</li>
  <li>版本管理</li>
  <li>生产管理</li>
  <li>业务分析</li>
  <li>人员盘点</li>
  <li>激励申报</li>
</ul>

<h3>设计师团队（4 种）</h3>
<ul>
  <li>战略规划</li>
  <li>需求文档</li>
  <li>软件设计</li>
  <li>产品方案</li>
</ul>

<h3>生产团队（9 种）</h3>
<ul>
  <li>需求确认</li>
  <li>生产评审</li>
  <li>质量检查</li>
  <li>资源入库</li>
  <li>剧本创作</li>
  <li>角色设计</li>
  <li>图像生成</li>
  <li>音频制作</li>
  <li>字幕制作</li>
</ul>

<h2>SOP 步骤模板（§6.2）</h2>
<p>每种任务类型均有固定的标准化步骤序列（Standard Operating Procedure）：</p>
<table>
  <thead>
    <tr><th>任务类型</th><th>SOP 步骤序列</th></tr>
  </thead>
  <tbody>
    <tr><td>项目审计</td><td>数据采集 → 指标分析 → 风险评估 → 审计报告生成 → 审核校验</td></tr>
    <tr><td>绩效评估</td><td>数据汇总 → 指标计算 → 评估报告 → 结果校验</td></tr>
    <tr><td>版本管理</td><td>变更收集 → 影响分析 → 版本打包 → 发布验证</td></tr>
    <tr><td>生产管理</td><td>任务分配 → 进度追踪 → 异常处理 → 结果汇总</td></tr>
    <tr><td>业务分析</td><td>数据采集 → 清洗处理 → 分析建模 → 报告生成</td></tr>
    <tr><td>人员盘点</td><td>信息采集 → 数据核对 → 缺口分析 → 盘点报告</td></tr>
    <tr><td>激励申报</td><td>绩效汇总 → 资格审核 → 激励计算 → 申报提交</td></tr>
    <tr><td>战略规划</td><td>趋势分析 → 方案制定 → 可行性评估 → 规划输出</td></tr>
    <tr><td>需求文档</td><td>需求收集 → 分析整理 → 文档编写 → 评审修订</td></tr>
    <tr><td>软件设计</td><td>架构分析 → 概要设计 → 详细设计 → 文档输出</td></tr>
    <tr><td>产品方案</td><td>市场调研 → 方案设计 → 原型制作 → 方案评审</td></tr>
    <tr><td>需求确认</td><td>需求解读 → 可行性分析 → 排期评估 → 确认输出</td></tr>
    <tr><td>生产评审</td><td>质量检查 → 标准对照 → 问题标注 → 评审报告</td></tr>
    <tr><td>质量检查</td><td>规范检查 → 内容审核 → 质量评分</td></tr>
    <tr><td>资源入库</td><td>资源解析 → 格式校验 → 标签标注 → 入库归档</td></tr>
    <tr><td>剧本创作</td><td>主题分析 → 大纲生成 → 场景描写 → 对白编写 → 文档输出</td></tr>
    <tr><td>角色设计</td><td>角色定义 → 视觉概念 → 形象生成 → 细节调整</td></tr>
    <tr><td>图像生成</td><td>需求解析 → 素材匹配 → 图像生成 → 质量检查</td></tr>
    <tr><td>音频制作</td><td>文本解析 → 音色匹配 → 语音合成 → BGM 匹配 → 音频输出</td></tr>
    <tr><td>字幕制作</td><td>文本解析 → 时间轴对齐 → 样式排版 → 输出导出</td></tr>
  </tbody>
</table>`,
    },

    {
      id: randomUUID(),
      categoryId: catIds.workflow,
      title: "步骤状态与反思",
      summary: "任务步骤的 5 种状态及流转规则，以及执行反思 JSON 结构和 UI 配色方案。",
      sortOrder: 2,
      content: `<h2>步骤状态流转（§6.3）</h2>
<p>每个任务步骤（<code>task_steps</code> 表）有 5 种状态，流转路径如下：</p>
<pre><code>pending → running → completed
                 ↘ failed
                 ↘ skipped</code></pre>

<h3>状态说明</h3>
<table>
  <thead>
    <tr><th>状态</th><th>说明</th></tr>
  </thead>
  <tbody>
    <tr><td><code>pending</code></td><td>等待执行，尚未开始</td></tr>
    <tr><td><code>running</code></td><td>当前正在执行</td></tr>
    <tr><td><code>completed</code></td><td>成功完成</td></tr>
    <tr><td><code>failed</code></td><td>执行失败</td></tr>
    <tr><td><code>skipped</code></td><td>已跳过（不影响后续步骤）</td></tr>
  </tbody>
</table>

<h3>约束规则</h3>
<p>对于<strong>运行中</strong>的任务，步骤状态需满足以下约束：</p>
<ul>
  <li>有且仅有<strong>一个步骤</strong>处于 <code>running</code> 状态</li>
  <li>该步骤<strong>之前的所有步骤</strong>均为 <code>completed</code></li>
  <li>该步骤<strong>之后的所有步骤</strong>均为 <code>pending</code></li>
</ul>
<p>步骤的思维链内容（COT）存储于 <code>task_steps.thought</code> 字段（可选），约 40–50% 的已完成步骤包含思维链文本。</p>

<h2>任务反思结构（§6.4）</h2>
<p><code>tasks.reflection</code> 字段存储 JSON 结构（<strong>非纯文本</strong>），格式如下：</p>
<pre><code>{
  "problems": ["发现的问题..."],
  "lessons": ["踩过的坑..."],
  "improvements": ["改进建议..."]
}</code></pre>

<h3>反思分类说明</h3>
<table>
  <thead>
    <tr><th>分类</th><th>JSON 键</th><th>UI 配色</th><th>含义</th></tr>
  </thead>
  <tbody>
    <tr><td>发现的问题</td><td><code>problems</code></td><td>琥珀色（amber）</td><td>任务执行中发现的缺陷或异常</td></tr>
    <tr><td>踩过的坑</td><td><code>lessons</code></td><td>红色（red）</td><td>导致失误的教训</td></tr>
    <tr><td>改进建议</td><td><code>improvements</code></td><td>绿色（green）</td><td>下次执行的优化方向</td></tr>
  </tbody>
</table>

<h3>适用范围</h3>
<p>运行中（<code>running</code>）和已完成（<code>completed</code>）的任务<strong>均可包含反思内容</strong>。种子数据中约 50% 的运行中任务和约 30% 的已完成任务包含反思。</p>
<p>在「生产看板」→ 任务详情弹窗 → 「执行反思」Tab 中可查看反思内容。</p>`,
    },
  ];

  await db.insert(helpArticles).values(
    articles.map((a) => ({ ...a, createdAt: now, updatedAt: now }))
  );

  console.log(`Seeded help center: 4 categories, ${articles.length} articles.`);
}

seedHelpDocs().catch(console.error);
