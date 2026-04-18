/**
 * 效果回传闭环
 *
 * 流程：
 *  1. 部署时 → recordSEOOutcome() 记录基线 + 调度 7 天后测量
 *  2. Daily cron → measureDueOutcomes() 找所有到期记录，测量真实指标
 *  3. 计算 business_score 0-100，写回 prompt_runs.score（覆盖 QA 分，因为商业分更重要）
 *  4. 督察 autoPromoteChampion 用这个更真实的 score 晋升版本
 */

import { supabase } from "./supabase";

export interface OutcomeBaselineSEO {
  seo_score: number;
  meta_title: string;
  meta_description: string;
  tags: string;
  measured_at_baseline: string;
}

export interface OutcomeMeasurementSEO extends OutcomeBaselineSEO {
  /** GA4 sessions to this product page during window (optional) */
  ga4_sessions_window?: number;
}

/** 默认等 7 天再测量 */
const DEFAULT_MEASURE_DELAY_DAYS = 7;

/**
 * 部署 SEO 改动时调用：记录基线 + 调度测量
 */
export async function recordSEOOutcome(params: {
  productId: string;
  productName: string;
  promptSlug: string;
  promptRunId?: string;
  promptVersion?: number;
}): Promise<{ outcome_id: string } | null> {
  const { data: product } = await supabase
    .from("products")
    .select("seo_score, meta_title, meta_description, tags")
    .eq("id", params.productId)
    .maybeSingle();

  if (!product) return null;

  const baseline: OutcomeBaselineSEO = {
    seo_score: product.seo_score || 0,
    meta_title: product.meta_title || "",
    meta_description: product.meta_description || "",
    tags: product.tags || "",
    measured_at_baseline: new Date().toISOString(),
  };

  const measureAfter = new Date(Date.now() + DEFAULT_MEASURE_DELAY_DAYS * 86400000).toISOString();

  const { data, error } = await supabase.from("prompt_outcomes").insert({
    prompt_slug: params.promptSlug,
    prompt_version: params.promptVersion,
    prompt_run_id: params.promptRunId,
    outcome_type: "seo_fix",
    target_type: "product",
    target_id: params.productId,
    target_name: params.productName,
    baseline,
    measure_after: measureAfter,
    status: "pending",
  }).select("id").single();

  if (error) {
    console.error("[outcomes] recordSEOOutcome insert failed:", error.message, "— 可能 prompt_outcomes 表未迁移");
    return null;
  }
  return { outcome_id: data.id };
}

/**
 * 测量单个 outcome：读当前指标 → 比对基线 → 算分 → 回写 prompt_runs.score
 */
export async function measureOutcome(outcomeId: string): Promise<{ business_score: number | null; notes: string }> {
  const { data: outcome } = await supabase
    .from("prompt_outcomes")
    .select("*")
    .eq("id", outcomeId)
    .single();

  if (!outcome) return { business_score: null, notes: "outcome 不存在" };

  if (outcome.outcome_type === "seo_fix") {
    const { data: product } = await supabase
      .from("products")
      .select("seo_score, meta_title, meta_description, tags")
      .eq("id", outcome.target_id)
      .maybeSingle();

    if (!product) {
      await supabase.from("prompt_outcomes").update({
        status: "skipped",
        measured_at: new Date().toISOString(),
        notes: "商品已删除",
      }).eq("id", outcomeId);
      return { business_score: null, notes: "商品已删除" };
    }

    const baseline = outcome.baseline as OutcomeBaselineSEO;
    const currentScore = product.seo_score || 0;
    const seoDelta = currentScore - baseline.seo_score;

    const measurement: OutcomeMeasurementSEO = {
      seo_score: currentScore,
      meta_title: product.meta_title || "",
      meta_description: product.meta_description || "",
      tags: product.tags || "",
      measured_at_baseline: baseline.measured_at_baseline,
    };

    // 计算 business_score：基于 SEO 分变化（-20..+20 映射到 0..100）
    // 正向 +10 分 → 75 分；+20 分 → 100 分；持平 → 50 分；-10 → 25 分；-20 → 0 分
    let businessScore: number;
    if (seoDelta >= 20) businessScore = 100;
    else if (seoDelta <= -20) businessScore = 0;
    else businessScore = 50 + seoDelta * 2.5;
    businessScore = Math.round(Math.max(0, Math.min(100, businessScore)));

    const delta = {
      seo_score_delta: seoDelta,
      meta_title_changed: measurement.meta_title !== baseline.meta_title,
      meta_description_changed: measurement.meta_description !== baseline.meta_description,
    };

    await supabase.from("prompt_outcomes").update({
      measurement,
      delta,
      business_score: businessScore,
      measured_at: new Date().toISOString(),
      status: "measured",
      notes: `SEO 分 ${baseline.seo_score} → ${currentScore}（${seoDelta >= 0 ? "+" : ""}${seoDelta}）`,
    }).eq("id", outcomeId);

    // 回写 prompt_runs.score（商业分覆盖 QA 分，因为真实效果更权威）
    if (outcome.prompt_run_id) {
      await supabase.from("prompt_runs")
        .update({ score: businessScore, tags: ["outcome_measured"] })
        .eq("id", outcome.prompt_run_id);
    }

    return { business_score: businessScore, notes: `SEO 分变化 ${seoDelta >= 0 ? "+" : ""}${seoDelta}，商业分 ${businessScore}` };
  }

  // detail_page / homepage_hero / landing_page / social — 暂不测量（需要更多埋点）
  await supabase.from("prompt_outcomes").update({
    status: "skipped",
    measured_at: new Date().toISOString(),
    notes: `${outcome.outcome_type} 类型暂未实现测量`,
  }).eq("id", outcomeId);

  return { business_score: null, notes: "类型未实现" };
}

