/**
 * AI 推理引擎
 *
 * 从碎片化的输入（产品图/语音/文本/Shopify 数据/竞品URL）
 * 推理出品牌画像的各个维度。所有推理先进 client_inferences 表（未确认），
 * 用户确认后同步到 brand_guides。
 */

import { supabase } from "../supabase";
import { callLLM } from "../content-skills/llm";

export type InferenceDimension =
  | "brand_positioning"
  | "tone_style"
  | "audience_inference"
  | "pricing_tier"
  | "growth_stance"
  | "visual_aesthetic"
  | "product_category"
  | "operational_preferences";

export interface InferenceInput {
  source: "voice_note" | "image_upload" | "shopify_sync" | "text_input" | "competitor_url";
  source_ref?: string;
  content: string; // 文本内容（图片/语音需先转成描述）
  image_urls?: string[];
}

export interface InferenceResult {
  dimension: InferenceDimension;
  inferred_value: Record<string, unknown>;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * 从一张产品图推理品牌信号（视觉调性/价格带/人群）
 */
export async function inferFromProductImage(imageUrl: string, productContext?: string): Promise<InferenceResult[]> {
  // 用 Gemini 或 Claude Vision 分析图像 → 文字描述 → 再推理
  // 简化：直接让 LLM 基于 URL + context 推理（生产可换成 Vision API）
  const result = await callLLM(
    `你是 DTC 品牌策略师。从一张产品图中推理品牌定位的关键信号。

你要推理的 4 个维度：
1. **visual_aesthetic**: 视觉调性（minimalist / luxe / playful / edgy / vintage / clean_modern）
2. **pricing_tier**: 价格带（value < $30 / mid $30-80 / premium $80-200 / luxury $200+）
3. **audience_inference**: 目标人群特征（年龄段、生活方式、情感驱动）
4. **brand_positioning**: 品牌定位（1 句话）

返回 JSON 数组：
[
  {
    "dimension": "visual_aesthetic",
    "inferred_value": {"primary": "clean_modern", "secondary": "minimalist", "descriptors": ["airy", "muted", "editorial"]},
    "confidence": 0.85,
    "reasoning": "为什么这么推（30字以内）"
  },
  ...
]`,
    `产品图片 URL: ${imageUrl}
${productContext ? `上下文: ${productContext}` : ""}

请推理 4 个维度。如果图片无法访问，基于 URL 里的文件名和上下文做保守推理。`,
    2000
  );

  return Array.isArray(result) ? (result as unknown as InferenceResult[]) : [];
}

/**
 * 从语音文本/文字描述推理客户人群 + 品牌调性
 */
export async function inferFromVoiceOrText(text: string): Promise<InferenceResult[]> {
  const result = await callLLM(
    `你是 DTC 品牌策略师。从用户描述里推理品牌信号。

你要推理的 3 个维度：
1. **audience_inference**: 详细人群画像（年龄/收入/生活方式/情感驱动/痛点）
2. **tone_style**: 品牌调性（分析用户的用词：正式/随意/激情/克制；是否有情感色彩；是否具体/抽象）
3. **brand_positioning**: 用一句话总结品牌定位

返回 JSON 数组，每个维度一个对象：
[
  {
    "dimension": "tone_style",
    "inferred_value": {
      "voice": "casual_friendly | authoritative | playful | minimalist",
      "language_signals": ["用户用的关键词1", "关键词2"],
      "vocabulary_suggestions": {"use": ["品牌应该用的词"], "avoid": ["品牌应该避免的词"]}
    },
    "confidence": 0.8,
    "reasoning": "..."
  }
]

用词分析规则：
- 短句/punchy → energetic 调性
- 长句/复杂 → premium/thoughtful
- emoji/casual → playful
- "crush/scale/dominate" → aggressive growth
- "sustainable/mindful" → sustainable positioning`,
    `用户描述:
"""
${text}
"""

请推理 3 个维度。`,
    2000
  );

  return Array.isArray(result) ? (result as unknown as InferenceResult[]) : [];
}

/**
 * 从 Shopify 数据推理运营风格
 */
export async function inferFromShopifyData(shopifyData: {
  product_count: number;
  avg_price?: number;
  price_range?: [number, number];
  discount_pct_current?: number;
  total_orders_30d?: number;
  top_words_in_descriptions?: string[];
  collections?: string[];
}): Promise<InferenceResult[]> {
  const result = await callLLM(
    `你是 DTC 运营专家。从店铺真实数据推理客户的运营风格偏好。

你要推理的 3 个维度：
1. **pricing_tier**: 实际价格带（based on avg_price 和 range）
2. **growth_stance**: 运营风格（aggressive / sustainable / profitability_first）
   - 判断依据：当前折扣深度、SKU 数量、扩品节奏、订单增速
3. **operational_preferences**: 运营偏好推理（对折扣的态度、扩张野心、品牌优先级）

返回 JSON 数组。`,
    `店铺数据:
${JSON.stringify(shopifyData, null, 2)}

推理依据：
- 折扣经常 > 20% → aggressive growth / 频繁打折派
- 折扣 < 10% 或无折扣 → profitability_first / 品牌派
- 产品描述高频词含 "sustainable/ethical/mindful" → 价值观驱动
- 产品描述高频词含 "trending/new/must-have" → 快时尚驱动
- 集合名含 "clearance/sale" → 清仓周期活跃`,
    2000
  );

  return Array.isArray(result) ? (result as unknown as InferenceResult[]) : [];
}

/**
 * 从竞品 URL 推理 — 用户提到的竞品本身就是定位信号
 */
export async function inferFromCompetitorReference(competitorBrands: string[]): Promise<InferenceResult[]> {
  if (!competitorBrands.length) return [];

  const result = await callLLM(
    `你是 DTC 行业专家。用户提到的竞品本身就是强烈的定位信号 — 一个用 Alo Yoga 做标杆的品牌和一个用 SHEIN 做对标的品牌是完全不同的。

分析用户提到的竞品品牌，推理：
1. **brand_positioning**: 品牌想走什么路线（基于竞品平均价位和调性）
2. **pricing_tier**: 推断价格带（竞品的价格带 ±20%）
3. **growth_stance**: 运营风格推断（如果竞品都是高端 → profitability_first；都是快时尚 → aggressive）

返回 JSON 数组。`,
    `用户提到的竞品: ${competitorBrands.join(", ")}

请推理 3 个维度。`,
    1500
  );

  return Array.isArray(result) ? (result as unknown as InferenceResult[]) : [];
}

/**
 * 保存推理结果到 DB（待客户确认）
 */
export async function saveInferences(
  results: InferenceResult[],
  source: InferenceInput["source"],
  source_ref?: string
): Promise<string[]> {
  if (!results.length) return [];

  const rows = results.map(r => ({
    signal_type: r.dimension,
    dimension: r.dimension,
    source,
    source_ref,
    inferred_value: r.inferred_value as unknown as Record<string, unknown>,
    confidence: r.confidence,
  }));

  const { data } = await supabase.from("client_inferences").insert(rows).select("id");
  return (data || []).map(d => d.id as string);
}

/**
 * 客户确认一个推理 → 同步到 brand_guides
 */
export async function confirmInference(
  inferenceId: string,
  userOverride?: Record<string, unknown>
): Promise<void> {
  const { data: inference } = await supabase
    .from("client_inferences")
    .select("*")
    .eq("id", inferenceId)
    .single();

  if (!inference) throw new Error("推理记录不存在");

  const finalValue = userOverride || inference.inferred_value;

  // 标记 confirmed
  await supabase.from("client_inferences").update({
    confirmed: true,
    confirmed_at: new Date().toISOString(),
    user_override: userOverride || null,
  }).eq("id", inferenceId);

  // 同步到 brand_guides（根据维度映射到对应字段）
  await applyInferenceToGuide(inference.dimension, finalValue);
}

/**
 * 根据维度把推理结果同步到 brand_guides 对应字段
 */
async function applyInferenceToGuide(dimension: string, value: Record<string, unknown>) {
  const { upsertBrandGuide } = await import("../brand-guide");

  const updates: Record<string, unknown> = {};

  switch (dimension) {
    case "brand_positioning":
      if (value.one_liner) updates.one_liner = value.one_liner;
      break;
    case "tone_style":
      if (value.voice) updates.tone_of_voice = value.voice;
      if (value.vocabulary_suggestions && typeof value.vocabulary_suggestions === "object") {
        const vs = value.vocabulary_suggestions as { use?: string[]; avoid?: string[] };
        if (vs.use) updates.vocabulary_yes = vs.use;
        if (vs.avoid) updates.vocabulary_no = vs.avoid;
      }
      break;
    case "audience_inference":
      if (value.primary_persona) updates.audience_primary = value.primary_persona;
      if (value.detailed_persona) updates.audience_persona = value.detailed_persona;
      break;
    case "visual_aesthetic":
      // 存为 visual_dna 的补充
      if (value.descriptors && Array.isArray(value.descriptors)) {
        const desc = (value.descriptors as string[]).join(", ");
        updates.visual_dna = `${value.primary || ""} · ${desc}`;
      }
      break;
    case "growth_stance":
    case "operational_preferences":
      // 这两个存在新字段里
      updates[dimension === "growth_stance" ? "operating_philosophy" : "operational_preferences"] = value;
      break;
  }

  if (Object.keys(updates).length > 0) {
    await upsertBrandGuide(updates);
  }
}

/**
 * 计算画像完成度
 */
export async function calculateProfileCompletion(): Promise<{
  percentage: number;
  completed_dimensions: string[];
  missing_dimensions: string[];
  unlocked_features: string[];
}> {
  const { getBrandGuide } = await import("../brand-guide");
  const guide = await getBrandGuide(true);

  const checks = [
    { dim: "brand_basics", ok: !!(guide?.brand_name && guide?.one_liner) },
    { dim: "positioning", ok: !!(guide?.tagline || guide?.mission) },
    { dim: "audience", ok: !!(guide?.audience_primary) },
    { dim: "tone", ok: !!(guide?.tone_of_voice && (guide?.vocabulary_yes?.length || 0) > 0) },
    { dim: "visual", ok: !!(guide?.visual_dna || guide?.primary_color) },
    { dim: "value_props", ok: (guide?.value_props?.length || 0) > 0 },
    { dim: "operating_philosophy", ok: !!(guide as unknown as { operating_philosophy?: unknown })?.operating_philosophy },
    { dim: "operational_preferences", ok: !!(guide as unknown as { operational_preferences?: unknown })?.operational_preferences },
    { dim: "reference_brands", ok: (guide?.reference_brands?.length || 0) > 0 },
    { dim: "differentiators", ok: (guide?.differentiators?.length || 0) > 0 },
  ];

  const completed = checks.filter(c => c.ok).map(c => c.dim);
  const missing = checks.filter(c => !c.ok).map(c => c.dim);
  const percentage = Math.round((completed.length / checks.length) * 100);

  // 功能解锁门槛
  const unlocked: string[] = ["basic_skills"];
  if (percentage >= 40) unlocked.push("weekly_plan_generation");
  if (percentage >= 60) unlocked.push("ad_creative_brief", "landing_page");
  if (percentage >= 80) unlocked.push("auto_executed_workflows");
  if (percentage >= 100) unlocked.push("full_autonomous_mode");

  return { percentage, completed_dimensions: completed, missing_dimensions: missing, unlocked_features: unlocked };
}
