/**
 * 市场情报与竞品分析引擎
 * 基于 mcp-business-intelligence + 竞品价格监控
 * 能力：竞品分析、定价策略、市场趋势、成本分析
 */

import { callLLM } from "./content-skills/llm";
import { supabase } from "./supabase";

// ─── 1. 竞品定价分析 ────────────────────────────────────────

export interface CompetitorPricing {
  competitor: string;
  product_type: string;
  price_range: string;
  avg_price: number;
  positioning: string;
}

export async function analyzeCompetitorPricing(competitors: string[]): Promise<{
  our_pricing: { avg: number; range: string; positioning: string };
  competitors: CompetitorPricing[];
  recommendations: string[];
}> {
  // 获取我们的产品价格
  const { data: products } = await supabase
    .from("products").select("name, price, category, compare_at_price")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const prices = (products || []).map(p => p.price).filter(Boolean);
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // AI 分析竞品定价
  const analysis = await callLLM(
    `你是 DTC 品牌定价策略专家。基于品牌信息和竞品名单，分析定价策略。
你非常了解以下运动服饰品牌的定价：Lululemon、Alo Yoga、Gymshark、Fabletics、Outdoor Voices、Vuori、Beyond Yoga。

返回 JSON：
{
  "competitors": [
    { "competitor": "品牌名", "product_type": "运动服饰", "price_range": "$X-$Y", "avg_price": 数字, "positioning": "定位描述" }
  ],
  "recommendations": ["定价建议1", "建议2", "建议3"],
  "pricing_strategy": "整体定价策略建议（1-2句话）"
}`,
    `我们的品牌：JOJOFEIFEI（女性运动服饰）
我们的价格：$${minPrice}-$${maxPrice}，均价 $${avgPrice}
产品类型：Sports Bra ($49), Skort ($49), Leggings ($59), Hoodie ($79), Set ($98)
竞品列表：${competitors.join(", ") || "Alo Yoga, Gymshark, Fabletics"}
请基于你对这些竞品的了解来分析。`,
    1500
  );

  return {
    our_pricing: { avg: avgPrice, range: `$${minPrice}-$${maxPrice}`, positioning: "中端运动时尚" },
    competitors: ((analysis as Record<string, unknown>).competitors as CompetitorPricing[]) || [],
    recommendations: ((analysis as Record<string, unknown>).recommendations as string[]) || [],
  };
}

// ─── 2. 利润率与成本分析 ────────────────────────────────────

export interface ProfitAnalysis {
  product_name: string;
  price: number;
  estimated_cogs: number; // 预估成本
  gross_margin: number; // 毛利率
  ad_budget_room: number; // 可用于广告的预算空间
  recommendation: string;
}

export async function analyzeProfitMargins(): Promise<{
  products: ProfitAnalysis[];
  summary: string;
}> {
  const { data: products } = await supabase
    .from("products").select("name, price, category")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  // AI 基于行业知识估算成本
  const result = await callLLM(
    `你是电商成本分析专家。基于运动服饰行业的标准成本结构，为每个产品估算成本和利润率。

运动服饰的典型成本结构：
- 面料+辅料：售价的 15-25%
- 生产加工：售价的 10-15%
- 运费（中国→美国）：$3-5/件
- 包装：$1-2/件
- Shopify 交易费：2.9% + $0.30
- 平台运营费用：售价的 5-8%

返回 JSON：
{
  "products": [
    { "product_name": "名称", "price": 售价, "estimated_cogs": 预估总成本, "gross_margin": 毛利率百分比, "ad_budget_room": 可用于广告的金额, "recommendation": "一句话建议" }
  ],
  "summary": "整体利润状况总结（1-2句话）"
}`,
    `产品列表：
${(products || []).map(p => `- ${p.name}: $${p.price} (${p.category})`).join("\n")}`,
    2000
  );

  return {
    products: ((result as Record<string, unknown>).products as ProfitAnalysis[]) || [],
    summary: ((result as Record<string, unknown>).summary as string) || "",
  };
}

// ─── 3. 活动策划日历 ────────────────────────────────────────

export interface MarketingEvent {
  date: string;
  event: string;
  relevance: "high" | "medium" | "low";
  campaign_idea: string;
  channels: string[];
  prep_days_needed: number;
}

