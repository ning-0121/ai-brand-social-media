import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const socialMediaImageSkill: ContentSkill = {
  id: "social_media_image",
  name: "社媒配图设计",
  category: "image",
  description: "为社媒帖子设计配图（IG/小红书/TikTok），AI 生成文案+配色，选模板导出",
  icon: "Image",
  color: "pink",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 20,
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

    const templateMap: Record<string, string> = {
      instagram: "ig_post",
      tiktok: "story_vertical",
      xiaohongshu: "xhs_cover",
    };

    const output = await callLLM(
      `You are a social media visual designer. Generate compelling copy and color scheme for a ${platform} post image.
Return JSON: { "headline", "subheadline", "cta", "badge", "backgroundColor" (CSS gradient or color), "textColor" (hex), "accentColor" (hex), "brandName" }`,
      `Platform: ${platform}
Theme: ${theme}
Product: ${product?.name || "general"}
Category: ${product?.category || "fashion"}

Match ${platform} aesthetic. Keep headline punchy (under 8 words).`,
      1200
    );

    return {
      skill_id: "social_media_image",
      output: { ...output, template_id: templateMap[platform] || "ig_post", product_image_url: product?.image_url || "" },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
