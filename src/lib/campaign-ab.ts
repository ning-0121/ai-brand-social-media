/**
 * Campaign A/B：并行生成 2 版活动 + 存入 campaign_variants 表
 * 部署后用 /api/campaigns/track 追踪点击/转化，自动宣布 winner
 */

import { supabase } from "./supabase";
import { composeCampaign, type CampaignSpec, type CampaignResult } from "./campaign-composer";

export interface ABResult {
  id: string;
  campaign_name: string;
  variant_a: CampaignResult;
  variant_b: CampaignResult;
  created_at: string;
}

export async function composeAB(spec: CampaignSpec): Promise<ABResult> {
  // 并行两个版本（B 版带 variant_hint）
  const [a, b] = await Promise.all([
    composeCampaign({ ...spec, variant_hint: "A" }),
    composeCampaign({ ...spec, variant_hint: "B" }),
  ]);

  const { data } = await supabase.from("campaign_variants").insert({
    campaign_name: spec.name,
    spec: spec as unknown as Record<string, unknown>,
    variant_a: a as unknown as Record<string, unknown>,
    variant_b: b as unknown as Record<string, unknown>,
  }).select("id, created_at").single();

  return {
    id: data!.id,
    campaign_name: spec.name,
    variant_a: a,
    variant_b: b,
    created_at: data!.created_at,
  };
}

export type TrackEvent = "view" | "conversion";

export async function trackABEvent(variantId: string, which: "a" | "b", event: TrackEvent): Promise<void> {
  const col = event === "view"
    ? (which === "a" ? "views_a" : "views_b")
    : (which === "a" ? "conversions_a" : "conversions_b");

  // RPC 原子递增更稳，这里简化：读取 → +1 → 写回
  const { data } = await supabase.from("campaign_variants").select(col).eq("id", variantId).maybeSingle();
  if (!data) return;
  const current = (data as Record<string, number>)[col] || 0;
  await supabase.from("campaign_variants").update({ [col]: current + 1 }).eq("id", variantId);
}

/**
 * 宣布 winner：两边至少 100 views 且转化率差 ≥ 30%
 */
export async function declareWinner(variantId: string): Promise<{ winner: "a" | "b" | null; reason: string }> {
  const { data } = await supabase.from("campaign_variants").select("*").eq("id", variantId).single();
  if (!data) return { winner: null, reason: "not found" };
  if (data.winner) return { winner: data.winner, reason: "already declared" };

  const va = data.views_a || 0, vb = data.views_b || 0;
  const ca = data.conversions_a || 0, cb = data.conversions_b || 0;

  if (va < 100 || vb < 100) return { winner: null, reason: `需要两边各 100 views（现 ${va}/${vb}）` };
  const rateA = ca / va, rateB = cb / vb;
  if (Math.abs(rateA - rateB) / Math.max(rateA, rateB, 0.001) < 0.3) {
    return { winner: null, reason: "两版转化率差距 <30%，继续收集" };
  }

  const winner = rateA > rateB ? "a" : "b";
  await supabase.from("campaign_variants").update({
    winner,
    winner_declared_at: new Date().toISOString(),
  }).eq("id", variantId);

  return { winner, reason: `A: ${(rateA * 100).toFixed(1)}% vs B: ${(rateB * 100).toFixed(1)}%` };
}
