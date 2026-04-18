import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";
import { executeSkill } from "./content-skills/executor";
import { updateProductSEO, updateProductBodyHtml } from "./shopify-operations";
import { getDashboardKPIs, getStoreKPIs } from "./supabase-queries";
import { createApprovalTask } from "./supabase-approval";
import { reviewContent } from "./content-qa";
import { productContentPipeline, socialContentPipeline, campaignPipeline } from "./content-pipeline";
import { executeAgentPool } from "./agent-pool";

// ============ Types ============

export interface AuditIssue {
  severity: "critical" | "warning" | "info";
  message: string;
  affected_count?: number;
}

export interface AuditDimension {
  name: string;
  score: number;
  maxScore: number;
  issues: AuditIssue[];
}

export interface StoreAudit {
  overall_score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: AuditDimension[];
  ai_diagnosis: string;
  recommended_phase: "foundation" | "traffic" | "conversion";
  phase_rationale: string;
}

export interface ProposedGoal {
  module: string;
  metric: string;
  current_value: number;
  target_value: number;
  unit: string;
  deadline: string;
  rationale: string;
  execution_plan: string;
  estimated_effort: string;
  phase: string;
}

export interface GoalProposal {
  audit: StoreAudit;
  current_phase: string;
  phase_description: string;
  proposed_goals: ProposedGoal[];
}

// ============ 0. 全面店铺审计 ============

