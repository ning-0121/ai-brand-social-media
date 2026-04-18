import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 30;

/**
 * GET /api/costs?days=30
 * 汇总 prompt_runs 的 cost_usd + latency + token 使用
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: runs } = await supabase
    .from("prompt_runs")
    .select("prompt_slug, model_used, latency_ms, input_tokens, output_tokens, cost_usd, success, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const all = runs || [];

  // 汇总
  let totalCost = 0, totalRuns = 0, totalTokensIn = 0, totalTokensOut = 0, totalFailed = 0;
  const bySlug: Record<string, { runs: number; cost: number; avg_latency: number; total_latency: number; in_tok: number; out_tok: number; failed: number }> = {};
  const byModel: Record<string, { runs: number; cost: number; in_tok: number; out_tok: number }> = {};
  const byDay: Record<string, { cost: number; runs: number }> = {};

  for (const r of all) {
    totalRuns++;
    if (!r.success) totalFailed++;
    const cost = Number(r.cost_usd || 0);
    totalCost += cost;
    totalTokensIn += r.input_tokens || 0;
    totalTokensOut += r.output_tokens || 0;

    const s = r.prompt_slug || "(unknown)";
    if (!bySlug[s]) bySlug[s] = { runs: 0, cost: 0, avg_latency: 0, total_latency: 0, in_tok: 0, out_tok: 0, failed: 0 };
    bySlug[s].runs++;
    bySlug[s].cost += cost;
    bySlug[s].total_latency += r.latency_ms || 0;
    bySlug[s].in_tok += r.input_tokens || 0;
    bySlug[s].out_tok += r.output_tokens || 0;
    if (!r.success) bySlug[s].failed++;

    const m = r.model_used || "(unknown)";
    if (!byModel[m]) byModel[m] = { runs: 0, cost: 0, in_tok: 0, out_tok: 0 };
    byModel[m].runs++;
    byModel[m].cost += cost;
    byModel[m].in_tok += r.input_tokens || 0;
    byModel[m].out_tok += r.output_tokens || 0;

    const day = r.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { cost: 0, runs: 0 };
    byDay[day].cost += cost;
    byDay[day].runs++;
  }

  // Finalize averages
  const slugsArr = Object.entries(bySlug).map(([slug, v]) => ({
    slug,
    runs: v.runs,
    cost: Math.round(v.cost * 1_000_000) / 1_000_000,
    avg_latency_ms: v.runs > 0 ? Math.round(v.total_latency / v.runs) : 0,
    avg_cost_per_run: v.runs > 0 ? v.cost / v.runs : 0,
    input_tokens: v.in_tok,
    output_tokens: v.out_tok,
    failed: v.failed,
  })).sort((a, b) => b.cost - a.cost);

  const modelsArr = Object.entries(byModel).map(([model, v]) => ({
    model,
    runs: v.runs,
    cost: Math.round(v.cost * 1_000_000) / 1_000_000,
    input_tokens: v.in_tok,
    output_tokens: v.out_tok,
    avg_cost_per_run: v.runs > 0 ? v.cost / v.runs : 0,
  })).sort((a, b) => b.cost - a.cost);

  const trendArr = Object.entries(byDay).map(([date, v]) => ({
    date,
    cost: Math.round(v.cost * 1_000_000) / 1_000_000,
    runs: v.runs,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    window_days: days,
    totals: {
      total_cost_usd: Math.round(totalCost * 1_000_000) / 1_000_000,
      total_runs: totalRuns,
      failed_runs: totalFailed,
      success_rate: totalRuns > 0 ? Math.round(((totalRuns - totalFailed) / totalRuns) * 100) : 100,
      input_tokens: totalTokensIn,
      output_tokens: totalTokensOut,
    },
    by_slug: slugsArr,
    by_model: modelsArr,
    trend: trendArr,
  });
}