export async function generateMarketingCalendar(months = 3): Promise<{
  events: MarketingEvent[];
  priority_events: string[];
}> {
  const today = new Date();
  const endDate = new Date(today.getTime() + months * 30 * 86400000);

  const result = await callLLM(
    `你是 DTC 品牌营销策划专家。为女性运动服饰品牌生成未来 ${months} 个月的营销日历。

包含：
1. 国际节日和电商大促（黑五、圣诞、新年、情人节等）
2. 运动相关节日（世界瑜伽日、国际跑步日等）
3. 女性相关节日（妇女节、母亲节等）
4. 季节性机会（换季、开学、夏季运动等）
5. 品牌可以蹭的热点（健身月、新年决心等）

对每个事件评估对运动服饰品牌的相关性（high/medium/low），并给出具体的活动创意。

返回 JSON：
{
  "events": [
    { "date": "YYYY-MM-DD", "event": "事件名", "relevance": "high/medium/low", "campaign_idea": "具体活动创意", "channels": ["instagram","email","ads"], "prep_days_needed": 准备天数 }
  ],
  "priority_events": ["最重要的 3 个事件及原因"]
}`,
    `品牌：JOJOFEIFEI（女性运动服饰，$49-$98）
时间范围：${today.toISOString().split("T")[0]} 到 ${endDate.toISOString().split("T")[0]}
目标市场：美国`,
    3000
  );

  return {
    events: ((result as Record<string, unknown>).events as MarketingEvent[]) || [],
    priority_events: ((result as Record<string, unknown>).priority_events as string[]) || [],
  };
}

// ─── 4. 备货建议 ────────────────────────────────────────────

export async function generateRestockRecommendations(): Promise<{
  recommendations: Array<{ product: string; current_stock: number; recommendation: string; urgency: "high" | "medium" | "low" }>;
  summary: string;
}> {
  const { data: products } = await supabase
    .from("products").select("name, price, stock, category, seo_score")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const result = await callLLM(
    `你是电商供应链专家。分析库存状况，给出备货建议。

规则：
1. 缺货的高价商品 → urgency: high
2. 库存低（<10）的畅销品 → urgency: medium
3. 库存充足的 → urgency: low，可能需要促销清库存
4. 考虑季节性因素（现在是什么季节，什么产品即将进入旺季）

返回 JSON：
{
  "recommendations": [
    { "product": "商品名", "current_stock": 库存数, "recommendation": "具体建议", "urgency": "high/medium/low" }
  ],
  "summary": "整体库存健康度（1-2句话）"
}`,
    `产品库存：
${(products || []).map(p => `- ${p.name}: 库存 ${p.stock}, 价格 $${p.price}, SEO 分 ${p.seo_score}`).join("\n")}
当前日期：${new Date().toISOString().split("T")[0]}`,
    1500
  );

  return {
    recommendations: ((result as Record<string, unknown>).recommendations as Array<{ product: string; current_stock: number; recommendation: string; urgency: "high" | "medium" | "low" }>) || [],
    summary: ((result as Record<string, unknown>).summary as string) || "",
  };
}

// ─── 5. 达人/KOL 合作策略 ──────────────────────────────────

export async function generateInfluencerStrategy(): Promise<{
  strategy: string;
  tiers: Array<{ tier: string; count: number; budget_pct: number; purpose: string; ideal_profile: string }>;
  outreach_templates: Array<{ tier: string; subject: string; message: string }>;
  platforms_priority: string[];
}> {
  const result = await callLLM(
    `你是 DTC 品牌达人营销专家。为运动服饰品牌制定 KOL 合作策略。

考虑因素：
1. 品牌阶段：初创期，需要用最少预算获得最大曝光
2. 产品特点：女性运动服饰，$49-$98，适合穿搭展示
3. 目标人群：25-35 岁注重运动和生活方式的女性
4. 预算有限：优先 nano/micro influencer（性价比高）
5. 平台选择：Instagram > TikTok > YouTube > 小红书

返回 JSON：
{
  "strategy": "整体策略（2-3句话）",
  "tiers": [
    { "tier": "Nano (1K-10K)", "count": 建议数量, "budget_pct": 预算占比, "purpose": "作用", "ideal_profile": "理想画像" }
  ],
  "outreach_templates": [
    { "tier": "Nano", "subject": "邮件标题", "message": "外联话术（200字以内）" }
  ],
  "platforms_priority": ["优先平台排序及原因"]
}`,
    `品牌：JOJOFEIFEI
定位：简约运动时尚，为自信女性而生
价位：$49-$98
当前社媒粉丝：较少
月营销预算：约 $500-$1000`,
    2000
  );

  return result as unknown as {
    strategy: string;
    tiers: Array<{ tier: string; count: number; budget_pct: number; purpose: string; ideal_profile: string }>;
    outreach_templates: Array<{ tier: string; subject: string; message: string }>;
    platforms_priority: string[];
  };
}
