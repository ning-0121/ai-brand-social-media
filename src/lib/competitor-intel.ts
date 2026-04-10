import { callLLM } from "./content-skills/llm";
import { supabase } from "./supabase";

export interface CompetitorReport {
  competitor_name: string;
  seo_tactics: Record<string, unknown>;
  pricing: Record<string, unknown>;
  page_style: Record<string, unknown>;
  promotions: Record<string, unknown>;
  social_strategy: Record<string, unknown>;
  recommendations_for_us: string[];
}

/**
 * Deep analysis of a competitor — AI infers their strategy
 * from name, URL, and any known data we have.
 */
export async function deepCompetitorScan(
  competitorName: string,
  competitorUrl?: string,
  competitorCategory?: string
): Promise<CompetitorReport> {
  // Get our own store data for comparison
  const { data: ourProducts } = await supabase
    .from("products").select("name, price, category, seo_score, meta_title")
    .eq("platform", "shopify").not("shopify_product_id", "is", null).limit(10);

  const { data: existingCompetitor } = await supabase
    .from("competitors").select("*").eq("name", competitorName).maybeSingle();

  const result = await callLLM(
    `You are a competitive intelligence analyst specializing in e-commerce fashion brands.
Analyze the competitor and provide actionable intelligence. Be specific and practical.
Base your analysis on your knowledge of the brand if you know it, or infer from the category.

Return JSON.`,
    `Competitor: ${competitorName}
${competitorUrl ? `URL: ${competitorUrl}` : ""}
Category: ${competitorCategory || "activewear/fashion"}
Known data: ${JSON.stringify(existingCompetitor || {}).slice(0, 500)}

Our products for comparison: ${(ourProducts || []).map(p => `${p.name} $${p.price}`).join(", ")}
Our avg SEO score: ${ourProducts?.length ? Math.round((ourProducts.reduce((s, p) => s + (p.seo_score || 0), 0)) / ourProducts.length) : "unknown"}

Analyze 6 dimensions:

{
  "competitor_name": "${competitorName}",
  "seo_tactics": {
    "title_pattern": "他们的标题写法规律",
    "keyword_strategy": "关键词策略",
    "meta_description_style": "描述风格",
    "our_gap": "我们的SEO差距"
  },
  "pricing": {
    "price_range": "$X-$Y",
    "pricing_strategy": "定价策略类型",
    "discount_frequency": "折扣频率",
    "our_price_position": "我们的价格竞争力"
  },
  "page_style": {
    "detail_page_structure": "详情页结构特点",
    "hero_elements": "首页特色",
    "trust_elements": ["信任元素"],
    "our_gap": "我们页面的差距"
  },
  "promotions": {
    "current_campaigns": ["当前活动"],
    "typical_discount_depth": "典型折扣力度",
    "campaign_frequency": "活动频率"
  },
  "social_strategy": {
    "platforms": ["活跃平台"],
    "posting_frequency": "发帖频率",
    "content_types": ["内容类型"],
    "engagement_tactics": "互动策略"
  },
  "recommendations_for_us": [
    "具体建议1：学习他们的XX并应用到我们的XX",
    "具体建议2：...",
    "具体建议3：...",
    "具体建议4：...",
    "具体建议5：..."
  ]
}`,
    3500
  );

  return result as unknown as CompetitorReport;
}

/**
 * Scan all tracked competitors and generate combined intelligence.
 * Called by weeklyReview to inform next week's strategy.
 */
export async function scanAllCompetitors(): Promise<{
  reports: CompetitorReport[];
  combined_recommendations: string[];
}> {
  const { data: competitors } = await supabase
    .from("competitors").select("name, url, platform")
    .order("monthly_sales", { ascending: false }).limit(3);

  const reports: CompetitorReport[] = [];

  for (const c of competitors || []) {
    try {
      const report = await deepCompetitorScan(c.name, c.url, c.platform);
      reports.push(report);
    } catch (err) {
      console.error(`Competitor scan failed for ${c.name}:`, err);
    }
  }

  // Combine recommendations
  const allRecs = reports.flatMap(r => r.recommendations_for_us || []);

  return { reports, combined_recommendations: allRecs };
}
