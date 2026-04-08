import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const oemSampleStrategySkill: ContentSkill = {
  id: "oem_sample_strategy",
  name: "样品策略制定",
  category: "oem",
  description: "根据买家情况决定样品收费、运费、周期、数量策略",
  icon: "Package",
  color: "amber",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["content_producer"],
  inputs: [
    { key: "buyer_profile", label: "买家情况", type: "textarea", required: true, placeholder: "如: 美国小品牌，年采购约 5 万件，初次接触" },
    { key: "product_complexity", label: "产品复杂度", type: "select", default: "standard", options: [
      { value: "stock", label: "现货样" },
      { value: "standard", label: "标准定制" },
      { value: "complex", label: "复杂定制（特殊面料/工艺）" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const profile = (input.buyer_profile as string) || "";
    const complexity = (input.product_complexity as string) || "standard";

    const systemPrompt = `You are an OEM/ODM sample strategy expert.
You decide sample pricing, shipping, lead time, and quantity based on buyer credibility and product complexity.

Decision framework:
- Established brands with track record: Free samples, factory pays shipping
- Verified small brands: Sample fee refundable on bulk order, buyer pays shipping
- Unknown/cold inquiries: Full sample fee + shipping, no refund
- Complex products: Always charge for development time

Return JSON.`;

    const userPrompt = `Buyer profile: ${profile}
Product complexity: ${complexity}

Recommend a sample strategy.

Return JSON:
{
  "sample_fee_strategy": "free / charged / charged_refundable",
  "fee_amount_usd": 30,
  "shipping_payer": "factory / buyer",
  "shipping_method": "DHL Express / FedEx / EMS",
  "quantity_offered": "1-3 pcs / per color per style",
  "lead_time_days": "7-10 working days",
  "rationale": "为什么这样定价",
  "buyer_message_template": "用这段话告诉买家样品政策（英文）",
  "risk_assessment": {
    "risk_level": "low / medium / high",
    "concerns": ["如果是高风险，列出担忧"]
  }
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2000);

    return {
      skill_id: "oem_sample_strategy",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
