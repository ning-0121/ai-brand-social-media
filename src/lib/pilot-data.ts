import { supabase } from "./supabase";

// ============ Types ============

export interface PilotRun {
  id: string;
  run_name: string;
  owner_id: string | null;
  start_date: string;
  end_date: string;
  status: string;
  summary: string | null;
  created_at: string;
}

export interface PilotTask {
  id: string;
  run_id: string;
  day_number: number;
  role_type: string;
  module_name: string;
  task_title: string;
  expected_result: string | null;
  actual_result: string | null;
  status: string;
  blocker: string | null;
  time_spent_minutes: number | null;
  created_at: string;
}

export interface PilotIssue {
  id: string;
  run_id: string | null;
  severity: string;
  module_name: string;
  title: string;
  description: string | null;
  reproduction_steps: string | null;
  screenshot_url: string | null;
  affects_revenue: boolean;
  affects_execution: boolean;
  suggested_fix: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

export interface PilotFeedback {
  id: string;
  run_id: string | null;
  module_name: string;
  score: number;
  feedback: string | null;
  most_useful: string | null;
  least_useful: string | null;
  time_saved_minutes: number | null;
  would_continue: boolean | null;
  created_at: string;
}

export interface SOP {
  id: string;
  title: string;
  applicable_roles: string[];
  inputs: string[];
  steps: { step: number; action: string; detail: string }[];
  approval_criteria: string[];
  expected_output: string[];
  common_errors: string[];
  acceptance_criteria: string[];
}

// ============ Queries ============

export async function getActiveRun(): Promise<PilotRun | null> {
  const { data } = await supabase
    .from("pilot_runs")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as PilotRun | null;
}

export async function getRuns(): Promise<PilotRun[]> {
  const { data } = await supabase
    .from("pilot_runs")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []) as PilotRun[];
}

export async function getTasksForRun(runId: string): Promise<PilotTask[]> {
  const { data } = await supabase
    .from("pilot_tasks")
    .select("*")
    .eq("run_id", runId)
    .order("day_number")
    .order("created_at");
  return (data || []) as PilotTask[];
}

export async function getIssues(runId?: string): Promise<PilotIssue[]> {
  let query = supabase
    .from("pilot_issues")
    .select("*")
    .order("severity")
    .order("created_at", { ascending: false });
  if (runId) query = query.eq("run_id", runId);
  const { data } = await query;
  return (data || []) as PilotIssue[];
}

