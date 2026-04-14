import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";
import { executeSkill } from "./content-skills/executor";
import { updateProductSEO, updateProductBodyHtml } from "./shopify-operations";
import { getDashboardKPIs, getStoreKPIs } from "./supabase-queries";
import { createApprovalTask } from "./supabase-approval";
import { reviewContent } from "./content-qa";
import { productContentPipeline, socialContentPipeline, campaignPipeline } from "./content-pipeline";

// ============ 0. AI 自主诊断 & 提出目标 ============

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
}

export interface GoalProposal {
  diagnosis: string;
  proposed_goals: ProposedGoal[];
}

export async function proposeGoals(): Promise<GoalProposal> {
  // 收集全量数据 — 不截断
  const dashKPIs = await getDashboardKPIs();
  const storeKPIs = await getStoreKPIs();

  // 产品 SEO 分布
  const { data: products } = await supabase
    .from("products").select("id, name, seo_score, meta_title, meta_description, body_html, tags, price, stock, category")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const allProducts = products || [];
  const avgSeo = allProducts.length > 0 ? Math.round(allProducts.reduce((s, p) => s + (p.seo_score || 0), 0) / allProducts.length) : 0;
  const missingMeta = allProducts.filter(p => !p.meta_title || !p.meta_description).length;
  const missingBody = allProducts.filter(p => !p.body_html || p.body_html.length < 100).length;
  const outOfStock = allProducts.filter(p => (p.stock || 0) === 0).length;

  // 社媒数据
  const { count: publishedPosts } = await supabase
    .from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "published");
  const { count: connectedAccounts } = await supabase
    .from("social_accounts").select("*", { count: "exact", head: true }).eq("connected", true);

  // 已有目标
  const { data: existingGoals } = await supabase
    .from("ops_goals").select("*").eq("status", "active");

  // 最近 30 天趋势
  const { data: snapshots } = await supabase
    .from("ops_performance_snapshots").select("*")
    .order("snapshot_date", { ascending: false }).limit(30);

  const today = new Date();
  const thirtyDaysLater = new Date(today.getTime() + 30 * 86400000).toISOString().split("T")[0];

  const result = await callLLM(
    `你是月销百万的 Shopify DTC 品牌操盘手。你现在要看数据、找问题、定目标。

你不是咨询顾问，不要写报告。你是真正管店的人，你自己要执行这些目标。

规则：
1. 先诊断当前最大的问题（一句话，直击要害）
2. 最多提 3 个目标，聚焦比发散重要
3. 每个目标必须有具体数字 — 不能 "提升 SEO"，要 "30 天内平均 SEO 分从 ${avgSeo} 提到 65"
4. metric 只能用系统能追踪的：revenue, orders, aov, seo_score, customers, published_posts
5. target_value 基于数据趋势合理推算，不要拍脑袋
6. 每个目标附带你会怎么执行（用什么 skill、做什么动作）
7. deadline 统一用 ${thirtyDaysLater} 附近
8. 如果已有目标正在执行且合理，不要重复提

返回 JSON，不要有任何解释。`,
    `当前店铺数据：
- 营收（30天）: ${dashKPIs?.totalRevenue || 0} ${dashKPIs?.currency || 'USD'}
- 订单数: ${dashKPIs?.totalOrders || 0}
- 客单价: ${dashKPIs?.aov || 0}
- 客户数: ${dashKPIs?.totalCustomers || 0}
- 营收趋势: ${dashKPIs?.revenueTrend || 0}%
- 订单趋势: ${dashKPIs?.ordersTrend || 0}%
- 店铺健康分: ${storeKPIs.healthScore}/100
- 系统平均 SEO 分: ${storeKPIs.avgSEO}

产品数据（${allProducts.length} 个 Shopify 商品）:
- 平均 SEO 分: ${avgSeo}/100
- 缺少 meta 标签: ${missingMeta} 个
- 描述过短/缺失: ${missingBody} 个
- 缺货商品: ${outOfStock} 个
- SEO 分分布: ${JSON.stringify(allProducts.map(p => ({ name: p.name, seo: p.seo_score, price: p.price, hasMeta: !!p.meta_title })))}

社媒数据:
- 已发布帖子: ${publishedPosts || 0}
- 已连接账号: ${connectedAccounts || 0}

已有目标: ${JSON.stringify(existingGoals || [])}
最近趋势: ${JSON.stringify((snapshots || []).slice(0, 7))}

返回格式：
{
  "diagnosis": "当前最大的问题是...（一句话）",
  "proposed_goals": [
    {
      "module": "store 或 social",
      "metric": "可追踪的指标名",
      "current_value": 当前值,
      "target_value": 目标值,
      "unit": "单位",
      "deadline": "YYYY-MM-DD",
      "rationale": "为什么定这个目标（用数据说话）",
      "execution_plan": "具体怎么做（用什么 skill，多少步）",
      "estimated_effort": "预计耗时"
    }
  ]
}`,
    3000
  );

  return result as unknown as GoalProposal;
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

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const taskTypes = module === "social"
    ? "post (发社媒帖子), engage (生成互动回复), hashtag_strategy (生成标签策略), content_calendar (排期规划), short_video_script (短视频脚本)"
    : "seo_fix (修复商品 SEO), detail_page (优化详情页), homepage_update (更新首页), landing_page (创建落地页), new_product_content (新品内容制作)";

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

  const result = await callLLM(
    `你是月销百万的 Shopify DTC 品牌操盘手。你在排本周的执行计划，不是写报告。

可用任务类型：[${taskTypes}]
自动执行：seo_fix, detail_page, post, engage, hashtag_strategy, short_video_script
需要审批：landing_page, homepage_update, new_product_content

规则：
1. 每个任务必须解决一个具体问题，指向具体的商品或内容
2. 好任务示例：
   ✅ "为 JOJOFEIFEI Blush Flare Leggings 添加 meta_title（当前缺失，SEO 分 23，价格 $68）"
   ✅ "为 Instagram 发布 Coast Power Contour Top 种草帖（该商品本月 0 条内容）"
   ❌ "优化低 SEO 分商品" — 太笼统
   ❌ "提升品牌知名度" — 空话
3. 优先级：高价商品 > 低价，有问题的 > 没问题的，缺货的跳过
4. 每天最多 2-3 个任务，少而精
5. 周一-周三：重执行（修 SEO、发内容）；周四-五：看效果；周末：轻任务
6. target_product_id 必须用上面产品列表中的真实 UUID
7. 所有 auto_executable 任务必须设为 true

返回 JSON，不要有解释。`,
    `模块: ${module}
本周: ${weekStartStr} 开始
今天: ${today.toISOString().split("T")[0]}

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

  for (const task of tasks) {
    const dayOffset = (dayMap[task.day] || 1) - 1;
    const taskDate = new Date(weekStart);
    taskDate.setDate(weekStart.getDate() + dayOffset);

    await supabase.from("ops_daily_tasks").insert({
      plan_id: plan.id,
      module,
      task_date: taskDate.toISOString().split("T")[0],
      task_type: task.task_type,
      title: task.title,
      description: task.description,
      auto_executable: task.auto_executable !== false,
      target_product_id: task.target_product_id || null,
      target_product_name: task.target_product_name || null,
      target_platform: task.target_platform || null,
      skill_id: task.skill_id || null,
      execution_status: "pending",
    });
  }

  return plan.id;
}

// ============ 2. Execute Daily Tasks ============
export async function executeDailyTasks(): Promise<{ executed: number; skipped: number; approval: number; failed: number }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("ops_daily_tasks")
    .select("*")
    .eq("execution_status", "pending")
    .lte("task_date", today)
    .order("task_date", { ascending: true })
    .limit(1);

  if (!tasks || tasks.length === 0) return { executed: 0, skipped: 0, approval: 0, failed: 0 };

  const task = tasks[0];

  const { data: integration } = await supabase
    .from("integrations").select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
  const integrationId = integration?.id;

  let executed = 0, approval = 0, failed = 0;
  const skipped = 0;

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
