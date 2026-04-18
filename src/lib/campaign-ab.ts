/**
 * Campaign A/B：并行生成 2 版活动 + 存入 campaign_variants 表
 * 部署后用 /api/campaigns/track 追踪点击/转化，自动宣布 winner
 */

import { supabase } from "./supabase";
import { composeCampaign, type CampaignSpec, type CampaignResult } from "./campaign-composer";
import { createShopifyPage } from "./shopify-operations";

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

  // 回流：把转化率映射到 0-100 分，写回对应 landing_page prompt_run.score
  // 10% 转化 → 100 分；5% → 80 分；2% → 60 分；1% → 40；0.5% → 20
  const toBusinessScore = (rate: number): number => {
    if (rate >= 0.10) return 100;
    if (rate <= 0) return 0;
    return Math.round(Math.min(100, Math.log10(rate * 1000) * 33));
  };

  const variantA = data.variant_a as { landing_prompt_run_id?: string } | null;
  const variantB = data.variant_b as { landing_prompt_run_id?: string } | null;

  const updates: Array<Promise<unknown>> = [];
  if (variantA?.landing_prompt_run_id) {
    updates.push(Promise.resolve(supabase.from("prompt_runs").update({
      score: toBusinessScore(rateA),
      tags: ["ab_measured", `winner_${winner}`, `rate_${(rateA * 100).toFixed(1)}pct`],
    }).eq("id", variantA.landing_prompt_run_id)));
  }
  if (variantB?.landing_prompt_run_id) {
    updates.push(Promise.resolve(supabase.from("prompt_runs").update({
      score: toBusinessScore(rateB),
      tags: ["ab_measured", `winner_${winner}`, `rate_${(rateB * 100).toFixed(1)}pct`],
    }).eq("id", variantB.landing_prompt_run_id)));
  }
  await Promise.allSettled(updates);

  return {
    winner,
    reason: `A: ${(rateA * 100).toFixed(1)}% (${toBusinessScore(rateA)}pt) vs B: ${(rateB * 100).toFixed(1)}% (${toBusinessScore(rateB)}pt)`,
  };
}

/**
 * Daily：扫已宣告 winner 但未部署的 variant，自动把胜出 landing_page HTML 推到 Shopify
 */
export async function deployWinnerVariants(): Promise<{
  deployed: number;
  skipped: number;
  failed: number;
  details: Array<{ variant_id: string; campaign: string; winner: string; status: string; error?: string; url?: string }>;
}> {
  const { data: winners } = await supabase
    .from("campaign_variants")
    .select("id, campaign_name, winner, variant_a, variant_b, deployed_a_url, deployed_b_url")
    .not("winner", "is", null)
    .is("deployed_a_url", null).is("deployed_b_url", null)
    .order("winner_declared_at", { ascending: false })
    .limit(5);

  const details: Array<{ variant_id: string; campaign: string; winner: string; status: string; error?: string; url?: string }> = [];
  let deployed = 0, skipped = 0, failed = 0;

  const { data: shopify } = await supabase.from("integrations")
    .select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
  if (!shopify) {
    return { deployed: 0, skipped: 0, failed: 0, details: [{ variant_id: "-", campaign: "-", winner: "-", status: "no_shopify", error: "未连接 Shopify" }] };
  }

  for (const v of winners || []) {
    const winnerData = (v.winner === "a" ? v.variant_a : v.variant_b) as CampaignResult | null;
    const html = winnerData?.components?.landing_page?.output?.body_html as string | undefined;
    if (!html || html.length < 200) {
      skipped++;
      details.push({ variant_id: v.id, campaign: v.campaign_name, winner: v.winner, status: "skipped", error: "胜出版本无 landing_page HTML" });
      continue;
    }

    try {
      const result = await createShopifyPage(shopify.id, `${v.campaign_name} · 胜出版`, html);
      const url = `https://admin.shopify.com/pages/${result.page_id}`;
      await supabase.from("campaign_variants").update({
        [v.winner === "a" ? "deployed_a_url" : "deployed_b_url"]: url,
      }).eq("id", v.id);
      deployed++;
      details.push({ variant_id: v.id, campaign: v.campaign_name, winner: v.winner, status: "deployed", url });
    } catch (err) {
      failed++;
      details.push({ variant_id: v.id, campaign: v.campaign_name, winner: v.winner, status: "failed", error: err instanceof Error ? err.message : "deploy failed" });
    }
  }

  return { deployed, skipped, failed, details };
}
