import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const pricingAnalysisSkill: ContentSkill = {
  id: "pricing_analysis",
  name: "竞品定价分析",
  category: "copy",
  description: "分析竞品价格带，给出定价策略建议（渗透/撇脂/竞争/价值定价）",
  icon: "DollarSign",
  color: "green",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["market_researcher"],
  inputs: [
    { key: "product", label: "你的商品", type: "product", required: true },
    { key: "target_market", label: "目标市场", type: "select", default: "us", options: [
      { value: "us", label: "美国" }, { value: "eu", label: "欧洲" },
      { value: "cn", label: "中国" }, { value: "global", label: "全球" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const market = (input.target_market as string) || "us";

    const { data: competitors } = await supabase
      .from("competitors").select("name, price_range, rating").limit(5);
    const { data: hotProducts } = await supabase
      .from("hot_products").select("name, price_range, sales_volume")
      .eq("category", product.category || "").limit(5);

    const output = await callLLM(
      `You are a pricing strategy expert for e-commerce brands. Analyze competitive pricing and recommend optimal pricing.
Return JSON: { "current_price_assessment", "market_price_range": {"low","mid","high"}, "competitors_analysis": [{"name","price","positioning"}], "recommended_price", "pricing_strategy": "penetration|skimming|competitive|value", "rationale", "price_tiers": [{"tier","price","target_audience"}], "margin_estimate", "promotions_suggestion" }`,
      `Product: ${product.name}, Current price: $${product.price || "?"}, Category: ${product.category}
Market: ${market}
Known competitors: ${JSON.stringify(competitors || []).slice(0, 500)}
Hot products in category: ${JSON.stringify(hotProducts || []).slice(0, 500)}`,
      2500
    );

    return { skill_id: "pricing_analysis", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
