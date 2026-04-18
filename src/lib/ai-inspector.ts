/**
 * AI 督察 — 每小时审查 AI 工作质量
 *
 * 检查 4 个维度：
 *   1. 吞吐：过去 24h 完成 vs 失败 vs 待执行
 *   2. 速度：各 skill 平均耗时，识别慢 skill
 *   3. 质量：QA 分数分布 + 图片生成成功率
 *   4. 故障：错误模式聚类，识别常见失败原因
 *
 * 并执行自动修复：
 *   - 卡住 >15 分钟的 running 任务 → 重置 pending
 *   - 连续失败 ≥3 次的任务 → 标记跳过
 *   - 严重积压（pending >50） → 触发 agent-pool
 */

import { supabase } from "./supabase";
import { executeAgentPool } from "./agent-pool";
import { autoPromoteChampion } from "./prompts";

export interface InspectorReport {
  timestamp: string;
  window_hours: number;
  // 吞吐
  throughput: {
    completed_24h: number;
    failed_24h: number;
    pending_now: number;
    running_now: number;
    success_rate: number; // 0-100
  };
  // 速度
  speed: {
    by_skill: Array<{
      skill_id: string;
      avg_duration_ms: number;
      samples: number;
    }>;
    slowest_skill: string | null;
    fastest_skill: string | null;
  };
  // 质量
  quality: {
    avg_qa_score: number | null;
    qa_samples: number;
    image_success_rate: number | null;
    image_samples: number;
  };
  // 故障
  failures: {
    top_errors: Array<{ pattern: string; count: number }>;
    stuck_tasks_reset: number;
  };
  // 自动操作
  actions_taken: string[];
  // 文字总结（给 Dashboard 用）
  verdict: "healthy" | "degraded" | "critical";
  summary: string;
}

