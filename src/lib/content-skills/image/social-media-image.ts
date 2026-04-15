import { callLLM } from "../llm";
import { generateImage } from "../../image-service";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

const SIZE_MAP: Record<string, "1:1" | "9:16" | "3:4"> = {
  instagram: "1:1",
  tiktok: "9:16",
  xiaohongshu: "3:4",
};

export const socialMediaImageSkill: ContentSkill = {
  id: "social_media_image",
  name: "社媒配图设计",
  category: "image",
  description: "为社媒帖子生成真实配图 — AI 设计+Gemini 渲染出图",
  icon: "Image",
  color: "pink",
  estimated_cost: { text: 0.01, image: 0.02 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "相关商品", type: "product" },
    { key: "platform", label: "目标平台", type: "platform", required: true, default: "instagram" },
    { key: "post_theme", label: "帖子主题", type: "text", required: true, placeholder: "如：新品上市、限时折扣、穿搭分享" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const platform = (input.platform as string) || "instagram";
    const theme = (input.post_theme as string) || "";
    const size = SIZE_MAP[platform] || "1:1";

    // Step 1: LLM 生成设计方案 + image prompt
    const design = await callLLM(
      `You are a top social media visual designer. Generate copy, color scheme, AND a detailed image generation prompt for a ${platform} post.
Return JSON:
{
  "headline": "punchy headline (under 8 words)",
  "subheadline": "supporting text",
  "cta": "call to action",
  "badge": "corner badge text or empty",
  "backgroundColor": "CSS gradient or color",
  "textColor": "hex",
  "accentColor": "hex",
  "brandName": "brand name",
  "image_prompt": "Detailed English prompt for AI image generation. Describe the scene, lighting, composition, style, colors. Be specific about what should appear in the image. Include the product type and aesthetic."
}`,
      `Platform: ${platform}
Theme: ${theme}
Product: ${product?.name || "fashion activewear"}
Category: ${product?.category || "fashion"}
Product image available: ${product?.image_url ? "yes" : "no"}

Design for ${platform} aesthetic. The image_prompt should describe a professional ${platform} post image that would make people stop scrolling.`,
      1500
    );

    // Step 2: Gemini 生成真实图片
    const imagePrompt = (design as Record<string, unknown>).image_prompt as string
      || `Professional ${platform} post image for ${product?.name || "activewear"}, ${theme}, modern clean aesthetic, vibrant colors`;

    const imageUrl = await generateImage(imagePrompt, {
      style: "social_media",
      size,
      filename: `social-${platform}-${Date.now()}.png`,
    });

    return {
      skill_id: "social_media_image",
      output: {
        ...design,
        image_url: imageUrl,
        platform,
        size,
        product_image_url: product?.image_url || "",
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0.02 },
    };
  },
};
