import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adCopySkill: ContentSkill = {
  id: "ad_copy",
  name: "广告文案",
  category: "copy",
  description: "为 Facebook/Google/TikTok 广告生成多组文案变体（标题+正文+CTA）",
  icon: "Megaphone",
  color: "orange",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["ad_manager"],
  inputs: [
    { key: "product", label: "推广商品", type: "product", required: true },
    { key: "ad_platform", label: "广告平台", type: "select", required: true, default: "facebook", options: [
      { value: "facebook", label: "Facebook/Instagram Ads" },
      { value: "google", label: "Google Ads (搜索+展示)" },
      { value: "tiktok", label: "TikTok Ads" },
    ]},
    { key: "campaign_goal", label: "投放目标", type: "select", default: "conversions", options: [
      { value: "awareness", label: "品牌曝光" },
      { value: "traffic", label: "引流到站" },
      { value: "conversions", label: "促成转化" },
      { value: "retargeting", label: "再营销" },
    ]},
    { key: "offer", label: "优惠信息（可选）", type: "text", placeholder: "如：首单85折、免运费" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const platform = (input.ad_platform as string) || "facebook";
    const goal = (input.campaign_goal as string) || "conversions";
    const offer = (input.offer as string) || "";

    const output = await callLLM(
      `You are a performance marketing expert who writes high-converting ad copy. Generate 3 ad variations for A/B testing.

Platform-specific rules:
- Facebook/IG: Primary text (125 chars shown), headline (40 chars), description (30 chars), CTA button text
- Google Search: 3 headlines (30 chars each), 2 descriptions (90 chars each), display URL path
- Google Display: headline (30 chars), long headline (90 chars), description (90 chars)
- TikTok: hook text (first 2 seconds), full caption, CTA, hashtags

Return JSON: {
  "platform": "...",
  "campaign_goal": "...",
  "ad_variations": [
    {
      "variation_name": "A/B 变体名",
      "primary_text": "主要文案",
      "headline": "标题",
      "description": "描述",
      "cta": "CTA",
      "hook": "开头钩子（TikTok 用）",
      "hashtags": ["#tag"]
    }
  ],
  "targeting_suggestions": ["受众建议 1", "建议 2"],
  "budget_tip": "预算建议"
}`,
      `Product: ${product.name}
Description: ${(product.body_html || product.description || "").slice(0, 300)}
Price: ${product.price || "N/A"}
Platform: ${platform}
Goal: ${goal}
${offer ? `Offer: ${offer}` : ""}

Generate 3 ad variations.`,
      3000
    );

    return {
      skill_id: "ad_copy",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
