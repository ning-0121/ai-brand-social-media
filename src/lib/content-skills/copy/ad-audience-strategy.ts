import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adAudienceStrategySkill: ContentSkill = {
  id: "ad_audience_strategy",
  name: "广告受众策略",
  category: "copy",
  description: "为广告投放制定精准受众定位策略（兴趣/行为/Lookalike/再营销）",
  icon: "Users",
  color: "violet",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["ad_manager"],
  inputs: [
    { key: "product", label: "推广商品", type: "product", required: true },
    { key: "platform", label: "广告平台", type: "select", default: "facebook", options: [
      { value: "facebook", label: "Facebook/Instagram" }, { value: "google", label: "Google" }, { value: "tiktok", label: "TikTok" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const platform = (input.platform as string) || "facebook";

    const output = await callLLM(
      `You are a paid media audience strategist. Generate a comprehensive audience targeting strategy.
Return JSON: { "core_audiences": [{"name","demographics","interests","behaviors","estimated_size"}], "lookalike_strategy": {"source_audience","similarity","rationale"}, "retargeting_segments": [{"segment","window_days","message_angle"}], "exclusions": ["排除人群"], "funnel_structure": {"top_of_funnel","mid_funnel","bottom_funnel"}, "testing_plan": [{"test_name","variable","hypothesis"}], "budget_split_by_audience": [{"audience","percentage"}] }`,
      `Product: ${product.name}, Price: $${product.price || "?"}, Category: ${product.category}
Platform: ${platform}`,
      3000
    );

    return { skill_id: "ad_audience_strategy", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
