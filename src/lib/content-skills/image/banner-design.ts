import { callLLM } from "../llm";
import { generateImage } from "../../image-service";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

const SIZE_MAP: Record<string, "1:1" | "16:9" | "9:16" | "3:4"> = {
  product_hero: "1:1",
  ad_banner: "16:9",
  ig_post: "1:1",
  story_vertical: "9:16",
  xhs_cover: "3:4",
  wide_banner: "16:9",
  promo_poster: "3:4",
};

export const bannerDesignSkill: ContentSkill = {
  id: "banner_design",
  name: "广告/活动 Banner",
  category: "image",
  description: "AI 生成真实 Banner 图片 — 广告投放/网站首页/社媒配图",
  icon: "Image",
  color: "purple",
  estimated_cost: { text: 0.01, image: 0.02 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "相关商品（可选）", type: "product" },
    { key: "purpose", label: "Banner 用途", type: "select", default: "ad", options: [
      { value: "ad", label: "广告投放 (Facebook/Google)" },
      { value: "website_hero", label: "网站首页 Banner" },
      { value: "campaign", label: "活动促销 Banner" },
      { value: "social", label: "社媒配图" },
    ]},
    { key: "template_id", label: "选择尺寸", type: "select", default: "ad_banner", options: [
      { value: "product_hero", label: "商品主图 (1:1)" },
      { value: "ad_banner", label: "广告横幅 (16:9)" },
      { value: "ig_post", label: "IG 帖子 (1:1)" },
      { value: "story_vertical", label: "Story/Reels (9:16)" },
      { value: "xhs_cover", label: "小红书封面 (3:4)" },
      { value: "wide_banner", label: "活动横幅 (16:9)" },
      { value: "promo_poster", label: "促销海报 (3:4)" },
    ]},
    { key: "extra_info", label: "补充信息（可选）", type: "text", placeholder: "折扣力度、活动时间、slogan 等" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const purpose = (input.purpose as string) || "ad";
    const templateId = (input.template_id as string) || "ad_banner";
    const extra = (input.extra_info as string) || "";
    const size = SIZE_MAP[templateId] || "16:9";

    // Step 1: LLM 生成设计方案 + image prompt
    const design = await callLLM(
      `You are a marketing creative director. Generate copy, color scheme, AND a detailed image generation prompt for a banner.
Return JSON:
{
  "headline": "主标题（简短有力，10字以内）",
  "subheadline": "副标题",
  "cta": "CTA 按钮文案",
  "badge": "角标文案或空",
  "discount": "折扣信息或空",
  "backgroundColor": "CSS 背景",
  "textColor": "hex",
  "accentColor": "hex",
  "brandName": "品牌名",
  "image_prompt": "Detailed English prompt for AI image generation. Describe the banner: scene/product, layout areas for text overlay, color palette, lighting, mood, professional quality. Be specific about composition for ${size} aspect ratio."
}`,
      `Purpose: ${purpose}
Product: ${product?.name || "fashion activewear"}
Category: ${product?.category || "fashion"}
Size: ${templateId} (${size})
${extra ? `Extra: ${extra}` : ""}

Generate professional ${purpose} banner design. The image_prompt must describe a high-quality banner image.`,
      1500
    );

    // Step 2: Gemini 生成真实 Banner
    const imagePrompt = (design as Record<string, unknown>).image_prompt as string
      || `Professional ${purpose} banner for fashion brand, ${product?.name || "activewear"}, clean modern design, ${size} aspect ratio`;

    const imageUrl = await generateImage(imagePrompt, {
      style: purpose === "ad" ? "social_media" : "lifestyle",
      size,
      filename: `banner-${purpose}-${Date.now()}.png`,
    });

    return {
      skill_id: "banner_design",
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
