/**
 * 差距分析 — 对比「我们的产品」和「竞品」，生成 radar 数据 + 战术建议
 */

import { callLLM } from "../content-skills/llm";
import { supabase } from "../supabase";
import { TEARDOWN_RUBRIC, calculateTotalScore } from "./rubric";

export interface OurProductSnapshot {
  product_id?: string;
  product_name: string;
  price_usd?: number;
  description?: string;
  image_urls?: string[];
  // 如果我们对自己产品也打了分
  scores?: Record<string, number>;
}

export interface GapReport {
  our_total: number;
  competitor_total: number;
  max: number;
  lead_dimensions: Array<{ key: string; label: string; our: number; theirs: number; advantage: number }>;
  behind_dimensions: Array<{ key: string; label: string; our: number; theirs: number; deficit: number; suggested_action: string }>;
  radar_data: Array<{ group: string; our_pct: number; theirs_pct: number }>;
  top_insights: string[];
  recommended_actions: Array<{ priority: "high" | "medium" | "low"; action: string; rationale: string }>;
}

/**
 * 纯数据对比（不需要 LLM，即时出）
 */
export function computeRadar(
  ourScores: Record<string, number>,
  theirScores: Record<string, number>
): GapReport["radar_data"] {
  const groups: Array<"physical" | "ecommerce" | "pricing" | "marketing"> = ["physical", "ecommerce", "pricing", "marketing"];

  return groups.map(g => {
    let ourSum = 0, theirSum = 0, max = 0;
    for (const d of TEARDOWN_RUBRIC) {
      if (d.group !== g) continue;
      max += d.max_score;
      ourSum += ourScores[d.key] || 0;
      theirSum += theirScores[d.key] || 0;
    }
    return {
      group: g,
      our_pct: max > 0 ? Math.round((ourSum / max) * 100) : 0,
      theirs_pct: max > 0 ? Math.round((theirSum / max) * 100) : 0,
    };
  });
}

/**
 * 计算领先/落后维度
 */
export function computeDimensionGaps(
  ourScores: Record<string, number>,
  theirScores: Record<string, number>
): {
  lead: GapReport["lead_dimensions"];
  behind: Array<{ key: string; label: string; our: number; theirs: number; deficit: number }>;
} {
  const lead: GapReport["lead_dimensions"] = [];
  const behind: Array<{ key: string; label: string; our: number; theirs: number; deficit: number }> = [];

  for (const d of TEARDOWN_RUBRIC) {
    const our = ourScores[d.key] || 0;
    const theirs = theirScores[d.key] || 0;
    const diff = our - theirs;
    if (diff >= 1) {
      lead.push({ key: d.key, label: d.label, our, theirs, advantage: diff });
    } else if (diff <= -1) {
      behind.push({ key: d.key, label: d.label, our, theirs, deficit: -diff });
    }
  }

  // 排序：落后差距最大的靠前（优先补）
  behind.sort((a, b) => b.deficit - a.deficit);
  lead.sort((a, b) => b.advantage - a.advantage);

  return { lead, behind };
}

/**
 * AI 生成战术建议 — 只针对落后维度，告诉客户怎么补
 */