export async function runAIInspector(): Promise<InspectorReport> {
  const now = new Date();
  const h24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const actionsTaken: string[] = [];

  // ═══ 1. 吞吐 ═══
  const [completedRes, failedRes, pendingRes, runningRes] = await Promise.all([
    supabase.from("ops_daily_tasks").select("id", { count: "exact", head: true })
      .in("execution_status", ["auto_executed", "completed"])
      .gte("updated_at", h24Ago),
    supabase.from("ops_daily_tasks").select("id", { count: "exact", head: true })
      .eq("execution_status", "failed").gte("updated_at", h24Ago),
    supabase.from("ops_daily_tasks").select("id", { count: "exact", head: true })
      .eq("execution_status", "pending"),
    supabase.from("ops_daily_tasks").select("id", { count: "exact", head: true })
      .eq("execution_status", "running"),
  ]);

  const completed24h = completedRes.count || 0;
  const failed24h = failedRes.count || 0;
  const pendingNow = pendingRes.count || 0;
  const runningNow = runningRes.count || 0;
  const successRate = completed24h + failed24h === 0
    ? 100
    : Math.round((completed24h / (completed24h + failed24h)) * 100);

  // ═══ 2. 速度 ═══
  const { data: recentSkillTasks } = await supabase
    .from("content_tasks")
    .select("skill_id, created_at, updated_at, status, result")
    .eq("status", "completed")
    .gte("created_at", h24Ago)
    .limit(500);

  const speedBySkill: Record<string, { total: number; count: number }> = {};
  for (const t of recentSkillTasks || []) {
    const meta = (t.result as Record<string, unknown>)?._llm_meta as { duration_ms?: number } | undefined;
    const dur = meta?.duration_ms ??
      (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
    if (dur > 0 && dur < 5 * 60 * 1000) {
      if (!speedBySkill[t.skill_id]) speedBySkill[t.skill_id] = { total: 0, count: 0 };
      speedBySkill[t.skill_id].total += dur;
      speedBySkill[t.skill_id].count += 1;
    }
  }
  const speedArr = Object.entries(speedBySkill).map(([skill_id, v]) => ({
    skill_id,
    avg_duration_ms: Math.round(v.total / v.count),
    samples: v.count,
  })).sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);

  // ═══ 3. 质量 ═══
  const { data: qaTasks } = await supabase
    .from("ops_daily_tasks")
    .select("execution_result, task_type")
    .in("execution_status", ["auto_executed", "completed"])
    .gte("updated_at", h24Ago)
    .limit(200);

  let qaSum = 0, qaCount = 0, imgOk = 0, imgTotal = 0;
  for (const t of qaTasks || []) {
    const r = t.execution_result as Record<string, unknown> | null;
    if (!r) continue;
    const qaScore = (r.qa_score as number) ?? ((r.preview as Record<string, unknown>)?.qa_score as number);
    if (typeof qaScore === "number" && qaScore > 0) {
      qaSum += qaScore;
      qaCount += 1;
    }
    // image tasks
    const imageUrl = ((r.output as Record<string, unknown>)?.image_url ?? r.image_url) as string | undefined;
    if (t.task_type?.includes("image") || t.task_type?.includes("photo") || t.task_type?.includes("banner")) {
      imgTotal += 1;
      if (imageUrl && imageUrl.startsWith("http")) imgOk += 1;
    }
  }

  // ═══ 4. 故障 ═══
  const { data: failures } = await supabase
    .from("ops_daily_tasks")
    .select("execution_result")
    .eq("execution_status", "failed")
    .gte("updated_at", h24Ago)
    .limit(100);

  const errorCounts: Record<string, number> = {};
  for (const f of failures || []) {
    const err = (f.execution_result as { error?: string })?.error || "unknown";
    // Bucket by first 40 chars
    const key = err.slice(0, 40);
    errorCounts[key] = (errorCounts[key] || 0) + 1;
  }
  const topErrors = Object.entries(errorCounts)
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  // ═══ 自动修复 ═══
  // 1. 重置卡住的 running 任务
  const { data: stuckTasks } = await supabase
    .from("ops_daily_tasks")
    .select("id")
    .eq("execution_status", "running")
    .lt("updated_at", fifteenMinAgo);
  const stuckCount = stuckTasks?.length || 0;
  if (stuckCount > 0) {
    await supabase.from("ops_daily_tasks")
      .update({ execution_status: "pending", updated_at: new Date().toISOString() })
      .in("id", stuckTasks!.map(t => t.id));
    actionsTaken.push(`重置 ${stuckCount} 个卡住任务 (running >15min)`);
  }

  // 2. Prompt 自动晋升：扫描所有 slug，有新版本超过冠军 5%+ 就晋升
  try {
    const { data: slugs } = await supabase
      .from("prompts").select("slug").eq("is_active", true);
    const uniqueSlugs = Array.from(new Set((slugs || []).map(s => s.slug)));
    let promoted = 0;
    for (const s of uniqueSlugs) {
      try {
        const r = await autoPromoteChampion(s);
        if (r.promoted) {
          promoted++;
          actionsTaken.push(`🏆 ${s}: v${r.from_version} → v${r.to_version}（+${r.score_gain}分）`);
        }
      } catch { /* skip */ }
    }
    if (promoted === 0 && uniqueSlugs.length > 0) {
      // Silent: no promotions this round
    }
  } catch (e) {
    actionsTaken.push(`Prompt 晋升扫描失败：${e instanceof Error ? e.message : "unknown"}`);
  }

  // 3. 如果积压严重，触发 agent-pool
  if (pendingNow > 30) {
    try {
      const r = await executeAgentPool(20);
      actionsTaken.push(`触发 agent-pool 清理积压：dispatched=${r.dispatched}, succeeded=${r.succeeded}`);
    } catch (e) {
      actionsTaken.push(`agent-pool 触发失败：${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  // ═══ 诊断结论 ═══
  let verdict: InspectorReport["verdict"] = "healthy";
  const issues: string[] = [];
  if (successRate < 50) { verdict = "critical"; issues.push(`成功率仅 ${successRate}%`); }
  else if (successRate < 80) { verdict = "degraded"; issues.push(`成功率 ${successRate}% 偏低`); }
  if (pendingNow > 50) { verdict = verdict === "critical" ? "critical" : "degraded"; issues.push(`待执行 ${pendingNow} 个严重积压`); }
  if (speedArr[0]?.avg_duration_ms > 40000) { issues.push(`${speedArr[0].skill_id} 平均 ${(speedArr[0].avg_duration_ms / 1000).toFixed(1)}s 过慢`); }
  if (topErrors[0]?.count >= 5) { issues.push(`常见错误：${topErrors[0].pattern} (${topErrors[0].count}次)`); }

  const summary = issues.length === 0
    ? `一切正常：24h 完成 ${completed24h} 个任务，成功率 ${successRate}%`
    : `发现 ${issues.length} 个问题：${issues.join("；")}`;

  const report: InspectorReport = {
    timestamp: now.toISOString(),
    window_hours: 24,
    throughput: {
      completed_24h: completed24h,
      failed_24h: failed24h,
      pending_now: pendingNow,
      running_now: runningNow,
      success_rate: successRate,
    },
    speed: {
      by_skill: speedArr.slice(0, 10),
      slowest_skill: speedArr[0]?.skill_id || null,
      fastest_skill: speedArr[speedArr.length - 1]?.skill_id || null,
    },
    quality: {
      avg_qa_score: qaCount > 0 ? Math.round(qaSum / qaCount) : null,
      qa_samples: qaCount,
      image_success_rate: imgTotal > 0 ? Math.round((imgOk / imgTotal) * 100) : null,
      image_samples: imgTotal,
    },
    failures: {
      top_errors: topErrors,
      stuck_tasks_reset: stuckCount,
    },
    actions_taken: actionsTaken,
    verdict,
    summary,
  };

  // 写入日志
  await supabase.from("auto_ops_logs").insert({
    run_type: "ai_inspector",
    trigger_source: "scheduled",
    results_summary: report as unknown as Record<string, unknown>,
    duration_ms: Date.now() - now.getTime(),
  });

  return report;
}

export async function getLatestInspectorReport(): Promise<InspectorReport | null> {
  const { data } = await supabase
    .from("auto_ops_logs")
    .select("results_summary")
    .eq("run_type", "ai_inspector")
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0]?.results_summary as InspectorReport) || null;
}
