import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const productResearchSkill: ContentSkill = {
  id: "product_research",
  name: "选品调研",
  category: "copy",
  description: "基于市场趋势数据，推荐值得开发的品类和款式",
  icon: "Search",
  color: "indigo",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 30,
  agents: ["market_researcher"],
  inputs: [
    { key: "category", label: "目标品类", type: "text", required: true, placeholder: "如：女装、运动服、内衣" },
    { key: "budget_range", label: "开发预算", type: "select", default: "medium", options: [
      { value: "low", label: "低预算 (<$5000)" }, { value: "medium", label: "中等 ($5000-$20000)" },
      { value: "high", label: "高预算 (>$20000)" },
    ]},
    { key: "target_market", label: "目标市场", type: "select", default: "us", options: [
      { value: "us", label: "美国" }, { value: "eu", label: "欧洲" }, { value: "global", label: "全球" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const category = (input.category as string) || "";
    const budget = (input.budget_range as string) || "medium";
    const market = (input.target_market as string) || "us";

    const { data: trends } = await supabase
      .from("hot_products").select("*").eq("trend", "up").order("growth_rate", { ascending: false }).limit(10);

    const output = await callLLM(
      `You are a product research analyst for fashion/apparel e-commerce. Based on market trends, recommend products worth developing.
Return JSON: { "market_overview", "recommended_products": [{"name","category","target_price_range","estimated_demand","why","competition_level","development_priority"}], "avoid_list": ["不建议做的品类及理由"], "sourcing_tips": ["采购建议"], "timeline": "开发到上架预计时间" }`,
      `Target category: ${category}
Budget: ${budget}
Market: ${market}
Current trends: ${JSON.stringify(trends || []).slice(0, 800)}`,
      3000
    );

    return { skill_id: "product_research", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.03, image: 0 } };
  },
};