export async function generateGapInsights(
  ourProduct: OurProductSnapshot,
  competitorBrand: string,
  competitorName: string,
  competitorPrice: number | undefined,
  ourScores: Record<string, number>,
  theirScores: Record<string, number>
): Promise<Pick<GapReport, "top_insights" | "recommended_actions">> {
  const { behind, lead } = computeDimensionGaps(ourScores, theirScores);

  const behindWithDesc = behind.slice(0, 8).map(b => {
    const dim = TEARDOWN_RUBRIC.find(d => d.key === b.key);
    return {
      dimension: b.label,
      our_score: b.our,
      their_score: b.theirs,
      deficit: b.deficit,
      max: dim?.max_score,
      how_evaluated: dim?.how_to_evaluate,
    };
  });

  const leadWithDesc = lead.slice(0, 5).map(l => ({ dimension: l.label, advantage: l.advantage }));

  const ourTotal = calculateTotalScore(ourScores).total;
  const theirTotal = calculateTotalScore(theirScores).total;

  const result = await callLLM(
    `你是顶级 DTC 竞品分析师。根据两个产品在 25 维上的打分差距，告诉客户：
1. 最关键的 3-5 个洞察（不要泛泛而谈，必须点名具体维度和分差）
2. 按优先级排列的具体战术动作（high/medium/low），必须是「客户下周就能动手做的事」

原则：
- 只针对落后维度给战术，领先维度只需保持
- 每个行动必须具体到：做什么 / 怎么做 / 预期效果
- 不说 "提升品牌力" 这种废话

返回 JSON:
{
  "top_insights": ["洞察1（含具体分差）", "洞察2", ...],
  "recommended_actions": [
    {"priority": "high | medium | low", "action": "具体动作", "rationale": "为什么（含数据）"}
  ]
}`,
    `我方产品: ${ourProduct.product_name}${ourProduct.price_usd ? ` ($${ourProduct.price_usd})` : ""}
竞品: ${competitorBrand} - ${competitorName}${competitorPrice ? ` ($${competitorPrice})` : ""}

总分: 我方 ${ourTotal} vs 竞品 ${theirTotal}

落后维度 (按差距排序，前 8):
${JSON.stringify(behindWithDesc, null, 2)}

领先维度 (前 5，保持即可):
${JSON.stringify(leadWithDesc, null, 2)}

请返回 JSON。洞察要具体、战术要落地。`,
    3500
  );

  return {
    top_insights: (result.top_insights as string[]) || [],
    recommended_actions: (result.recommended_actions as GapReport["recommended_actions"]) || [],
  };
}

/**
 * 一站式差距分析
 */
export async function analyzeCompetitorGap(competitorProductId: string): Promise<GapReport> {
  const { data: comp } = await supabase
    .from("competitor_products")
    .select("*")
    .eq("id", competitorProductId)
    .single();
  if (!comp) throw new Error("竞品不存在");

  const theirScores = (comp.teardown_scores as Record<string, number>) || {};

  // 尝试找对标我方产品（通过 our_product_id）
  let ourProduct: OurProductSnapshot;
  if (comp.our_product_id) {
    const { data: ours } = await supabase
      .from("products")
      .select("id, name, price, body_html, image_url")
      .eq("id", comp.our_product_id)
      .single();
    ourProduct = {
      product_id: ours?.id,
      product_name: ours?.name || "未知产品",
      price_usd: ours?.price as number | undefined,
      description: (ours?.body_html || "").slice(0, 500),
      image_urls: ours?.image_url ? [ours.image_url as string] : [],
    };
  } else {
    ourProduct = { product_name: "（未绑定我方产品）" };
  }

  // 简化：我方打分暂从同店 brand_guides 推断（v1 用平均水平）
  // v2 版本：允许用户为自家产品填 rubric
  const ourScores: Record<string, number> = (comp as Record<string, unknown>).our_scores as Record<string, number> || {};
  // 缺省值：如果没有 our_scores，默认给我方每项打满分的 60%（假设健康水平）
  if (Object.keys(ourScores).length === 0) {
    for (const d of TEARDOWN_RUBRIC) {
      ourScores[d.key] = Math.round(d.max_score * 0.6);
    }
  }

  const ourTotal = calculateTotalScore(ourScores).total;
  const theirTotal = calculateTotalScore(theirScores).total;
  const max = calculateTotalScore(theirScores).max;

  const { lead, behind } = computeDimensionGaps(ourScores, theirScores);
  const radar_data = computeRadar(ourScores, theirScores);

  const { top_insights, recommended_actions } = await generateGapInsights(
    ourProduct,
    comp.competitor_brand,
    comp.product_name || "产品",
    comp.price_usd as number | undefined,
    ourScores,
    theirScores
  );

  // 映射 behind dimensions + 战术
  const behind_dimensions: GapReport["behind_dimensions"] = behind.slice(0, 10).map(b => {
    const matchedAction = recommended_actions.find(a => a.action.toLowerCase().includes(b.label.toLowerCase()));
    return {
      ...b,
      suggested_action: matchedAction?.action || "见战术清单",
    };
  });

  const report: GapReport = {
    our_total: ourTotal,
    competitor_total: theirTotal,
    max,
    lead_dimensions: lead.slice(0, 10),
    behind_dimensions,
    radar_data,
    top_insights,
    recommended_actions,
  };

  // 持久化报告
  await supabase.from("competitor_products").update({
    ai_analysis: report as unknown as Record<string, unknown>,
    total_score: theirTotal,
    updated_at: new Date().toISOString(),
  }).eq("id", competitorProductId);

  return report;
}