/**
 * Daily cron：找所有到期 pending 的 outcomes，批量测量
 */
export async function measureDueOutcomes(): Promise<{
  total: number;
  measured: number;
  skipped: number;
  failed: number;
  avg_business_score: number | null;
}> {
  const { data: due } = await supabase
    .from("prompt_outcomes")
    .select("id")
    .eq("status", "pending")
    .lte("measure_after", new Date().toISOString())
    .limit(100);

  const total = due?.length || 0;
  let measured = 0, skipped = 0, failed = 0;
  const scores: number[] = [];

  for (const o of due || []) {
    try {
      const r = await measureOutcome(o.id);
      if (r.business_score != null) {
        measured++;
        scores.push(r.business_score);
      } else {
        skipped++;
      }
    } catch {
      failed++;
      await supabase.from("prompt_outcomes").update({
        status: "failed",
        measured_at: new Date().toISOString(),
      }).eq("id", o.id);
    }
  }

  return {
    total,
    measured,
    skipped,
    failed,
    avg_business_score: scores.length > 0
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : null,
  };
}

/** 最近 N 天的 outcomes 汇总（给驾驶舱面板用） */
export async function summarizeRecentOutcomes(days = 30): Promise<{
  pending: number;
  measured: number;
  avg_business_score: number | null;
  by_slug: Array<{ slug: string; measured: number; avg_business_score: number | null }>;
  recent: Array<{
    slug: string; version: number | null;
    target_name: string | null;
    business_score: number | null;
    notes: string | null;
    measured_at: string | null;
  }>;
}> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [pendingRes, { data: measured }] = await Promise.all([
    supabase.from("prompt_outcomes").select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gte("created_at", since),
    supabase.from("prompt_outcomes").select("prompt_slug, prompt_version, target_name, business_score, notes, measured_at")
      .eq("status", "measured")
      .gte("measured_at", since)
      .order("measured_at", { ascending: false })
      .limit(100),
  ]);

  const pendingCount = pendingRes.count || 0;
  const measuredList = measured || [];

  const scores = measuredList.map(m => m.business_score).filter((s): s is number => typeof s === "number");
  const avg = scores.length > 0
    ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
    : null;

  // Per-slug
  const bySlugMap: Record<string, number[]> = {};
  for (const m of measuredList) {
    if (typeof m.business_score === "number") {
      if (!bySlugMap[m.prompt_slug]) bySlugMap[m.prompt_slug] = [];
      bySlugMap[m.prompt_slug].push(m.business_score);
    }
  }
  const bySlug = Object.entries(bySlugMap).map(([slug, arr]) => ({
    slug,
    measured: arr.length,
    avg_business_score: Math.round(arr.reduce((s, n) => s + n, 0) / arr.length),
  })).sort((a, b) => (b.avg_business_score || 0) - (a.avg_business_score || 0));

  return {
    pending: pendingCount,
    measured: measuredList.length,
    avg_business_score: avg,
    by_slug: bySlug,
    recent: measuredList.slice(0, 10).map(m => ({
      slug: m.prompt_slug,
      version: m.prompt_version,
      target_name: m.target_name,
      business_score: m.business_score,
      notes: m.notes,
      measured_at: m.measured_at,
    })),
  };
}
