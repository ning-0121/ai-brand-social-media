import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const campaignPosterSkill: ContentSkill = {
  id: "campaign_poster",
  name: "活动海报",
  category: "image",
  description: "为促销活动/新品发布/节日营销生成海报（文案+配色+模板）",
  icon: "Megaphone",
  color: "red",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "campaign_theme", label: "活动主题", type: "text", required: true, placeholder: "如：黑五、双十一、春季上新" },
    { key: "discount", label: "折扣信息", type: "text", placeholder: "如：全场8折、满200减50" },
    { key: "product", label: "主推商品（可选）", type: "product" },
    { key: "template_id", label: "海报尺寸", type: "select", default: "promo_poster", options: [
      { value: "promo_poster", label: "竖版海报 (2:3)" },
      { value: "wide_banner", label: "横幅 (3:1)" },
      { value: "ig_post", label: "正方形 (1:1)" },
      { value: "story_vertical", label: "竖屏全屏 (9:16)" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const theme = (input.campaign_theme as string) || "";
    const discount = (input.discount as string) || "";
    const product = input.product;
    const templateId = (input.template_id as string) || "promo_poster";

    const output = await callLLM(
      `You are a campaign poster designer. Generate exciting promotional copy and bold color scheme.
Return JSON: { "headline", "subheadline", "cta", "badge", "discount", "backgroundColor" (CSS, prefer bold gradients), "textColor" (hex), "accentColor" (hex), "brandName" }`,
      `Campaign: ${theme}
Discount: ${discount || "special offer"}
Product: ${product?.name || "collection"}
Template: ${templateId}

Make it BOLD and URGENT. Use high-contrast colors. Headline max 6 words.`,
      1200
    );

    return {
      skill_id: "campaign_poster",
      output: { ...output, template_id: templateId, product_image_url: product?.image_url || "" },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