export async function auditStore(): Promise<StoreAudit> {
  // ─── 收集全量数据 ───
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, price, stock, status, seo_score, category, image_url, meta_title, meta_description, body_html, tags, handle, compare_at_price, shopify_product_id")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const all = products || [];
  const total = all.length;

  const dashKPIs = await getDashboardKPIs();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: recentPosts } = await supabase
    .from("scheduled_posts").select("*", { count: "exact", head: true })
    .eq("status", "published").gte("created_at", thirtyDaysAgo);

  const { count: connectedAccounts } = await supabase
    .from("social_accounts").select("*", { count: "exact", head: true }).eq("connected", true);

  // ─── A. 产品基础设施（30 分）───
  const noCategory = all.filter(p => !p.category || p.category === "未分类").length;
  const noTags = all.filter(p => !p.tags || p.tags.trim() === "").length;
  const noBody = all.filter(p => !p.body_html || p.body_html.length < 100).length;
  const noImage = all.filter(p => !p.image_url).length;
  const badHandle = all.filter(p => p.handle && (/copy/.test(p.handle) || /^\d+$/.test(p.handle))).length;

  const infraIssues: AuditIssue[] = [];
  let infraScore = 30;

  if (total > 0) {
    const catPct = noCategory / total;
    if (catPct > 0.5) { infraScore -= 8; infraIssues.push({ severity: "critical", message: `${noCategory}/${total} 商品没有分类（product_type 为空）`, affected_count: noCategory }); }
    else if (catPct > 0) { infraScore -= 3; infraIssues.push({ severity: "warning", message: `${noCategory} 个商品缺少分类`, affected_count: noCategory }); }

    const tagPct = noTags / total;
    if (tagPct > 0.5) { infraScore -= 7; infraIssues.push({ severity: "critical", message: `${noTags}/${total} 商品没有标签，搜索和推荐无法工作`, affected_count: noTags }); }
    else if (tagPct > 0) { infraScore -= 3; infraIssues.push({ severity: "warning", message: `${noTags} 个商品缺少标签`, affected_count: noTags }); }

    const bodyPct = noBody / total;
    if (bodyPct > 0.5) { infraScore -= 8; infraIssues.push({ severity: "critical", message: `${noBody}/${total} 商品描述过短或缺失（<100字），严重影响转化`, affected_count: noBody }); }
    else if (bodyPct > 0) { infraScore -= 4; infraIssues.push({ severity: "warning", message: `${noBody} 个商品描述过短`, affected_count: noBody }); }

    if (noImage > 0) { infraScore -= 4; infraIssues.push({ severity: "critical", message: `${noImage} 个商品缺少图片`, affected_count: noImage }); }
    if (badHandle > 0) { infraScore -= 3; infraIssues.push({ severity: "warning", message: `${badHandle} 个商品 URL handle 不规范（含 copy 或纯数字）`, affected_count: badHandle }); }
  } else {
    infraScore = 0;
    infraIssues.push({ severity: "critical", message: "没有同步任何 Shopify 商品" });
  }
  infraScore = Math.max(0, infraScore);

  // ─── B. SEO 健康度（25 分）───
  const avgSeo = total > 0 ? Math.round(all.reduce((s, p) => s + (p.seo_score || 0), 0) / total) : 0;
  const noMetaTitle = all.filter(p => !p.meta_title).length;
  const noMetaDesc = all.filter(p => !p.meta_description).length;
  const dupTitle = all.filter(p => p.meta_title && p.meta_title.trim().toLowerCase() === p.name.trim().toLowerCase()).length;

  const seoIssues: AuditIssue[] = [];
  let seoScore = 25;

  if (total > 0) {
    if (avgSeo < 40) { seoScore -= 10; seoIssues.push({ severity: "critical", message: `平均 SEO 分仅 ${avgSeo}/100，远低于及格线` }); }
    else if (avgSeo < 60) { seoScore -= 5; seoIssues.push({ severity: "warning", message: `平均 SEO 分 ${avgSeo}/100，有提升空间` }); }

    if (noMetaTitle / total > 0.3) { seoScore -= 6; seoIssues.push({ severity: "critical", message: `${noMetaTitle}/${total} 商品缺少 meta_title，Google 搜索结果没有优化标题`, affected_count: noMetaTitle }); }
    else if (noMetaTitle > 0) { seoScore -= 2; seoIssues.push({ severity: "warning", message: `${noMetaTitle} 个商品缺少 meta_title`, affected_count: noMetaTitle }); }

    if (noMetaDesc / total > 0.3) { seoScore -= 5; seoIssues.push({ severity: "critical", message: `${noMetaDesc}/${total} 商品缺少 meta_description`, affected_count: noMetaDesc }); }
    else if (noMetaDesc > 0) { seoScore -= 2; seoIssues.push({ severity: "warning", message: `${noMetaDesc} 个商品缺少 meta_description`, affected_count: noMetaDesc }); }

    if (dupTitle > 0) { seoScore -= 4; seoIssues.push({ severity: "warning", message: `${dupTitle} 个商品 meta_title 与商品名完全相同，没有 SEO 优化`, affected_count: dupTitle }); }
  }
  seoScore = Math.max(0, seoScore);

  // ─── C. 定价策略（15 分）───
  const noComparePrice = all.filter(p => !p.compare_at_price || p.compare_at_price === 0).length;
  const prices = all.map(p => p.price).filter(Boolean).sort((a, b) => a - b);
  const uniquePrices = new Set(prices.map(p => Math.round(p)));

  const pricingIssues: AuditIssue[] = [];
  let pricingScore = 15;

  if (total > 0) {
    const noComparePct = noComparePrice / total;
    if (noComparePct > 0.8) { pricingScore -= 8; pricingIssues.push({ severity: "critical", message: `${noComparePrice}/${total} 商品没有划线价（compare_at_price），促销折扣无感知`, affected_count: noComparePrice }); }
    else if (noComparePct > 0.3) { pricingScore -= 4; pricingIssues.push({ severity: "warning", message: `${noComparePrice} 个商品没有划线价`, affected_count: noComparePrice }); }

    if (uniquePrices.size <= 2 && total > 5) { pricingScore -= 4; pricingIssues.push({ severity: "warning", message: `只有 ${uniquePrices.size} 个价格档位（${Array.from(uniquePrices).join(", ")}），价格带过于集中` }); }

    if (prices.length > 0) {
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      pricingIssues.push({ severity: "info", message: `价格范围 $${prices[0]}-$${prices[prices.length - 1]}，均价 $${Math.round(avgPrice)}` });
    }
  }
  pricingScore = Math.max(0, pricingScore);

  // ─── D. 社媒内容（15 分）───
  const socialIssues: AuditIssue[] = [];
  let socialScore = 15;

  const postCount = recentPosts || 0;
  const accountCount = connectedAccounts || 0;

  if (postCount === 0) { socialScore -= 10; socialIssues.push({ severity: "critical", message: "过去 30 天零社媒发布，没有内容曝光" }); }
  else if (postCount < 10) { socialScore -= 5; socialIssues.push({ severity: "warning", message: `过去 30 天仅发布 ${postCount} 条，远低于每日 1 条的基准`, affected_count: postCount }); }

  if (accountCount === 0) { socialScore -= 5; socialIssues.push({ severity: "critical", message: "没有连接任何社媒账号" }); }
  else if (accountCount < 2) { socialScore -= 2; socialIssues.push({ severity: "warning", message: `仅连接 ${accountCount} 个社媒账号，建议至少 2 个平台` }); }
  else { socialIssues.push({ severity: "info", message: `已连接 ${accountCount} 个社媒账号` }); }

  socialScore = Math.max(0, socialScore);

  // ─── E. 销售表现（15 分）───
  const salesIssues: AuditIssue[] = [];
  let salesScore = 15;

  const revenue = dashKPIs?.totalRevenue || 0;
  const orders = dashKPIs?.totalOrders || 0;
  const revTrend = dashKPIs?.revenueTrend || 0;
  const outOfStock = all.filter(p => (p.stock || 0) === 0).length;

  if (revenue === 0) { salesScore -= 8; salesIssues.push({ severity: "critical", message: "过去 30 天零营收" }); }
  else if (revTrend < -20) { salesScore -= 5; salesIssues.push({ severity: "critical", message: `营收下降 ${Math.abs(revTrend).toFixed(1)}%，需要紧急干预` }); }
  else if (revTrend < 0) { salesScore -= 2; salesIssues.push({ severity: "warning", message: `营收下降 ${Math.abs(revTrend).toFixed(1)}%` }); }
  else { salesIssues.push({ severity: "info", message: `30 天营收 $${revenue.toFixed(0)}，增长 ${revTrend.toFixed(1)}%` }); }

  if (orders > 0) { salesIssues.push({ severity: "info", message: `${orders} 笔订单，客单价 $${(dashKPIs?.aov || 0).toFixed(0)}` }); }

  const oosPercent = total > 0 ? outOfStock / total : 0;
  if (oosPercent > 0.3) { salesScore -= 5; salesIssues.push({ severity: "critical", message: `${outOfStock}/${total} 商品缺货（${(oosPercent * 100).toFixed(0)}%）`, affected_count: outOfStock }); }
  else if (outOfStock > 0) { salesScore -= 2; salesIssues.push({ severity: "warning", message: `${outOfStock} 个商品缺货`, affected_count: outOfStock }); }

  salesScore = Math.max(0, salesScore);

  // ─── 汇总 ───
  const dimensions: AuditDimension[] = [
    { name: "产品基础设施", score: infraScore, maxScore: 30, issues: infraIssues },
    { name: "SEO 健康度", score: seoScore, maxScore: 25, issues: seoIssues },
    { name: "定价策略", score: pricingScore, maxScore: 15, issues: pricingIssues },
    { name: "社媒内容", score: socialScore, maxScore: 15, issues: socialIssues },
    { name: "销售表现", score: salesScore, maxScore: 15, issues: salesIssues },
  ];

  const overall = dimensions.reduce((s, d) => s + d.score, 0);
  const grade = overall >= 85 ? "A" : overall >= 70 ? "B" : overall >= 55 ? "C" : overall >= 40 ? "D" : "F" as const;

  // 判断当前阶段
  const recommended_phase = (overall < 60 || infraScore < 20) ? "foundation"
    : overall < 80 ? "traffic"
    : "conversion" as const;

  const phaseNames = { foundation: "修地基", traffic: "引流量", conversion: "做转化" };
  const phaseDescs = {
    foundation: "店铺基础设施不完善，需要先补全产品信息、SEO 元数据、定价策略，打好地基再引流",
    traffic: "基础设施基本到位，现在重点是通过 SEO、社媒内容和广告把流量做起来",
    conversion: "流量已有基础，重点优化转化率、邮件营销、用户评价和复购",
  };

  // 一次 AI 调用生成人话诊断
  const criticalIssues = dimensions.flatMap(d => d.issues.filter(i => i.severity === "critical").map(i => i.message));

  const aiResult = await callLLM(
    `你是月销百万的 Shopify DTC 操盘手。用一段话（3-4 句）诊断这个店铺当前最紧迫的问题。不要说废话，直接指出问题和后果。`,
    `店铺审计结果：总分 ${overall}/100（${grade} 级）
当前阶段：${phaseNames[recommended_phase]}
关键问题：
${criticalIssues.map(i => `- ${i}`).join("\n") || "无严重问题"}
商品数：${total}，均价 $${prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0}
30 天营收：$${revenue.toFixed(0)}，订单 ${orders} 笔
社媒发布：${postCount} 条/月

用一段话诊断，直接说问题。不要返回 JSON。`,
    500
  );

  const ai_diagnosis = typeof aiResult === "string" ? aiResult
    : (aiResult as Record<string, unknown>).raw_text as string
    || criticalIssues.join("；") || "店铺状况良好";

  return {
    overall_score: overall,
    grade,
    dimensions,
    ai_diagnosis,
    recommended_phase,
    phase_rationale: phaseDescs[recommended_phase],
  };
}

