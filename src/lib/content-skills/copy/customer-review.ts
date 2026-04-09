import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const customerReviewSkill: ContentSkill = {
  id: "customer_review",
  name: "客户评价文案",
  category: "copy",
  description: "生成真实感的客户评价文案（用于新品上架、社媒引用、网站展示）",
  icon: "Star",
  color: "amber",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "商品", type: "product", required: true },
    { key: "review_count", label: "生成数量", type: "select", default: "5", options: [
      { value: "3", label: "3 条" },
      { value: "5", label: "5 条" },
      { value: "10", label: "10 条" },
    ]},
    { key: "review_style", label: "评价风格", type: "select", default: "mixed", options: [
      { value: "enthusiastic", label: "热情好评" },
      { value: "detailed", label: "详细专业" },
      { value: "casual", label: "随意简短" },
      { value: "mixed", label: "混合风格（更真实）" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const count = parseInt((input.review_count as string) || "5");
    const style = (input.review_style as string) || "mixed";

    const output = await callLLM(
      `You are generating authentic-sounding product reviews. These should feel like real customers wrote them, with natural language, varied lengths, and occasional minor imperfections.

Rules:
- Vary reviewer personas (age, gender, use case)
- Include specific product details that show actual use
- Mix star ratings (mostly 5, some 4, one occasional 3 for realism)
- Different lengths (some 1 sentence, some 3-4 sentences)
- Some mention shipping, packaging, or customer service
- Use first person ("I love...", "My wife bought...")

Return JSON: { "reviews": [{ "name": "reviewer name", "rating": 5, "title": "review title", "body": "review text", "date": "relative date", "verified": true }] }`,
      `Product: ${product.name}
Description: ${(product.body_html || "").slice(0, 300)}
Price: $${product.price || "N/A"}
Count: ${count}
Style: ${style}

Generate ${count} reviews.`,
      2500
    );

    return {
      skill_id: "customer_review",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
