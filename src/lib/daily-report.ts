/**
 * 每日运营日报
 * 汇总：今日执行了什么 + 店铺数据变化 + 明日计划
 */

import { supabase } from "./supabase";
import { getDashboardKPIs, getStoreKPIs } from "./supabase-queries";
import { callLLM } from "./content-skills/llm";

export interface DailyReport {
  date: string;
  // 执行摘要
  tasks_executed: number;
  tasks_failed: number;
  tasks_pending: number;
  task_details: Array<{ title: string; status: string; result_summary: string }>;
  // 店铺实时数据
  store_data: {
    revenue_today: number;
    orders_today: number;
    revenue_30d: number;
    orders_30d: number;
    avg_seo_score: number;
    products_with_meta: number;
    products_total: number;
    social_posts_published: number;
  };
  // 对比昨天
  changes: {
    seo_score_change: number;
    products_fixed_today: number;
    new_content_created: number;
  };
  // AI 总结
  ai_summary: string;
  tomorrow_plan: string;
}

export async function generateDailyReport(): Promise<DailyReport> {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // 1. 今日任务执行情况 — 按 task_date 查，不按 updated_at（避免漏查）
  const { data: todayTasks } = await supabase
    .from("ops_daily_tasks").select("*")
    .eq("task_date", today)
    .order("created_at", { ascending: true });

  const executed = (todayTasks || []).filter(t => t.execution_status === "auto_executed" || t.execution_status === "completed");
  const failed = (todayTasks || []).filter(t => t.execution_status === "failed");
  const pending = (todayTasks || []).filter(t => t.execution_status === "pending");

  const taskDetails = (todayTasks || []).map(t => ({
    title: t.title,
    status: t.execution_status,
    result_summary: t.execution_result
      ? JSON.stringify(t.execution_result).slice(0, 100)
      : "",
  }));

  // 2. 店铺实时数据
  const dashKPIs = await getDashboardKPIs();
  const storeKPIs = await getStoreKPIs();

  // 产品 SEO 状态
  const { data: products } = await supabase
    .from("products").select("meta_title, meta_description, seo_score")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const allProducts = products || [];
  const withMeta = allProducts.filter(p => p.meta_title && p.meta_description).length;

  // 社媒发布数
  const { count: todayPosts } = await supabase
    .from("scheduled_posts").select("*", { count: "exact", head: true })
    .eq("status", "published").gte("published_at", `${today}T00:00:00`);

  // 3. 对比昨天的快照
  const { data: yesterdaySnapshot } = await supabase
    .from("ops_performance_snapshots").select("metrics")
    .eq("snapshot_date", yesterday).eq("module", "store").maybeSingle();

  const yesterdayAvgSeo = (yesterdaySnapshot?.metrics as Record<string, unknown>)?.avg_seo as number || storeKPIs.avgSEO;

  // 今日内容创建数
  const { count: contentCreated } = await supabase
    .from("content_tasks").select("*", { count: "exact", head: true })
    .eq("status", "completed").gte("created_at", `${today}T00:00:00`);

  const storeData = {
    revenue_today: 0, // 需要按天筛选订单
    orders_today: 0,
    revenue_30d: dashKPIs?.totalRevenue || 0,
    orders_30d: dashKPIs?.totalOrders || 0,
    avg_seo_score: storeKPIs.avgSEO,
    products_with_meta: withMeta,
    products_total: allProducts.length,
    social_posts_published: todayPosts || 0,
  };

  const changes = {
    seo_score_change: Math.round((storeKPIs.avgSEO - yesterdayAvgSeo) * 10) / 10,
    products_fixed_today: executed.filter(t => t.task_type === "seo_fix" || t.task_type === "detail_page").length,
    new_content_created: contentCreated || 0,
  };

  // 4. AI 生成日报总结
  const aiResult = await callLLM(
    `你是品牌操盘手，写今日运营日报。要求：
1. 第一段：今天做了什么（用数据说话，2-3 句话）
2. 第二段：效果如何（SEO 分变化、内容产出）
3. 第三段：明天计划做什么
不要说废话，直接说结果。`,
    `日期: ${today}
执行任务: ${executed.length} 个成功, ${failed.length} 个失败, ${pending.length} 个待执行
任务明细: ${taskDetails.map(t => `${t.title} → ${t.status}`).join("; ")}
SEO 分: ${storeKPIs.avgSEO}（昨天 ${yesterdayAvgSeo}，变化 ${changes.seo_score_change > 0 ? "+" : ""}${changes.seo_score_change}）
产品 Meta 覆盖: ${withMeta}/${allProducts.length}
30 天营收: $${dashKPIs?.totalRevenue || 0}
今日社媒发布: ${todayPosts || 0} 条
今日内容创建: ${contentCreated || 0} 个
返回纯文本，分两段：summary 和 tomorrow_plan，用 ||| 分隔。`,
    600
  );

  const aiText = typeof aiResult === "string" ? aiResult : (aiResult as Record<string, unknown>).raw_text as string || "";
  const [summary, tomorrowPlan] = aiText.split("|||").map(s => s.trim());

  const report: DailyReport = {
    date: today,
    tasks_executed: executed.length,
    tasks_failed: failed.length,
    tasks_pending: pending.length,
    task_details: taskDetails,
    store_data: storeData,
    changes,
    ai_summary: summary || `今日执行 ${executed.length} 个任务，SEO 分 ${changes.seo_score_change > 0 ? "上升" : "变化"} ${changes.seo_score_change}`,
    tomorrow_plan: tomorrowPlan || "继续执行剩余 pending 任务",
  };

  // 5. 存储日报
  await supabase.from("auto_ops_logs").insert({
    run_type: "daily_report",
    trigger_source: "scheduled",
    results_summary: report,
    duration_ms: 0,
  });

  return report;
}