export async function proposeGoals(): Promise<GoalProposal> {
  // 1. 先做全面审计
  const audit = await auditStore();

  // 2. 获取已有目标（避免重复）
  const { data: existingGoals } = await supabase
    .from("ops_goals").select("*").eq("status", "active");

  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000).toISOString().split("T")[0];

  const phaseNames: Record<string, string> = { foundation: "修地基", traffic: "引流量", conversion: "做转化" };
  const phaseGoalGuide: Record<string, string> = {
    foundation: `当前在【修地基】阶段。目标必须聚焦在：
- 补全产品 meta_title/meta_description（提升 seo_score）
- 充实产品描述 body_html
- 设置 compare_at_price 划线价
- 补全 tags 和 product_type
不要提流量和转化相关的目标，地基没修好引流是浪费钱。`,
    traffic: `当前在【引流量】阶段。基础设施已达标，目标聚焦在：
- 社媒内容发布量（published_posts）
- SEO 分数继续提升（seo_score）
- 广告投放准备
不要提转化优化的目标，先有流量再谈转化。`,
    conversion: `当前在【做转化】阶段。流量有基础，目标聚焦在：
- 提升营收（revenue）和订单（orders）
- 提高客单价（aov）
- 邮件营销和复购`,
  };

  // 3. 基于审计结果让 AI 提目标
  const allIssues = audit.dimensions.flatMap(d => d.issues.filter(i => i.severity !== "info").map(i => `[${d.name}] ${i.message}`));

  const result = await callLLM(
    `你是月销百万的 Shopify DTC 操盘手。基于店铺审计结果，提出 2-3 个目标。

${phaseGoalGuide[audit.recommended_phase]}

规则：
1. 每个目标必须有具体数字，基于审计数据合理推算
2. metric 只能用：revenue, orders, aov, seo_score, customers, published_posts
3. 每个目标附带执行方案（用什么 skill、做什么动作、多少步）
4. deadline 统一 ${thirtyDaysLater}
5. phase 必须填 "${audit.recommended_phase}"
6. 已有目标不要重复：${JSON.stringify((existingGoals || []).map(g => g.metric))}

返回 JSON，不要解释。`,
    `店铺审计报告：
总分：${audit.overall_score}/100（${audit.grade} 级）
当前阶段：${phaseNames[audit.recommended_phase]}
AI 诊断：${audit.ai_diagnosis}

各维度得分：
${audit.dimensions.map(d => `${d.name}: ${d.score}/${d.maxScore}`).join("\n")}

关键问题：
${allIssues.join("\n")}

返回格式：
{
  "proposed_goals": [
    {
      "module": "store 或 social",
      "metric": "指标名",
      "current_value": 当前值,
      "target_value": 目标值,
      "unit": "单位",
      "deadline": "${thirtyDaysLater}",
      "rationale": "用审计数据说话",
      "execution_plan": "具体步骤",
      "estimated_effort": "预计耗时",
      "phase": "${audit.recommended_phase}"
    }
  ]
}`,
    2000
  );

  const goals = ((result as Record<string, unknown>).proposed_goals as ProposedGoal[]) || [];

  return {
    audit,
    current_phase: audit.recommended_phase,
    phase_description: audit.phase_rationale,
    proposed_goals: goals.map(g => ({ ...g, phase: g.phase || audit.recommended_phase })),
  };
}

export async function adoptGoals(goals: ProposedGoal[]): Promise<string[]> {
  const ids: string[] = [];
  for (const goal of goals) {
    const { data } = await supabase.from("ops_goals").insert({
      module: goal.module,
      metric: goal.metric,
      target_value: goal.target_value,
      baseline_value: goal.current_value,
      current_value: goal.current_value,
      unit: goal.unit || "",
      deadline: goal.deadline,
    }).select("id").single();
    if (data) ids.push(data.id);
  }
  return ids;
}

