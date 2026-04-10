import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adCreativeGeneratorSkill: ContentSkill = {
  id: "ad_creative_generator",
  name: "广告创意批量生成",
  category: "copy",
  description: "为广告计划批量生成 5 组创意（标题+文案+CTA+图片 prompt），支持 A/B 测试",
  icon: "Sparkles",
  color: "amber",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 30,
  agents: ["ad_manager", "content_producer"],
  inputs: [
    { key: "product", label: "推广商品", type: "product", required: true },
    { key: "platform", label: "广告平台", type: "select", required: true, default: "facebook", options: [
      { value: "facebook", label: "Facebook/Instagram" },
      { value: "google", label: "Google Ads" },
      { value: "tiktok", label: "TikTok" },
    ]},
    { key: "angle", label: "创意角度", type: "select", default: "mixed", options: [
      { value: "mixed", label: "综合（5 种角度各 1 组）" },
      { value: "pain_point", label: "痛点切入" },
      { value: "social_proof", label: "社会证明" },
      { value: "urgency", label: "紧迫感/稀缺性" },
      { value: "benefit", label: "利益驱动" },
      { value: "comparison", label: "对比竞品" },
    ]},
    { key: "offer", label: "优惠信息", type: "text", placeholder: "如：首单 85 折、买二送一" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const platform = (input.platform as string) || "facebook";
    const angle = (input.angle as string) || "mixed";
    const offer = (input.offer as string) || "";

    const output = await callLLM(
      `You are a top-tier ad creative strategist who has generated $100M+ in revenue through ads.

Generate 5 ad creative variations designed for A/B testing. Each variation must have a distinctly different angle/hook — don't just rephrase the same message.

Platform: ${platform}
${platform === "facebook" ? "Facebook/IG ad format: primary text (first 125 chars shown), headline (40 chars), description, CTA button" : ""}
${platform === "google" ? "Google Ads: 3 headlines (30 chars each), 2 descriptions (90 chars each)" : ""}
${platform === "tiktok" ? "TikTok: hook (first 2 seconds), caption, CTA, trending hashtags" : ""}

Return JSON.`,
      `Product: ${product.name}
Price: $${product.price || "?"}
Description: ${(product.body_html || product.description || "").slice(0, 300)}
Category: ${product.category || "fashion"}
Angle: ${angle}
${offer ? `Offer: ${offer}` : ""}

Return JSON:
{
  "platform": "${platform}",
  "creatives": [
    {
      "variation_id": "A/B/C/D/E",
      "angle": "创意角度名称",
      "headline": "标题",
      "primary_text": "主要文案",
      "description": "描述",
      "cta": "CTA 按钮",
      "image_prompt": "配图 AI 生成 prompt（英文，详细）",
      "expected_ctr": "预期点击率范围",
      "rationale": "为什么这个角度有效"
    }
  ],
  "testing_plan": {
    "recommended_budget_per_variation": "$X/天",
    "test_duration_days": 3-7,
    "success_metric": "ROAS > X 或 CTR > X%",
    "scaling_plan": "表现好的创意如何放量"
  }
}`,
      3500
    );

    return {
      skill_id: "ad_creative_generator",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
