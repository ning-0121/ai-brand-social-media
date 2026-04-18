import { supabase } from "./supabase";
import { runRadarScan } from "./radar-engine";
import { runDiagnostic } from "./diagnostic-engine";
import { autoPublishDuePosts } from "./social-publisher";
import { executeDailyTasks, recordPerformanceSnapshot, generateWeeklyPlan, weeklyReview, archiveYesterdayTasks } from "./ops-director";
import { runSkillScout } from "./skill-scout";
import { generateDailyReport } from "./daily-report";
import { autoRetryFailedTasks } from "./failure-diagnostic";
import { runAIInspector } from "./ai-inspector";
import { measureDueOutcomes } from "./outcomes";

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

  // 3. Process content queue → create scheduled_posts
  try {
    const { processContentQueue, syncQueueStatus } = await import("./content-queue-processor");
    const queueResult = await processContentQueue();
    const synced = await syncQueueStatus();
    results.push({
      task: "content_queue_process",
      status: queueResult.errors.length > 0 ? "failed" : "success",
      message: `Processed ${queueResult.processed}, synced ${synced}`,
      data: { ...queueResult, synced } as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({
      task: "content_queue_process",
      status: "failed",
      message: err instanceof Error ? err.message : "Queue processing failed",
    });
  }

  // 4. Auto-publish due social posts
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

  // 4.4 AI 督察：每小时体检 + 自动修复卡住任务
  try {
    const insp = await runAIInspector();
    results.push({
      task: "ai_inspector",
      status: insp.verdict === "critical" ? "failed" : "success",
      message: insp.summary,
      data: insp as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({ task: "ai_inspector", status: "failed", message: err instanceof Error ? err.message : "督察失败" });
  }

  // 4.5 自动重试失败任务（限流/超时类可重试）
  try {
    const retryResult = await autoRetryFailedTasks();
    if (retryResult.retried > 0) {
      results.push({
        task: "auto_retry_failures",
        status: "success",
        message: `重新排队 ${retryResult.retried} 个失败任务`,
      });
    }
  } catch (err) {
    results.push({ task: "auto_retry_failures", status: "failed", message: err instanceof Error ? err.message : "重试失败" });
  }

  // 5. 自动执行运营任务（每小时跑一批 pending 任务）
  try {
    const opsResult = await executeDailyTasks();
    const totalProcessed = opsResult.executed + opsResult.approval + opsResult.failed;
    results.push({
      task: "ops_auto_execute",
      status: totalProcessed > 0 ? "success" : "skipped",
      message: totalProcessed > 0
        ? `自动执行 ${opsResult.executed}, 等审批 ${opsResult.approval}, 失败 ${opsResult.failed}, 跳过 ${opsResult.skipped}`
        : "没有 pending 任务",
      data: opsResult as unknown as Record<string, unknown>,
    });

    // 6. 如果所有任务都完成了 → 自动生成新的店铺周计划（补充任务）
    if (totalProcessed === 0) {
      // 检查是否还有 pending 任务
      const { count: pendingCount } = await supabase
        .from("ops_daily_tasks").select("*", { count: "exact", head: true })
        .eq("execution_status", "pending");

      // 检查是否有活跃目标
      const { count: goalCount } = await supabase
        .from("ops_goals").select("*", { count: "exact", head: true })
        .eq("status", "active");

      if ((pendingCount || 0) === 0 && (goalCount || 0) > 0) {
        try {
          await generateWeeklyPlan("store");
          results.push({
            task: "auto_replan",
            status: "success",
            message: "所有任务已完成，自动生成新一轮店铺计划",
          });
        } catch (err) {
          results.push({
            task: "auto_replan",
            status: "failed",
            message: err instanceof Error ? err.message : "自动补计划失败",
          });
        }
      }
    }
  } catch (err) {
    results.push({
      task: "ops_auto_execute",
      status: "failed",
      message: err instanceof Error ? err.message : "自动执行失败",
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

  // 0a. 效果回传：测量到期的 SEO outcomes，回写 prompt_runs.score
  try {
    const om = await measureDueOutcomes();
    results.push({
      task: "measure_outcomes",
      status: "success",
      message: `测量 ${om.measured} 个效果（跳过 ${om.skipped}，失败 ${om.failed}），平均商业分 ${om.avg_business_score ?? "N/A"}`,
      data: om as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({ task: "measure_outcomes", status: "failed", message: err instanceof Error ? err.message : "outcomes 失败" });
  }

  // 0. 日结归档：昨天未完成的任务归档
  try {
    const archiveResult = await archiveYesterdayTasks();
    results.push({
      task: "archive_yesterday",
      status: "success",
      message: `归档 ${archiveResult.archived} 个未完成任务，${archiveResult.failed_moved} 个失败任务进入失败池`,
    });
  } catch (err) {
    results.push({ task: "archive_yesterday", status: "failed", message: err instanceof Error ? err.message : "归档失败" });
  }

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

  // 7. Record KPI snapshot
  try {
    await recordPerformanceSnapshot();
    results.push({ task: "kpi_snapshot", status: "success", message: "KPI 快照已记录" });
  } catch (err) {
    results.push({ task: "kpi_snapshot", status: "failed", message: err instanceof Error ? err.message : "快照失败" });
  }

  // 8. Execute today's AI-planned tasks
  try {
    const opsResult = await executeDailyTasks();
    results.push({
      task: "ops_daily_tasks",
      status: "success",
      message: `执行 ${opsResult.executed}, 审批 ${opsResult.approval}, 失败 ${opsResult.failed}`,
      data: opsResult as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({ task: "ops_daily_tasks", status: "failed", message: err instanceof Error ? err.message : "任务执行失败" });
  }

  // 9. Measure pending action impacts (7-day lookback)
  try {
    const { measurePendingImpacts } = await import("./action-impact-tracker");
    const impactResult = await measurePendingImpacts();
    results.push({
      task: "measure_action_impacts",
      status: impactResult.errors > 0 ? "failed" : "success",
      message: `Measured ${impactResult.measured}, errors ${impactResult.errors}`,
      data: impactResult as unknown as Record<string, unknown>,
    });
  } catch (err) {
    results.push({ task: "measure_action_impacts", status: "failed", message: err instanceof Error ? err.message : "Impact measurement failed" });
  }

  // 10. Monday: generate weekly plans + weekly report
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 1) {
    try {
      await generateWeeklyPlan("store");
      await generateWeeklyPlan("social");
      results.push({ task: "weekly_plan_generation", status: "success", message: "已生成本周店铺和社媒计划" });
    } catch (err) {
      results.push({ task: "weekly_plan_generation", status: "failed", message: err instanceof Error ? err.message : "计划生成失败" });
    }
  }

  // Monday also: generate weekly report
  if (dayOfWeek === 1) {
    try {
      const { generateWeeklyReport } = await import("./weekly-report-generator");
      await generateWeeklyReport();
      results.push({ task: "weekly_report", status: "success", message: "已生成本周运营周报" });
    } catch (err) {
      results.push({ task: "weekly_report", status: "failed", message: err instanceof Error ? err.message : "周报生成失败" });
    }
  }

  // 11. Sunday: weekly review
  if (dayOfWeek === 0) {
    try {
      await weeklyReview("store");
      await weeklyReview("social");
      results.push({ task: "weekly_review", status: "success", message: "已完成本周复盘" });
    } catch (err) {
      results.push({ task: "weekly_review", status: "failed", message: err instanceof Error ? err.message : "复盘失败" });
    }
  }

  // 12. Daily Report — 每天生成运营日报
  try {
    const dailyReport = await generateDailyReport();
    results.push({
      task: "daily_report",
      status: "success",
      message: `日报已生成：${dailyReport.tasks_executed} 任务执行，SEO 变化 ${dailyReport.changes.seo_score_change > 0 ? "+" : ""}${dailyReport.changes.seo_score_change}`,
    });
  } catch (err) {
    results.push({ task: "daily_report", status: "failed", message: err instanceof Error ? err.message : "日报生成失败" });
  }

  // 13. Wednesday + Saturday: Skill Scout — 自动学习，扫描 GitHub 发现新工具
  if (dayOfWeek === 3 || dayOfWeek === 6) {
    try {
      const scoutReport = await runSkillScout();
      results.push({
        task: "skill_scout",
        status: scoutReport.findings.length > 0 ? "success" : "skipped",
        message: `扫描 ${scoutReport.sources_checked} 个项目，发现 ${scoutReport.findings.length} 个有价值工具`,
        data: { top_recommendations: scoutReport.top_recommendations } as Record<string, unknown>,
      });
    } catch (err) {
      results.push({ task: "skill_scout", status: "failed", message: err instanceof Error ? err.message : "Skill 扫描失败" });
    }
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

  // Also write to audit_logs for unified tracking
  const { logAudit } = await import("./audit-logger");
  await logAudit({
    actorType: "cron",
    actorId: runType,
    actionType: `auto_ops.${runType}`,
    requestPayload: { trigger, tasks: results.map((r) => r.task) },
    responsePayload: { total: results.length, success: successCount, failed: failedCount },
    status: failedCount > 0 ? (successCount > 0 ? "partial" : "failed") : "success",
    error: failedCount > 0 ? results.filter((r) => r.status === "failed").map((r) => r.message).join("; ") : undefined,
    durationMs,
  });
}