// ============ 1. Generate Weekly Plan ============
export async function generateWeeklyPlan(module: "social" | "store"): Promise<string> {
  // Get current goals
  const { data: goals } = await supabase
    .from("ops_goals").select("*").eq("module", module).eq("status", "active");

  // Get recent performance
  const { data: snapshots } = await supabase
    .from("ops_performance_snapshots").select("*").eq("module", module)
    .order("snapshot_date", { ascending: false }).limit(14);

  // Get last week's plan and review — 不截断
  const { data: lastPlans } = await supabase
    .from("ops_weekly_plans").select("*").eq("module", module)
    .order("week_start", { ascending: false }).limit(1);

  // Get ALL products — 不截断，完整传入
  const { data: products } = await supabase
    .from("products").select("id, name, category, seo_score, price, stock, meta_title, meta_description, body_html, tags, shopify_product_id")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  // Get radar signals
  const { data: signals } = await supabase
    .from("radar_signals").select("*").eq("status", "open").limit(5);

  // 真实销售数据 — 让 AI 知道哪些商品卖得好，哪些滞销
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recentOrders } = await supabase
    .from("shopify_orders")
    .select("line_items, total_price, financial_status")
    .gte("created_at", thirtyDaysAgo)
    .limit(1000);

  // 按 product_id 聚合销量
  const salesByProduct: Record<string, { units: number; revenue: number }> = {};
  let totalRevenue = 0, orderCount = 0;
  for (const o of recentOrders || []) {
    if (o.financial_status !== "paid" && o.financial_status !== "partially_refunded") continue;
    orderCount++;
    totalRevenue += Number(o.total_price || 0);
    const items = (o.line_items as Array<{ product_id?: number | string; quantity?: number; price?: number }>) || [];
    for (const item of items) {
      const pid = String(item.product_id || "");
      if (!pid) continue;
      if (!salesByProduct[pid]) salesByProduct[pid] = { units: 0, revenue: 0 };
      salesByProduct[pid].units += item.quantity || 0;
      salesByProduct[pid].revenue += (item.price || 0) * (item.quantity || 0);
    }
  }
  // Top sellers + slow movers（按 shopify_product_id 匹配本地 product）
  const salesRanked = (products || []).map(p => ({
    ...p,
    sold_30d: salesByProduct[String(p.shopify_product_id)]?.units || 0,
    revenue_30d: salesByProduct[String(p.shopify_product_id)]?.revenue || 0,
  })).sort((a, b) => b.revenue_30d - a.revenue_30d);
  const topSellers = salesRanked.slice(0, 5);
  const slowMovers = salesRanked.filter(p => p.sold_30d === 0 && (p.stock || 0) > 0).slice(0, 10);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const taskTypes = module === "social"
    ? "post (发社媒帖子), engage (生成互动回复), hashtag_strategy (生成标签策略), content_calendar (排期规划), short_video_script (短视频脚本)"
    : "seo_fix (修复商品 SEO), detail_page (优化详情页), homepage_update (更新首页), landing_page (创建落地页), new_product_content (新品内容制作), discount_create (创建折扣码拉销量), bundle_page (创建套装交叉销售页), winback_email (弃购挽回邮件文案)";

  // 构建产品摘要 — 完整但结构化
  const productSummary = (products || []).map(p => {
    const issues: string[] = [];
    if (!p.meta_title) issues.push("无meta_title");
    if (!p.meta_description) issues.push("无meta_desc");
    if (!p.body_html || p.body_html.length < 100) issues.push("描述过短");
    if (!p.tags) issues.push("无标签");
    if ((p.stock || 0) === 0) issues.push("缺货");
    return `[${p.id}] ${p.name} | 价格:${p.price} | SEO:${p.seo_score} | ${issues.length > 0 ? issues.join(",") : "✓"}`;
  }).join("\n");

  // 上周复盘摘要
  const lastPlan = lastPlans?.[0];
  const lastReview = lastPlan?.review as Record<string, unknown> | null;
  const lastStrategy = lastPlan?.strategy as Record<string, unknown> | null;

  // 优先走 DB 里的顶级运营专家 prompt（可随时改版本、滚动评分）
  const { tryRunPrompt } = await import("./prompts");
  const expertResult = await tryRunPrompt("expert.ops.strategist", {
    total_revenue_30d: totalRevenue.toFixed(0),
    order_count_30d: orderCount,
    aov: orderCount > 0 ? (totalRevenue / orderCount).toFixed(1) : "0",
    top_sellers: topSellers.map((p, i) =>
      `${i+1}. [${p.id}] ${p.name} — 售 ${p.sold_30d}/30d, 营收 $${p.revenue_30d.toFixed(0)}, 价 $${p.price}, 库存 ${p.stock || 0}`
    ).join("\n") || "无销售数据",
    slow_movers: slowMovers.map(p =>
      `- [${p.id}] ${p.name}（库存 ${p.stock}, 价 $${p.price}, 0 销量/30d）`
    ).join("\n") || "无滞销品",
    goals_progress: (goals || []).map(g =>
      `- ${g.metric}: ${g.current_value}/${g.target_value} ${g.unit}（截止 ${g.deadline}）`
    ).join("\n") || "暂无目标",
    last_week_review: lastReview
      ? `得分 ${(lastReview as Record<string, unknown>).overall_score}/100 · ${JSON.stringify(lastReview).slice(0, 300)}`
      : "首周无复盘",
  }, { source: "generateWeeklyPlan" });

  if (expertResult?.tasks && Array.isArray(expertResult.tasks)) {
    // 用专家 prompt 结果，走下方写入逻辑
    const taskList = expertResult.tasks as Array<Record<string, unknown>>;
    const weekStart = weekStartStr;
    const planData = {
      module,
      week_start: weekStart,
      strategy: expertResult.strategy || {},
      task_count: taskList.length,
    };
    const { data: plan } = await supabase.from("ops_weekly_plans").insert(planData).select().single();
    if (plan) {
      const dailyTasks = taskList.map((t, idx) => {
        const taskDate = new Date(weekStart);
        taskDate.setDate(taskDate.getDate() + ((t.day_offset as number) || Math.floor(idx / 3)));
        return {
          plan_id: plan.id,
          module,
          task_date: taskDate.toISOString().split("T")[0],
          task_type: t.task_type as string,
          title: t.title as string,
          description: t.description as string || "",
          target_product_id: (t.target_product_id as string) || null,
          target_product_name: (t.target_product_name as string) || null,
          auto_executable: t.auto_executable !== false,
          expected_impact: t.expected_impact as string || null,
          execution_status: "pending",
        };
      });
      if (dailyTasks.length > 0) {
        await supabase.from("ops_daily_tasks").insert(dailyTasks);
      }
      return plan.id;
    }
  }

  // 专家 prompt 不在 DB 或失败 → 回退硬编码路径
  const result = await callLLM(
    `你是月销百万的 Shopify DTC 品牌操盘手。你在排本周的执行计划，不是写报告。

可用任务类型：[${taskTypes}]
自动执行：seo_fix, detail_page, post, engage, hashtag_strategy, short_video_script
需要审批：landing_page, homepage_update, new_product_content

规则：
1. 每个任务必须解决一个具体问题，指向具体的商品或内容
2. 好任务示例：
   ✅ "为热销 TOP1 Blush Flare Leggings 创建套装页（交叉销售 Coast Top，30 天卖了 47 件 vs Coast 3 件）"
   ✅ "为滞销 Mist Zip Hoodie 创建 15% 折扣码（30 天 0 销量，库存 62 件）"
   ❌ "优化低 SEO 分商品" — 太笼统
3. **销售导向**：一切以推动订单为目标
   - 热销 TOP 5：加码社媒内容 + 交叉销售 + 首页 Hero 推广 — 不要打折（已经在卖）
   - 滞销品：discount_create（给 10-20% 折扣码）或 bundle_page（和热销品做套装）
   - 弃购率高时：winback_email 挽回邮件
4. 每周必须至少包含：1 个 discount_create + 1 个 bundle_page + 继续 seo_fix 对 SEO 差商品
5. 节奏：自动执行任务安排在前 2 天，需审批任务后 3 天
6. target_product_id 必须用上面产品列表中的真实 UUID
7. 所有 auto_executable 任务必须设为 true，但以下需审批：landing_page, homepage_update, new_product_content, discount_create

返回 JSON，不要有解释。`,
    `模块: ${module}
本周: ${weekStartStr} 开始
今天: ${today.toISOString().split("T")[0]}

【30 天真实销售数据 — 优先围绕真实数据排计划】
总营收: $${totalRevenue.toFixed(0)} · 订单: ${orderCount} 单 · 客单价: $${orderCount > 0 ? (totalRevenue / orderCount).toFixed(1) : 0}

热销 TOP 5（集中加码这些 — 多做内容、交叉销售、别打折）:
${topSellers.map((p, i) => `${i+1}. [${p.id}] ${p.name} — 售出 ${p.sold_30d} 件, 营收 $${p.revenue_30d.toFixed(0)}`).join("\n") || "暂无销售数据"}

滞销（有库存但 30 天 0 销量 — 优先 discount_create 或 bundle_page 去库存）:
${slowMovers.map(p => `- [${p.id}] ${p.name}（库存 ${p.stock}, 价格 $${p.price}）`).join("\n") || "无明显滞销品"}

当前目标:
${(goals || []).map(g => `- ${g.metric}: 当前 ${g.current_value}/${g.target_value} ${g.unit}（截止 ${g.deadline}）`).join("\n") || "暂无目标"}

${lastReview ? `上周复盘:
- 得分: ${(lastReview as Record<string, unknown>).overall_score}/100
- 总结: ${(lastReview as Record<string, unknown>).summary}
- 成功: ${JSON.stringify((lastReview as Record<string, unknown>).wins)}
- 失败: ${JSON.stringify((lastReview as Record<string, unknown>).losses)}
- 下周建议: ${JSON.stringify((lastReview as Record<string, unknown>).next_week_recommendations)}` : "暂无上周复盘"}

${lastStrategy ? `上周策略: ${(lastStrategy as Record<string, unknown>).strategy}` : ""}

产品列表（${(products || []).length} 个）:
${productSummary}

市场信号: ${JSON.stringify((signals || []).map(s => s.title))}

近 7 天趋势: ${JSON.stringify((snapshots || []).slice(0, 7).map(s => ({ date: (s as Record<string, unknown>).snapshot_date, metrics: (s as Record<string, unknown>).metrics })))}

返回格式:
{
  "strategy": "本周核心策略（1句话，直接说做什么）",
  "rationale": "为什么（用数据说话）",
  "tasks": [
    {
      "day": "Mon/Tue/Wed/Thu/Fri/Sat/Sun",
      "task_type": "任务类型",
      "title": "具体任务标题（包含商品名或平台名）",
      "description": "做什么、为什么、预期效果",
      "auto_executable": true,
      "target_product_id": "UUID 或 null",
      "target_product_name": "商品名 或 null",
      "target_platform": "平台名 或 null",
      "skill_id": "skill ID 或 null"
    }
  ],
  "key_focus": ["本周 3 个重点"],
  "risk_factors": ["风险"]
}`,
    4000
  );

  // Save weekly plan
  const { data: plan } = await supabase
    .from("ops_weekly_plans")
    .insert({
      module,
      week_start: weekStartStr,
      strategy: result,
      status: "active",
    })
    .select().single();

  if (!plan) throw new Error("创建周计划失败");

  // Create daily tasks from the plan
  const tasks = (result.tasks as Array<{
    day: string; task_type: string; title: string; description?: string;
    auto_executable?: boolean; target_product_id?: string; target_product_name?: string;
    target_platform?: string; skill_id?: string;
  }>) || [];

  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

  const todayStr = new Date().toISOString().split("T")[0];

  for (const task of tasks) {
    // 自动执行的任务 → 今天立刻执行；需审批的 → 按计划日期
    const isAuto = task.auto_executable !== false;
    let taskDateStr = todayStr;
    if (!isAuto) {
      const dayOffset = (dayMap[task.day] || 1) - 1;
      const taskDate = new Date(weekStart);
      taskDate.setDate(weekStart.getDate() + dayOffset);
      taskDateStr = taskDate.toISOString().split("T")[0];
    }

    const isAuto2 = task.auto_executable !== false;

    const { data: insertedTask } = await supabase.from("ops_daily_tasks").insert({
      plan_id: plan.id,
      module,
      task_date: taskDateStr,
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      auto_executable: isAuto2,
      target_product_id: task.target_product_id || null,
      target_product_name: task.target_product_name || null,
      target_platform: task.target_platform || null,
      skill_id: task.skill_id || null,
      execution_status: isAuto2 ? "pending" : "awaiting_approval",
    }).select("id").single();

    // 需审批的任务 → 立即创建审批记录，不用等执行轮到它
    if (!isAuto2 && insertedTask) {
      const approval = await createApprovalTask({
        type: task.task_type === "landing_page" ? "products" : "products",
        title: `[AI 运营] ${task.title}`,
        description: task.description || "",
        payload: {
          ops_task_id: insertedTask.id,
          task_type: task.task_type,
          module,
          target_product_id: task.target_product_id,
          target_product_name: task.target_product_name,
        },
      });
      await supabase.from("ops_daily_tasks").update({
        approval_task_id: approval.id,
      }).eq("id", insertedTask.id);
    }
  }

  return plan.id;
}

