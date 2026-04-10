import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";
import { executeSkill } from "./content-skills/executor";
import { updateProductSEO, updateProductBodyHtml, createShopifyPage } from "./shopify-operations";
import { publishPost } from "./social-publisher";
import { getDashboardKPIs, getStoreKPIs } from "./supabase-queries";
import { createApprovalTask } from "./supabase-approval";
import { reviewContent } from "./content-qa";

// ============ 1. Generate Weekly Plan ============
export async function generateWeeklyPlan(module: "social" | "store"): Promise<string> {
  // Get current goals
  const { data: goals } = await supabase
    .from("ops_goals").select("*").eq("module", module).eq("status", "active");

  // Get recent performance
  const { data: snapshots } = await supabase
    .from("ops_performance_snapshots").select("*").eq("module", module)
    .order("snapshot_date", { ascending: false }).limit(14);

  // Get last week's plan and review
  const { data: lastPlans } = await supabase
    .from("ops_weekly_plans").select("*").eq("module", module)
    .order("week_start", { ascending: false }).limit(1);

  // Get products for context
  const { data: products } = await supabase
    .from("products").select("id, name, category, seo_score, meta_title, meta_description, shopify_product_id")
    .eq("platform", "shopify").not("shopify_product_id", "is", null).limit(20);

  // Get radar signals
  const { data: signals } = await supabase
    .from("radar_signals").select("*").eq("status", "open").limit(5);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const taskTypes = module === "social"
    ? "post (发社媒帖子), engage (回复评论/互动), hashtag_strategy, content_calendar, short_video_script"
    : "seo_fix (修复商品 SEO), detail_page (优化详情页), homepage_update (更新首页), landing_page (创建落地页), new_product_content (新品内容制作)";

  const autoTypes = module === "social"
    ? "post, engage, hashtag_strategy 可自动执行"
    : "seo_fix, detail_page 可自动执行";

  const approvalTypes = "ad_campaign, price_adjust, discount_event, bulk_operation 需要审批";

  const result = await callLLM(
    `You are a senior ${module === "social" ? "social media" : "e-commerce store"} operations director.
Generate a concrete weekly plan with specific daily tasks.

CRITICAL: Each task must have:
- task_type: one of [${taskTypes}]
- auto_executable: true for tasks AI can do alone, false for tasks needing approval
- If task involves a specific product, include target_product_id (UUID from the product list)
- If task involves a specific platform, include target_platform

${autoTypes}
${approvalTypes}

Be SPECIFIC — not "optimize SEO" but "fix meta_title for JOJOFEIFEI Blush Active Bra"
Reference actual product names and IDs from the list provided.

Return JSON.`,
    `Module: ${module}
Week starting: ${weekStartStr}
Today: ${today.toISOString().split("T")[0]}

Active goals: ${JSON.stringify(goals || []).slice(0, 500)}
Last 14 days performance: ${JSON.stringify(snapshots || []).slice(0, 800)}
Last week plan & review: ${JSON.stringify(lastPlans?.[0] || {}).slice(0, 500)}
Products (${(products || []).length}): ${(products || []).map(p => `[${p.id}] ${p.name} (SEO:${p.seo_score}, meta:${p.meta_title ? "yes" : "NO"})`).join("; ")}
Market signals: ${JSON.stringify(signals || []).slice(0, 300)}

Generate JSON:
{
  "strategy": "本周核心策略（1-2 句）",
  "rationale": "为什么选这个策略",
  "tasks": [
    {
      "day": "Mon/Tue/Wed/Thu/Fri/Sat/Sun",
      "task_type": "类型",
      "title": "具体任务标题",
      "description": "详细说明",
      "auto_executable": true/false,
      "target_product_id": "UUID or null",
      "target_product_name": "商品名 or null",
      "target_platform": "instagram/tiktok/xiaohongshu/shopify or null",
      "skill_id": "要调用的 skill ID or null"
    }
  ],
  "key_focus": ["本周 3 个重点"],
  "risk_factors": ["可能的风险"]
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
    const dayOffset = (dayMap[task.day] || 1) - 1; // relative to Monday
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
// Executes ONE pending task per call to stay within Vercel timeout.
// Cron calls this hourly, so all daily tasks get processed over the day.
// Also picks up past-due tasks from previous days that weren't completed.
export async function executeDailyTasks(): Promise<{ executed: number; skipped: number; approval: number; failed: number }> {
  const today = new Date().toISOString().split("T")[0];

  // Get the NEXT single pending task (today or overdue)
  const { data: tasks } = await supabase
    .from("ops_daily_tasks")
    .select("*")
    .eq("execution_status", "pending")
    .lte("task_date", today)
    .order("task_date", { ascending: true })
    .limit(1);

  if (!tasks || tasks.length === 0) return { executed: 0, skipped: 0, approval: 0, failed: 0 };

  const task = tasks[0];

  // Get Shopify integration
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
      // Create approval task
      const approvalResult = await createApprovalTask({
        type: "products",
        title: `[AI 运营] ${task.title}`,
        description: task.description || "",
        payload: {
          ops_task_id: task.id,
          task_type: task.task_type,
          module: task.module,
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

// Execute a single task by calling the appropriate Skill + Shopify API
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

      // Generate + QA review (retry up to 2x if quality < 70)
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

      // Generate + QA
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
      const platform = task.target_platform || "instagram";
      let product;
      if (task.target_product_id) {
        const { data } = await supabase.from("products").select("*").eq("id", task.target_product_id).single();
        product = data;
      }

      const { result } = await executeSkill("social_post_pack", {
        product: product || undefined,
        platform,
      }, { sourceModule: "ops_director" });

      const posts = (result.output as { posts?: Array<{ title: string; body: string; hashtags?: string[] }> }).posts;
      const bestPost = posts?.[0];

      if (bestPost) {
        const { data: scheduled } = await supabase.from("scheduled_posts").insert({
          title: bestPost.title,
          body: bestPost.body,
          content_preview: bestPost.body?.slice(0, 100),
          platform,
          hashtags: bestPost.hashtags,
          scheduled_at: new Date().toISOString(),
          status: "queued",
        }).select().single();

        if (scheduled) {
          const pubResult = await publishPost({
            id: scheduled.id,
            platform,
            account_id: null,
            title: bestPost.title,
            body: bestPost.body,
            hashtags: bestPost.hashtags,
          });

          return { action: "post_published", platform, success: pubResult.success, error: pubResult.error };
        }
      }

      return { action: "post_generated", platform, posts_count: posts?.length || 0 };
    }

    case "landing_page": {
      if (!integrationId) return { skipped: true };

      const { result } = await executeSkill("landing_page", {
        page_goal: "purchase",
        headline_idea: task.description,
      }, { sourceModule: "ops_director" });

      const html = (result.output as { body_html?: string }).body_html;
      if (html) {
        const page = await createShopifyPage(integrationId, task.target_product_name || "Campaign Page", html);
        return { action: "landing_page_created", page_id: page.page_id, handle: page.handle };
      }

      return { action: "landing_page_generated" };
    }

    case "homepage_update": {
      const { result } = await executeSkill("homepage_hero", {
        brand_name: "JOJOFEIFEI",
        season: "general",
      }, { sourceModule: "ops_director" });

      return { action: "homepage_hero_generated", output_preview: JSON.stringify(result.output).slice(0, 200) };
    }

    case "new_product_content": {
      if (!task.target_product_id || !integrationId) return { skipped: true };

      const { data: product } = await supabase
        .from("products").select("*").eq("id", task.target_product_id).single();
      if (!product?.shopify_product_id) return { skipped: true };

      // SEO
      const { result: seoResult } = await executeSkill("product_seo_optimize", { product }, { sourceModule: "ops_director" });
      const seo = seoResult.output as Record<string, unknown>;
      await updateProductSEO(integrationId, product.shopify_product_id, product.id, {
        meta_title: seo.meta_title as string,
        meta_description: seo.meta_description as string,
        tags: seo.tags as string,
      });

      // Detail page
      const { result: detailResult } = await executeSkill("product_detail_page", { product }, { sourceModule: "ops_director" });
      const detail = detailResult.output as Record<string, unknown>;
      if (detail.description) {
        await updateProductBodyHtml(integrationId, product.shopify_product_id, product.id, detail.description as string);
      }

      // Social post
      await executeSkill("social_post_pack", { product, platform: "instagram" }, { sourceModule: "ops_director" });

      return { action: "new_product_full_content", product: product.name, seo: true, detail_page: true, social: true };
    }

    default:
      return { action: "unknown_task_type", type: task.task_type };
  }
}

// ============ 3. Record Performance Snapshot ============
export async function recordPerformanceSnapshot(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Store metrics
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

  // Social metrics
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
  const { data: goals } = await supabase
    .from("ops_goals").select("*").eq("status", "active");

  for (const goal of goals || []) {
    let currentValue = 0;
    if (goal.metric === "revenue") currentValue = dashKPIs?.totalRevenue || 0;
    else if (goal.metric === "orders") currentValue = dashKPIs?.totalOrders || 0;
    else if (goal.metric === "seo_score") currentValue = storeKPIs.avgSEO;
    else if (goal.metric === "customers") currentValue = dashKPIs?.totalCustomers || 0;

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
  weekStart.setDate(today.getDate() - today.getDay() + 1 - 7); // Last Monday
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // Get this week's plan
  const { data: plan } = await supabase
    .from("ops_weekly_plans").select("*").eq("module", module)
    .gte("week_start", weekStartStr).order("week_start", { ascending: false }).limit(1).single();

  if (!plan) return;

  // Get all tasks for this week
  const { data: tasks } = await supabase
    .from("ops_daily_tasks").select("*").eq("plan_id", plan.id);

  const totalTasks = tasks?.length || 0;
  const completed = tasks?.filter(t => t.execution_status === "auto_executed" || t.execution_status === "completed").length || 0;
  const failed = tasks?.filter(t => t.execution_status === "failed").length || 0;

  // Get performance snapshots for the week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const { data: snapshots } = await supabase
    .from("ops_performance_snapshots").select("*").eq("module", module)
    .gte("snapshot_date", weekStartStr)
    .lte("snapshot_date", weekEnd.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  const review = await callLLM(
    `You are a senior operations manager reviewing the week's performance. Be honest, data-driven, and actionable.
Return JSON.`,
    `Module: ${module}
Week: ${weekStartStr}
Strategy: ${JSON.stringify(plan.strategy).slice(0, 500)}
Tasks: ${totalTasks} total, ${completed} completed, ${failed} failed
Task details: ${JSON.stringify(tasks || []).slice(0, 1000)}
Performance data: ${JSON.stringify(snapshots || []).slice(0, 500)}

Generate review JSON:
{
  "overall_score": 0-100,
  "summary": "一句话总结本周",
  "wins": ["有效的动作 1", "有效的动作 2"],
  "losses": ["无效/失败的动作"],
  "key_learnings": ["关键发现"],
  "next_week_recommendations": ["下周建议 1", "下周建议 2"],
  "goal_progress_assessment": "目标进度评估"
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