export async function getFeedback(runId?: string): Promise<PilotFeedback[]> {
  let query = supabase
    .from("pilot_feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (runId) query = query.eq("run_id", runId);
  const { data } = await query;
  return (data || []) as PilotFeedback[];
}

// ============ Create Run + Seed Tasks ============

export async function createPilotRun(
  name: string,
  ownerId: string
): Promise<PilotRun> {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const { data: run, error } = await supabase
    .from("pilot_runs")
    .insert({
      run_name: name,
      owner_id: ownerId,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      status: "active",
    })
    .select()
    .single();

  if (error || !run) throw new Error(error?.message || "创建试跑失败");

  // Seed 7-day tasks
  await supabase.from("pilot_tasks").insert(
    SEVEN_DAY_TASKS.map((t) => ({ ...t, run_id: run.id }))
  );

  return run as PilotRun;
}

// ============ 7 Day Task Seed ============

const SEVEN_DAY_TASKS = [
  // Day 1 — 基础设置
  { day_number: 1, role_type: "owner", module_name: "settings", task_title: "连接 Shopify 店铺", expected_result: "Shopify 数据同步到系统，Dashboard 显示实际数据" },
  { day_number: 1, role_type: "owner", module_name: "settings", task_title: "设置 Brand Profile", expected_result: "品牌调性、目标受众、禁用词等已保存" },
  { day_number: 1, role_type: "owner", module_name: "store", task_title: "运行一次 Store Audit", expected_result: "诊断报告生成，发现至少 3 个可优化项" },
  { day_number: 1, role_type: "owner", module_name: "approvals", task_title: "审批一个 SEO 更新", expected_result: "SEO 优化推送到 Shopify，产品页更新" },

  // Day 2 — 内容生产
  { day_number: 2, role_type: "operator", module_name: "content", task_title: "生成 5 条社媒内容", expected_result: "5 条不同平台的帖子生成完成" },
  { day_number: 2, role_type: "operator", module_name: "approvals", task_title: "审批生成的内容", expected_result: "内容进入发布队列" },
  { day_number: 2, role_type: "operator", module_name: "social", task_title: "发布到社媒草稿", expected_result: "内容出现在社媒平台草稿箱" },

  // Day 3 — 创意中心
  { day_number: 3, role_type: "designer", module_name: "creative", task_title: "创建活动素材包", expected_result: "Banner + 社媒文案 + Email 素材生成" },
  { day_number: 3, role_type: "designer", module_name: "creative", task_title: "生成 Landing Page", expected_result: "着陆页 HTML 可预览" },
  { day_number: 3, role_type: "designer", module_name: "creative", task_title: "生成 Banner / 海报", expected_result: "至少 1 张可用的海报" },

  // Day 4 — 数据分析
  { day_number: 4, role_type: "owner", module_name: "dashboard", task_title: "查看通知中心", expected_result: "看到最近的审批、失败、运维通知" },
  { day_number: 4, role_type: "owner", module_name: "analytics", task_title: "查看 Analytics 数据", expected_result: "本周 vs 上周 KPI 对比可见" },
  { day_number: 4, role_type: "owner", module_name: "ops-cockpit", task_title: "检查 AI Impact 效果", expected_result: "看到 AI 操作的 before/after 指标" },

  // Day 5 — 模板系统
  { day_number: 5, role_type: "operator", module_name: "creative", task_title: "用模板创建社媒内容", expected_result: "基于模板生成的内容结构更规范" },
  { day_number: 5, role_type: "designer", module_name: "creative", task_title: "用模板创建活动页", expected_result: "活动页按照模板结构生成" },
  { day_number: 5, role_type: "operator", module_name: "creative", task_title: "导出素材包", expected_result: "素材包可下载或查看" },

  // Day 6 — 团队协作
  { day_number: 6, role_type: "owner", module_name: "settings", task_title: "邀请第二个角色加入团队", expected_result: "邀请已发送，成员可登录" },
  { day_number: 6, role_type: "operator", module_name: "settings", task_title: "测试角色权限", expected_result: "Viewer 不能编辑，Editor 不能管理团队" },
  { day_number: 6, role_type: "operator", module_name: "approvals", task_title: "提交审批并由 Owner 审批", expected_result: "审批流程端到端通过" },

  // Day 7 — 汇总
  { day_number: 7, role_type: "owner", module_name: "pilot", task_title: "汇总所有问题到问题池", expected_result: "所有发现的问题已分类分级" },
  { day_number: 7, role_type: "owner", module_name: "pilot", task_title: "提交使用反馈", expected_result: "每个模块都有评分和文字反馈" },
  { day_number: 7, role_type: "owner", module_name: "pilot", task_title: "查看试跑 Metrics", expected_result: "通过率、使用率、节省时间等数据清晰" },
  { day_number: 7, role_type: "owner", module_name: "pilot", task_title: "输出下阶段优化建议", expected_result: "基于试跑数据制定优化计划" },
];

// ============ SOPs ============

export const DEFAULT_SOPS: SOP[] = [
  {
    id: "sop-shopify-seo",
    title: "如何优化一个 Shopify 产品页",
    applicable_roles: ["owner", "operator"],
    inputs: ["已连接的 Shopify 店铺", "至少 1 个已同步的产品"],
    steps: [
      { step: 1, action: "进入店铺优化", detail: "导航到「店铺优化」页面" },
      { step: 2, action: "选择产品", detail: "在产品列表中找到目标产品，点击 SEO 优化图标" },
      { step: 3, action: "AI 生成建议", detail: "点击「开始 AI 优化」，等待 AI 生成 SEO 文案" },
      { step: 4, action: "编辑优化内容", detail: "在左右对比中查看并编辑 AI 建议的标题、描述、Meta 标签" },
      { step: 5, action: "选择应用方式", detail: "点击「快速应用」直接推送到 Shopify，或「提交审批」走审批流程" },
      { step: 6, action: "验证结果", detail: "前往 Shopify Admin 确认产品页已更新" },
    ],
    approval_criteria: ["SEO 标题不超过 60 字符", "Meta Description 不超过 160 字符", "关键词自然融入，不堆砌"],
    expected_output: ["Shopify 产品标题更新", "Meta Title/Description 更新", "Tags 更新", "产品描述优化"],
    common_errors: ["Shopify 未连接导致推送失败", "Access Token 过期", "描述过长被 Shopify 截断"],
    acceptance_criteria: ["SEO 分数提升 ≥ 10 分", "Shopify Admin 中可见更新", "页面 Google 预览正确"],
  },
  {
    id: "sop-social-content",
    title: "如何生成并发布一周社媒内容",
    applicable_roles: ["operator"],
    inputs: ["已同步的产品数据", "已设置的品牌画像", "已连接的社媒平台"],
    steps: [
      { step: 1, action: "进入内容工厂", detail: "导航到「内容工厂」页面" },
      { step: 2, action: "选择 Social Post Pack 技能", detail: "从技能列表中选择「社媒帖子包」" },
      { step: 3, action: "选择产品和平台", detail: "选择要推广的产品和目标平台（Instagram/TikTok）" },
      { step: 4, action: "AI 生成内容", detail: "点击执行，AI 会生成 3 条不同角度的帖子（种草/场景/证言）" },
      { step: 5, action: "审批内容", detail: "在审批中心查看生成的内容，修改后批准" },
      { step: 6, action: "发布到平台", detail: "在社媒规划页面点击「Publish Now」发布到平台" },
    ],
    approval_criteria: ["文案符合品牌调性", "Hashtag 数量 5-15 个", "无品牌禁用词", "配图描述适合生成"],
    expected_output: ["3 条平台适配的社媒帖子", "对应的配图 Prompt", "Hashtag 列表"],
    common_errors: ["社媒平台未 OAuth 授权", "内容审批后卡在队列", "图片不符合平台尺寸要求"],
    acceptance_criteria: ["帖子出现在平台草稿或已发布", "互动率基线可追踪"],
  },
  {
    id: "sop-campaign-pack",
    title: "如何生成一个活动素材包",
    applicable_roles: ["designer", "operator"],
    inputs: ["活动名称", "活动类型", "关联产品（可选）"],
    steps: [
      { step: 1, action: "进入创意中心", detail: "导航到「创意中心」页面" },
      { step: 2, action: "选择活动策划", detail: "点击「活动策划」快速创建" },
      { step: 3, action: "填写活动 Brief", detail: "输入活动名称、类型、关联产品" },
      { step: 4, action: "AI 生成素材", detail: "系统自动生成 Banner + 社媒文案 + Email 素材" },
      { step: 5, action: "审批素材包", detail: "在审批中心查看所有生成的素材，逐项确认" },
      { step: 6, action: "导出素材", detail: "审批通过后，在素材包详情页下载完整 Asset Pack" },
    ],
    approval_criteria: ["Banner 设计符合品牌视觉", "文案一致", "所有必需素材已生成"],
    expected_output: ["Banner HTML", "社媒帖子文案", "Email 文案", "完整 Asset Pack JSON"],
    common_errors: ["生成超时（Vercel 60s 限制）", "部分素材标记为 pending", "导出格式不完整"],
    acceptance_criteria: ["所有 4 类素材已生成", "Asset Pack 可下载", "素材可直接用于投放"],
  },
];