// ============ 1.5 Day-Close Archive ============
// 每天凌晨执行：归档昨天未完成的任务
export async function archiveYesterdayTasks(): Promise<{ archived: number; failed_moved: number }> {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // 未完成的昨天 pending 任务 → 标记 skipped_day_close
  const { data: pendingYesterday } = await supabase
    .from("ops_daily_tasks")
    .select("id")
    .eq("execution_status", "pending")
    .eq("task_date", yesterday);

  let archived = 0;
  if (pendingYesterday && pendingYesterday.length > 0) {
    await supabase.from("ops_daily_tasks")
      .update({
        execution_status: "skipped_day_close",
        execution_result: { reason: "日结自动归档：未在当日完成" },
        updated_at: new Date().toISOString(),
      })
      .in("id", pendingYesterday.map(t => t.id));
    archived = pendingYesterday.length;
  }

  // 统计昨天失败的（已经是 failed 状态，只做计数）
  const { count: failedCount } = await supabase
    .from("ops_daily_tasks")
    .select("id", { count: "exact", head: true })
    .eq("execution_status", "failed")
    .eq("task_date", yesterday);

  return { archived, failed_moved: failedCount || 0 };
}

// ============ 2. Execute Daily Tasks (via Agent Pool) ============
// 新版：通过并行 Agent Pool 执行，5x 吞吐量
export async function executeDailyTasks(): Promise<{ executed: number; skipped: number; approval: number; failed: number }> {
  // 用 Agent Pool 并行执行 auto tasks
  const poolResult = await executeAgentPool(20);

  // 查询本次执行后还有多少 pending/awaiting_approval
  const { count: pendingCount } = await supabase
    .from("ops_daily_tasks")
    .select("id", { count: "exact", head: true })
    .eq("execution_status", "pending");

  const { count: approvalCount } = await supabase
    .from("ops_daily_tasks")
    .select("id", { count: "exact", head: true })
    .eq("execution_status", "awaiting_approval");

  return {
    executed: poolResult.succeeded,
    skipped: poolResult.skipped + (pendingCount || 0),
    approval: approvalCount || 0,
    failed: poolResult.failed,
  };
}

