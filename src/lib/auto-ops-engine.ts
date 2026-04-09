import { supabase } from "./supabase";
import { runRadarScan } from "./radar-engine";
import { runDiagnostic } from "./diagnostic-engine";
import { autoPublishDuePosts } from "./social-publisher";

interface TaskResult {
  task: string;
  status: "success" | "failed" | "skipped";
  message?: string;
  data?: Record<string, unknown>;
}

// ============ Hourly Tasks ============
export async function runHourlyTasks(): Promise<TaskResult[]> {
  const startTime = Date.now();
  const results: TaskResult[] = [];

  // 1. Radar scan (competitors + trends + viral)
  try {
    const radar = await runRadarScan();
    results.push({
      task: "radar_scan",
      status: "success",
      message: `Created ${radar.signals_created} radar signals`,
      data: radar as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({
      task: "radar_scan",
      status: "failed",
      message: err instanceof Error ? err.message : "Radar scan failed",
    });
  }

  // 2. WhatsApp unread check
  try {
    const { data: unread } = await supabase
      .from("whatsapp_conversations")
      .select("id, display_name, unread_count")
      .gt("unread_count", 0)
      .eq("status", "active");

    results.push({
      task: "whatsapp_unread_check",
      status: "success",
      message: `${unread?.length || 0} conversations with unread messages`,
      data: { unread_count: unread?.length || 0 },
    });
  } catch (err) {
    results.push({
      task: "whatsapp_unread_check",
      status: "failed",
      message: err instanceof Error ? err.message : "Check failed",
    });
  }

  // 3. Auto-publish due social posts
  try {
    const pubResult = await autoPublishDuePosts();
    results.push({
      task: "social_auto_publish",
      status: "success",
      message: `Published ${pubResult.published}, failed ${pubResult.failed}`,
      data: pubResult as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({
      task: "social_auto_publish",
      status: "failed",
      message: err instanceof Error ? err.message : "Auto-publish failed",
    });
  }

  // Log result
  await logRun("hourly", "cron", results, Date.now() - startTime);
  return results;
}

// ============ Daily Tasks ============
export async function runDailyTasks(): Promise<TaskResult[]> {
  const startTime = Date.now();
  const results: TaskResult[] = [];

  // 1. Full store diagnostic
  try {
    const report = await runDiagnostic(undefined, "scheduled");
    results.push({
      task: "store_diagnostic",
      status: "success",
      message: `Health: ${report.summary.overall_health}, Findings: ${report.summary.total_findings}`,
      data: {
        overall_health: report.summary.overall_health,
        findings: report.summary.total_findings,
        critical: report.summary.critical,
      },
    });
  } catch (err) {
    results.push({
      task: "store_diagnostic",
      status: "failed",
      message: err instanceof Error ? err.message : "Diagnostic failed",
    });
  }

  // 2. SEO health check
  try {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, meta_title, meta_description, body_html, seo_score")
      .eq("platform", "shopify");

    const allProducts = products || [];
    const missingMeta = allProducts.filter((p) => !p.meta_title || !p.meta_description);
    const lowSeo = allProducts.filter((p) => (p.seo_score || 0) < 60);

    results.push({
      task: "seo_health_check",
      status: "success",
      message: `${allProducts.length} products, ${missingMeta.length} missing meta, ${lowSeo.length} low SEO`,
      data: {
        total: allProducts.length,
        missing_meta: missingMeta.length,
        low_seo: lowSeo.length,
      },
    });
  } catch (err) {
    results.push({
      task: "seo_health_check",
      status: "failed",
      message: err instanceof Error ? err.message : "SEO check failed",
    });
  }

  // 3. Ad performance check
  try {
    const { data: activeCampaigns } = await supabase
      .from("ad_campaigns")
      .select("id, name, spend, revenue, roas, cpa")
      .eq("status", "active");

    const lowPerf = (activeCampaigns || []).filter((c) => c.roas < 1 && c.spend > 50);

    results.push({
      task: "ad_performance_check",
      status: "success",
      message: `${activeCampaigns?.length || 0} active campaigns, ${lowPerf.length} underperforming`,
      data: {
        active: activeCampaigns?.length || 0,
        underperforming: lowPerf.length,
        alerts: lowPerf.map((c) => `${c.name}: ROAS ${c.roas}x, Spend $${c.spend}`),
      },
    });
  } catch (err) {
    results.push({
      task: "ad_performance_check",
      status: "failed",
      message: err instanceof Error ? err.message : "Ad check failed",
    });
  }

  // 4. Inventory alerts
  try {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, stock_quantity, stock")
      .eq("platform", "shopify");

    const outOfStock = (products || []).filter((p) => (p.stock_quantity ?? p.stock ?? 0) === 0);
    const lowStock = (products || []).filter((p) => {
      const qty = p.stock_quantity ?? p.stock ?? 0;
      return qty > 0 && qty < 5;
    });

    results.push({
      task: "inventory_alert",
      status: "success",
      message: `${outOfStock.length} out of stock, ${lowStock.length} low stock`,
      data: { out_of_stock: outOfStock.length, low_stock: lowStock.length },
    });
  } catch (err) {
    results.push({
      task: "inventory_alert",
      status: "failed",
      message: err instanceof Error ? err.message : "Inventory check failed",
    });
  }

  // 5. Social content schedule check
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: scheduled } = await supabase
      .from("scheduled_posts")
      .select("id, content_preview, platform, scheduled_at")
      .eq("status", "queued")
      .lte("scheduled_at", today + "T23:59:59");

    results.push({
      task: "social_schedule_check",
      status: "success",
      message: `${scheduled?.length || 0} posts scheduled for today`,
      data: { today_posts: scheduled?.length || 0 },
    });
  } catch (err) {
    results.push({
      task: "social_schedule_check",
      status: "failed",
      message: err instanceof Error ? err.message : "Schedule check failed",
    });
  }

  // 6. Radar scan (also run daily for fresh data)
  try {
    const radar = await runRadarScan();
    results.push({
      task: "daily_radar_scan",
      status: "success",
      message: `Created ${radar.signals_created} signals`,
    });
  } catch (err) {
    results.push({
      task: "daily_radar_scan",
      status: "failed",
      message: err instanceof Error ? err.message : "Radar failed",
    });
  }

  await logRun("daily", "cron", results, Date.now() - startTime);
  return results;
}

// ============ Get Recent Logs ============
export async function getRecentOpsLogs(limit: number = 10) {
  const { data } = await supabase
    .from("auto_ops_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

// ============ Log Helper ============
async function logRun(
  runType: string,
  trigger: string,
  results: TaskResult[],
  durationMs: number
) {
  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  await supabase.from("auto_ops_logs").insert({
    run_type: runType,
    trigger_source: trigger,
    tasks_executed: results.map((r) => r.task),
    results_summary: {
      total: results.length,
      success: successCount,
      failed: failedCount,
      tasks: results,
    },
    errors: results.filter((r) => r.status === "failed").map((r) => ({ task: r.task, error: r.message })),
    duration_ms: durationMs,
  });
}
