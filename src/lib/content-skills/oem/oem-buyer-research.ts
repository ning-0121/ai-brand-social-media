import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const oemBuyerResearchSkill: ContentSkill = {
  id: "oem_buyer_research",
  name: "买家尽调摘要",
  category: "oem",
  description: "基于公司名/邮箱/网站，AI 推断买家画像和合作策略",
  icon: "Search",
  color: "indigo",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["market_researcher"],
  inputs: [
    { key: "company_name", label: "公司名", type: "text", required: true },
    { key: "website", label: "网站 URL", type: "text", placeholder: "如有" },
    { key: "country", label: "国家", type: "text" },
    { key: "additional_info", label: "其他信息", type: "textarea", placeholder: "邮件签名、社媒、初次沟通片段等" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const company = (input.company_name as string) || "";
    const website = (input.website as string) || "";
    const country = (input.country as string) || "";
    const additional = (input.additional_info as string) || "";

    const systemPrompt = `You are a B2B buyer intelligence analyst.
Based on limited information about a company, you generate a buyer profile and recommend a sales strategy.

Use your knowledge of:
- International apparel/textile market
- Different buyer types (brand, distributor, importer, retailer)
- Country-specific business norms
- Common buyer red flags and green flags

If you don't have specific knowledge of the company, infer from name, country, and context.
Always note your confidence level.

Return JSON.`;

    const userPrompt = `Research this potential buyer:

Company: ${company}
Website: ${website || "unknown"}
Country: ${country || "unknown"}
Additional info: ${additional || "none"}

Return JSON:
{
  "buyer_profile": {
    "company_type": "brand / distributor / importer / retailer / agent / unknown",
    "estimated_size": "small / medium / large / enterprise",
    "likely_categories": ["他们可能采购的品类"],
    "estimated_volume": "<10k / 10k-100k / 100k-1M / 1M+ pcs/year",
    "decision_speed": "fast / medium / slow",
    "price_sensitivity": "low / medium / high"
  },
  "background_inference": "你对这个公司的推断（基于行业知识）",
  "red_flags": ["警示信号 1", "信号 2"],
  "green_flags": ["利好信号 1", "信号 2"],
  "country_business_notes": "该国家做生意的关键特点",
  "recommended_strategy": {
    "first_response_tone": "回复语气",
    "qualifying_questions": ["要问的问题 1", "问题 2"],
    "sample_strategy": "样品建议",
    "pricing_approach": "报价策略",
    "watch_outs": ["注意事项"]
  },
  "confidence_level": "high / medium / low",
  "confidence_explanation": "为什么这个置信度"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3000);

    return {
      skill_id: "oem_buyer_research",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