// ============ Legacy Sequential Executor (保留作为 fallback) ============
export async function executeDailyTasksSequential(): Promise<{ executed: number; skipped: number; approval: number; failed: number }> {
  const startTime = Date.now();
  const MAX_DURATION_MS = 50_000;

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await supabase
    .from("ops_daily_tasks")
    .update({ execution_status: "pending", updated_at: new Date().toISOString() })
    .eq("execution_status", "running")
    .lt("updated_at", fiveMinAgo);

  const { data: allTasks } = await supabase
    .from("ops_daily_tasks")
    .select("*")
    .eq("execution_status", "pending")
    .order("task_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (!allTasks || allTasks.length === 0) return { executed: 0, skipped: 0, approval: 0, failed: 0 };

  const { data: integration } = await supabase
    .from("integrations").select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
  const integrationId = integration?.id;

  let executed = 0, approval = 0, failed = 0, skipped = 0;

  // 每种任务预估耗时（秒）
  const TASK_DURATION: Record<string, number> = {
    seo_fix: 15, detail_page: 25, post: 30,
    engage: 10, hashtag_strategy: 10, content_calendar: 12,
    short_video_script: 12, landing_page: 30, homepage_update: 20,
    new_product_content: 35,
  };

  for (const task of allTasks) {
    // 智能超时：预估剩余时间是否够执行下一个任务
    const elapsed = Date.now() - startTime;
    const estimatedMs = (TASK_DURATION[task.task_type] || 20) * 1000;
    if (elapsed + estimatedMs > MAX_DURATION_MS) {
      skipped += allTasks.length - executed - approval - failed;
      break;
    }

    try {
      if (task.auto_executable) {
        await supabase.from("ops_daily_tasks").update({ execution_status: "running" }).eq("id", task.id);

        const result = await executeTask(task, integrationId);

        await supabase.from("ops_daily_tasks").update({
          execution_status: "auto_executed",
          execution_result: result,
          updated_at: new Date().toISOString(),
        }).eq("id", task.id);

        executed++;
      } else {
        const approvalResult = await createApprovalTask({
          type: "products",
          title: `[AI 运营] ${task.title}`,
          description: task.description || "",
          payload: {
            ops_task_id: task.id,
            task_type: task.task_type,
            module: task.module,
            target_product_id: task.target_product_id,
            target_product_name: task.target_product_name,
          },
        });

        await supabase.from("ops_daily_tasks").update({
          execution_status: "awaiting_approval",
          approval_task_id: approvalResult.id,
          updated_at: new Date().toISOString(),
        }).eq("id", task.id);

        approval++;
      }
    } catch (err) {
      console.error(`Task ${task.id} failed:`, err);
      await supabase.from("ops_daily_tasks").update({
        execution_status: "failed",
        execution_result: { error: err instanceof Error ? err.message : "执行失败" },
        updated_at: new Date().toISOString(),
      }).eq("id", task.id);
      failed++;
    }
  }

  return { executed, skipped, approval, failed };
}

// Execute a single task by calling the appropriate Skill + API
async function executeTask(
  task: { task_type: string; target_product_id?: string; target_product_name?: string; target_platform?: string; skill_id?: string; description?: string },
  integrationId: string | null
): Promise<Record<string, unknown>> {
  switch (task.task_type) {
    case "seo_fix": {
      if (!task.target_product_id || !integrationId) return { skipped: true, reason: "no product or integration" };

      const { data: product } = await supabase
        .from("products").select("*").eq("id", task.target_product_id).single();
      if (!product?.shopify_product_id) return { skipped: true, reason: "no shopify product" };

      let seoData: Record<string, unknown> = {};
      let qaScore = 0;
      let attempts = 0;
      let qaFeedback = "";

      for (let i = 0; i < 3; i++) {
        attempts++;
        const inputs: Record<string, unknown> = { product };
        if (qaFeedback) inputs.qa_feedback = qaFeedback;

        const { result } = await executeSkill("product_seo_optimize", inputs, { sourceModule: "ops_director" });
        seoData = result.output as Record<string, unknown>;

        const qa = await reviewContent("seo", seoData, { name: product.name, category: product.category });
        qaScore = qa.score;

        if (qa.passed) break;
        qaFeedback = qa.improvements.join("; ");
      }

      if (qaScore < 70) {
        return { action: "qa_rejected", product: product.name, score: qaScore, attempts };
      }

      await updateProductSEO(integrationId, product.shopify_product_id, product.id, {
        meta_title: seoData.meta_title as string,
        meta_description: seoData.meta_description as string,
        body_html: seoData.body_html as string,
        tags: seoData.tags as string,
      });

      return { action: "seo_updated", product: product.name, qa_score: qaScore, attempts, fields: Object.keys(seoData) };
    }

    case "detail_page": {
      if (!task.target_product_id || !integrationId) return { skipped: true };

      const { data: product } = await supabase
        .from("products").select("*").eq("id", task.target_product_id).single();
      if (!product?.shopify_product_id) return { skipped: true };

      let pageData: Record<string, unknown> = {};
      let dpQaScore = 0;
      let dpFeedback = "";

      for (let i = 0; i < 3; i++) {
        const inputs: Record<string, unknown> = { product };
        if (dpFeedback) inputs.qa_feedback = dpFeedback;

        const { result } = await executeSkill("product_detail_page", inputs, { sourceModule: "ops_director" });
        pageData = result.output as Record<string, unknown>;

        const qa = await reviewContent("detail_page", pageData, { name: product.name, category: product.category });
        dpQaScore = qa.score;

        if (qa.passed) break;
        dpFeedback = qa.improvements.join("; ");
      }

      if (dpQaScore < 70) {
        return { action: "qa_rejected", product: product.name, score: dpQaScore };
      }

      if (pageData.description) {
        await updateProductBodyHtml(integrationId, product.shopify_product_id, product.id, pageData.description as string);
      }

      return { action: "detail_page_updated", product: product.name, qa_score: dpQaScore };
    }

    case "post": {
      const postResult = await socialContentPipeline(task.target_product_id || null, task.target_platform || "instagram");
      return postResult as unknown as Record<string, unknown>;
    }

    case "engage": {
      const { result } = await executeSkill("ugc_response", {
        product: task.target_product_id ? { id: task.target_product_id, name: task.target_product_name || "" } : undefined,
        platform: task.target_platform || "instagram",
        context: task.description || "为热门帖子生成互动回复",
      }, { sourceModule: "ops_director" });
      return { action: "engage_content_generated", platform: task.target_platform, output: result.output };
    }

    case "hashtag_strategy": {
      const { result } = await executeSkill("hashtag_strategy", {
        product: task.target_product_id ? { id: task.target_product_id, name: task.target_product_name || "" } : undefined,
        platform: task.target_platform || "instagram",
      }, { sourceModule: "ops_director" });
      return { action: "hashtag_strategy_generated", output: result.output };
    }

    case "content_calendar": {
      const { result } = await executeSkill("content_calendar", {
        platform: task.target_platform || "instagram",
        days: 7,
      }, { sourceModule: "ops_director" });
      return { action: "content_calendar_generated", output: result.output };
    }

    case "short_video_script": {
      const { result } = await executeSkill("short_video_script", {
        product: task.target_product_id ? { id: task.target_product_id, name: task.target_product_name || "" } : undefined,
        platform: task.target_platform || "tiktok",
        style: "种草",
      }, { sourceModule: "ops_director" });
      return { action: "video_script_generated", output: result.output };
    }

    case "landing_page": {
      if (!integrationId) return { skipped: true, reason: "no integration" };
      const lpResult = await campaignPipeline(task.description || "Campaign", [], integrationId);
      return lpResult as unknown as Record<string, unknown>;
    }

    case "homepage_update": {
      const { result } = await executeSkill("homepage_hero", {
        brand_name: "JOJOFEIFEI",
        season: "general",
      }, { sourceModule: "ops_director" });
      return { action: "homepage_hero_generated", output: result.output };
    }

    case "new_product_content": {
      if (!task.target_product_id || !integrationId) return { skipped: true };
      const pcResult = await productContentPipeline(task.target_product_id, integrationId);
      return pcResult as unknown as Record<string, unknown>;
    }

    default:
      return { action: "unknown_task_type", type: task.task_type };
  }
}

// ============ 3. Record Performance Snapshot ============
export async function recordPerformanceSnapshot(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const storeKPIs = await getStoreKPIs();
  const dashKPIs = await getDashboardKPIs();

  await supabase.from("ops_performance_snapshots").upsert({
    snapshot_date: today,
    module: "store",
    metrics: {
      health_score: storeKPIs.healthScore,
      avg_seo: storeKPIs.avgSEO,
      total_products: storeKPIs.totalProducts,
      out_of_stock: storeKPIs.outOfStock,
      revenue: dashKPIs?.totalRevenue || 0,
      orders: dashKPIs?.totalOrders || 0,
      aov: dashKPIs?.aov || 0,
      customers: dashKPIs?.totalCustomers || 0,
    },
  }, { onConflict: "snapshot_date,module" });

  const { count: totalPosts } = await supabase
    .from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "published");
  const { count: totalAccounts } = await supabase
    .from("social_accounts").select("*", { count: "exact", head: true }).eq("connected", true);

  await supabase.from("ops_performance_snapshots").upsert({
    snapshot_date: today,
    module: "social",
    metrics: {
      published_posts: totalPosts || 0,
      connected_accounts: totalAccounts || 0,
    },
  }, { onConflict: "snapshot_date,module" });

  // Update goal progress
  const { data: activeGoals } = await supabase
    .from("ops_goals").select("*").eq("status", "active");

  for (const goal of activeGoals || []) {
    let currentValue = 0;
    if (goal.metric === "revenue") currentValue = dashKPIs?.totalRevenue || 0;
    else if (goal.metric === "orders") currentValue = dashKPIs?.totalOrders || 0;
    else if (goal.metric === "seo_score") currentValue = storeKPIs.avgSEO;
    else if (goal.metric === "customers") currentValue = dashKPIs?.totalCustomers || 0;
    else if (goal.metric === "aov") currentValue = dashKPIs?.aov || 0;
    else if (goal.metric === "published_posts") currentValue = totalPosts || 0;

    const newStatus = currentValue >= goal.target_value ? "achieved"
      : (goal.deadline && new Date(goal.deadline) < new Date()) ? "missed"
      : "active";

    await supabase.from("ops_goals").update({
      current_value: currentValue,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", goal.id);
  }
}

// ============ 4. Weekly Review ============
export async function weeklyReview(module: "social" | "store"): Promise<void> {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1 - 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: plan } = await supabase
    .from("ops_weekly_plans").select("*").eq("module", module)
    .gte("week_start", weekStartStr).order("week_start", { ascending: false }).limit(1).single();

  if (!plan) return;

  const { data: tasks } = await supabase
    .from("ops_daily_tasks").select("*").eq("plan_id", plan.id);

  const totalTasks = tasks?.length || 0;
  const completed = tasks?.filter(t => t.execution_status === "auto_executed" || t.execution_status === "completed").length || 0;
  const failedCount = tasks?.filter(t => t.execution_status === "failed").length || 0;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const { data: snapshots } = await supabase
    .from("ops_performance_snapshots").select("*").eq("module", module)
    .gte("snapshot_date", weekStartStr)
    .lte("snapshot_date", weekEnd.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  const review = await callLLM(
    `你是品牌操盘手，在做周复盘。不要写 "总体表现良好" 这种废话。

规则：
1. 只说做了什么、效果如何、下周改什么
2. 用数据说话：SEO 分从 X 涨到 Y，发了 N 条帖子
3. 如果某个策略没效果，直接说 "停掉"，不要说 "可以考虑调整"
4. 下周建议必须是具体的任务（指向商品名或平台），不是方向
5. wins 和 losses 必须引用具体的任务和结果

返回 JSON，不要解释。`,
    `模块: ${module}
本周: ${weekStartStr}
策略: ${JSON.stringify((plan.strategy as Record<string, unknown>)?.strategy || plan.strategy)}
任务执行: ${totalTasks} 个总计，${completed} 个完成，${failedCount} 个失败
任务详情:
${(tasks || []).map(t => `- ${t.title} → ${t.execution_status}${t.execution_result ? ` (${JSON.stringify(t.execution_result).slice(0, 100)})` : ""}`).join("\n")}

本周数据趋势:
${(snapshots || []).map(s => `${(s as Record<string, unknown>).snapshot_date}: ${JSON.stringify((s as Record<string, unknown>).metrics)}`).join("\n")}

返回格式:
{
  "overall_score": 0-100,
  "summary": "一句话：这周做了 X，效果 Y",
  "wins": ["成功1: 具体说明做了什么、效果如何"],
  "losses": ["失败1: 具体说明哪里出了问题"],
  "key_learnings": ["发现1"],
  "next_week_recommendations": ["具体任务建议1（指向商品或平台）"],
  "goal_progress_assessment": "目标进度一句话"
}`,
    2500
  );

  await supabase.from("ops_weekly_plans").update({
    review,
    performance_score: (review as { overall_score?: number }).overall_score || 0,
    status: "reviewed",
    updated_at: new Date().toISOString(),
  }).eq("id", plan.id);
}
