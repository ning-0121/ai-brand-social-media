import { callLLM } from "../llm";
import { generateImage } from "../../image-service";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

const SIZE_MAP: Record<string, "1:1" | "16:9" | "9:16" | "3:4"> = {
  promo_poster: "3:4",
  wide_banner: "16:9",
  ig_post: "1:1",
  story_vertical: "9:16",
};

export const campaignPosterSkill: ContentSkill = {
  id: "campaign_poster",
  name: "活动海报",
  category: "image",
  description: "为促销活动/新品发布/节日营销生成真实海报 — AI 设计+Gemini 渲染",
  icon: "Megaphone",
  color: "red",
  estimated_cost: { text: 0.01, image: 0.02 },
  estimated_time_seconds: 30,
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
    const size = SIZE_MAP[templateId] || "3:4";

    // Step 1: LLM 生成设计方案 + image prompt
    const design = await callLLM(
      `You are a campaign poster designer. Generate bold promotional copy, color scheme, AND a detailed image generation prompt.
Return JSON:
{
  "headline": "bold headline (max 6 words)",
  "subheadline": "supporting text",
  "cta": "CTA button text",
  "badge": "corner badge (NEW, HOT, etc)",
  "discount": "discount display text",
  "backgroundColor": "CSS bold gradient",
  "textColor": "hex",
  "accentColor": "hex",
  "brandName": "brand name",
  "image_prompt": "Detailed English prompt for AI image generation. Describe a professional campaign poster with: the product/scene, bold typography overlay areas, promotional energy, lighting, composition. Specify colors, mood, and style."
}`,
      `Campaign: ${theme}
Discount: ${discount || "special offer"}
Product: ${product?.name || "fashion collection"}
Template: ${templateId} (${size})

Make it BOLD and URGENT. The image_prompt should describe a visually striking promotional poster.`,
      1500
    );

    // Step 2: Gemini 生成真实海报
    const imagePrompt = (design as Record<string, unknown>).image_prompt as string
      || `Bold campaign poster for ${theme}, ${discount}, fashion brand, high energy, professional design`;

    const imageUrl = await generateImage(imagePrompt, {
      style: "social_media",
      size,
      filename: `poster-${templateId}-${Date.now()}.png`,
    });

    return {
      skill_id: "campaign_poster",
      output: {
        ...design,
        image_url: imageUrl,
        template_id: templateId,
        size,
        product_image_url: product?.image_url || "",
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0.02 },
    };
  },
};
