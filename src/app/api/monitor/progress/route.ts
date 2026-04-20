import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 30;

/**
 * 48h 进度聚合：给 /monitor 页面一次性喂完整上下文
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get("hours") || "48");
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  // ── 1. 任务执行情况 ──
  const { data: allTasks } = await supabase
    .from("ops_daily_tasks")
    .select("id, task_type, title, description, target_product_name, execution_status, execution_result, updated_at, created_at, task_date")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(500);

  const tasksByStatus: Record<string, number> = {};
  const concreteWins: Array<{ task_type: string; title: string; detail: string; updated_at: string; product?: string }> = [];
  const failures: Array<{ id: string; task_type: string; title: string; error: string; updated_at: string; product?: string }> = [];

  for (const t of allTasks || []) {
    const status = t.execution_status as string;
    tasksByStatus[status] = (tasksByStatus[status] || 0) + 1;

    const r = t.execution_result as Record<string, unknown> | null;
    if (status === "auto_executed" || status === "completed") {
      // 从 execution_result 提取具体产出
      let detail = "";
      if (r?.action === "seo_updated") detail = `SEO 更新（QA ${r.qa_score || "?"}/100）`;
      else if (r?.action === "detail_page_updated") detail = "详情页已部署";
      else if (r?.action === "homepage_hero_generated") detail = "首页 Hero 已生成";
      else if (r?.action === "discount_created") detail = `折扣码 ${r.code} · ${r.value}`;
      else if (r?.action === "bundle_page_created") detail = `套装页创建（ID ${r.page_id}）`;
      else if (r?.action === "winback_email_generated") detail = "弃购挽回邮件已生成";
      else if (r?.action === "dispatched_to_inngest") detail = "已分派到 Inngest DAG";
      else if (r?.action === "approval_created") detail = "已创建审批";
      else if (r?.skipped) detail = `跳过：${r.reason}`;
      else detail = String(r?.action || "已完成");
      concreteWins.push({
        task_type: t.task_type as string,
        title: t.title as string,
        detail,
        updated_at: t.updated_at as string,
        product: (t.target_product_name as string) || undefined,
      });
    } else if (status === "failed") {
      failures.push({
        id: t.id as string,
        task_type: t.task_type as string,
        title: t.title as string,
        error: String((r?.error as string) || "unknown"),
        updated_at: t.updated_at as string,
        product: (t.target_product_name as string) || undefined,
      });
    }
  }

  // Top 错误聚类
  const errorClusters: Record<string, { count: number; task_ids: string[]; sample: string }> = {};
  for (const f of failures) {
    const key = f.error.slice(0, 50);
    if (!errorClusters[key]) errorClusters[key] = { count: 0, task_ids: [], sample: f.title };
    errorClusters[key].count++;
    if (errorClusters[key].task_ids.length < 10) errorClusters[key].task_ids.push(f.id);
  }
  const topErrors = Object.entries(errorClusters)
    .map(([pattern, v]) => ({ pattern, count: v.count, sample_title: v.sample, task_ids: v.task_ids }))
    .sort((a, b) => b.count - a.count).slice(0, 6);

  // ── 2. Cron 健康 ──
  const { data: cronLogs } = await supabase
    .from("auto_ops_logs")
    .select("run_type, created_at, results_summary, duration_ms, errors")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  // 按 run_type 分组，检测每种 cron 的最新一次执行时间
  const cronByType: Record<string, { last_run: string; count: number; avg_duration_ms: number; has_errors: boolean }> = {};
  for (const log of cronLogs || []) {
    const k = log.run_type as string;
    if (!cronByType[k]) cronByType[k] = { last_run: log.created_at as string, count: 0, avg_duration_ms: 0, has_errors: false };
    cronByType[k].count++;
    cronByType[k].avg_duration_ms += log.duration_ms || 0;
    if (log.errors && Array.isArray(log.errors) && log.errors.length > 0) cronByType[k].has_errors = true;
  }
  for (const k of Object.keys(cronByType)) {
    cronByType[k].avg_duration_ms = Math.round(cronByType[k].avg_duration_ms / cronByType[k].count);
  }

  // ── 3. Campaign + A/B 活动 ──
  const { data: variants } = await supabase
    .from("campaign_variants")
    .select("id, campaign_name, winner, views_a, views_b, conversions_a, conversions_b, deployed_a_url, deployed_b_url, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const { data: calendarDue } = await supabase
    .from("campaign_calendar")
    .select("id, scheduled_date, campaign_name, status, holiday_tag")
    .gte("scheduled_date", new Date().toISOString().split("T")[0])
    .lte("scheduled_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0])
    .order("scheduled_date", { ascending: true });

  // ── 4. LLM 调用健康 ──
  const { data: recentRuns } = await supabase
    .from("prompt_runs")
    .select("prompt_slug, latency_ms, success, cost_usd, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  const llmTotal = recentRuns?.length || 0;
  const llmCost = (recentRuns || []).reduce((s, r) => s + Number(r.cost_usd || 0), 0);
  const llmLatency = llmTotal > 0
    ? Math.round((recentRuns || []).reduce((s, r) => s + (r.latency_ms || 0), 0) / llmTotal)
    : 0;

  // ── 5. 异常检测 ──
  const anomalies: Array<{ severity: "critical" | "warning"; type: string; message: string; detail?: string }> = [];

  // 5a. 卡住 running 任务 > 15min
  const fifteenMinAgo = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: stuckTasks } = await supabase.from("ops_daily_tasks")
    .select("id, title").eq("execution_status", "running").lt("updated_at", fifteenMinAgo);
  if ((stuckTasks?.length || 0) > 0) {
    anomalies.push({
      severity: "warning",
      type: "stuck_running",
      message: `${stuckTasks!.length} 个任务 running 超 15 分钟未更新`,
      detail: stuckTasks!.slice(0, 3).map(t => t.title).join(" / "),
    });
  }

  // 5b. 小时 cron 超过 2 小时没跑
  const hourlyLog = cronByType["hourly"];
  if (!hourlyLog) {
    anomalies.push({ severity: "critical", type: "cron_gap", message: `hourly cron 48h 内 0 次执行 — Vercel Cron 未配置或失败` });
  } else {
    const lastHourlyAgo = (Date.now() - new Date(hourlyLog.last_run).getTime()) / 60_000;
    if (lastHourlyAgo > 120) {
      anomalies.push({
        severity: "critical",
        type: "cron_gap",
        message: `hourly cron 超过 ${Math.round(lastHourlyAgo)} 分钟未执行（应每 60 分钟）`,
      });
    }
  }

  // 5c. daily cron 24h 内没跑
  const dailyLog = cronByType["daily"];
  if (!dailyLog) {
    anomalies.push({ severity: "critical", type: "cron_gap", message: `daily cron 48h 内 0 次执行` });
  }

  // 5d. 失败率 > 30%
  const totalDone = (tasksByStatus.auto_executed || 0) + (tasksByStatus.completed || 0) + (tasksByStatus.failed || 0);
  if (totalDone >= 10) {
    const failRate = ((tasksByStatus.failed || 0) / totalDone) * 100;
    if (failRate > 30) {
      anomalies.push({
        severity: "critical",
        type: "high_fail_rate",
        message: `任务失败率 ${failRate.toFixed(0)}%（${tasksByStatus.failed}/${totalDone}）`,
      });
    } else if (failRate > 15) {
      anomalies.push({
        severity: "warning",
        type: "elevated_fail_rate",
        message: `任务失败率 ${failRate.toFixed(0)}%，高于 15% 警戒线`,
      });
    }
  }

  // 5e. Pending 积压 > 50
  if ((tasksByStatus.pending || 0) > 50) {
    anomalies.push({
      severity: "warning",
      type: "queue_backlog",
      message: `待执行队列积压 ${tasksByStatus.pending} 个，超过 50 警戒线`,
    });
  }

  // 5f. LLM 成本异常
  if (llmCost > 20) {
    anomalies.push({
      severity: "warning",
      type: "cost_spike",
      message: `48h LLM 开销 $${llmCost.toFixed(2)}，请检查是否有循环调用`,
    });
  }

  // 5g. 长时间无交付
  if (concreteWins.length === 0 && hours >= 24) {
    anomalies.push({
      severity: "critical",
      type: "no_delivery",
      message: `${hours}h 内无任何任务成功交付`,
    });
  }

  // 健康分：100 - 20*critical - 5*warning - 失败率*0.5
  const criticalCount = anomalies.filter(a => a.severity === "critical").length;
  const warningCount = anomalies.filter(a => a.severity === "warning").length;
  const failPct = totalDone > 0 ? (tasksByStatus.failed || 0) / totalDone * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - criticalCount * 20 - warningCount * 5 - failPct * 0.5)));

  return NextResponse.json({
    window_hours: hours,
    generated_at: new Date().toISOString(),
    health_score: healthScore,
    summary: {
      tasks_completed: (tasksByStatus.auto_executed || 0) + (tasksByStatus.completed || 0),
      tasks_failed: tasksByStatus.failed || 0,
      tasks_pending: tasksByStatus.pending || 0,
      tasks_running: tasksByStatus.running || 0,
      llm_calls: llmTotal,
      llm_cost_usd: Math.round(llmCost * 100) / 100,
      llm_avg_latency_ms: llmLatency,
      ab_variants_created: variants?.length || 0,
      ab_winners: (variants || []).filter(v => v.winner).length,
    },
    concrete_wins: concreteWins.slice(0, 30),
    failures: failures.slice(0, 20),
    top_error_clusters: topErrors,
    cron_health: cronByType,
    ab_variants: variants || [],
    upcoming_calendar: calendarDue || [],
    anomalies,
  });
}
