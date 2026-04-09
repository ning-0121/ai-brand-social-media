import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const bannerDesignSkill: ContentSkill = {
  id: "banner_design",
  name: "广告/活动 Banner",
  category: "image",
  description: "AI 生成 Banner 文案和配色方案，选择模板后可导出 PNG",
  icon: "Image",
  color: "purple",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "相关商品（可选）", type: "product" },
    { key: "purpose", label: "Banner 用途", type: "select", default: "ad", options: [
      { value: "ad", label: "广告投放 (Facebook/Google)" },
      { value: "website_hero", label: "网站首页 Banner" },
      { value: "campaign", label: "活动促销 Banner" },
      { value: "social", label: "社媒配图" },
    ]},
    { key: "template_id", label: "选择模板", type: "select", default: "ad_banner", options: [
      { value: "product_hero", label: "商品主图 (1:1)" },
      { value: "ad_banner", label: "广告横幅 (16:9)" },
      { value: "ig_post", label: "IG 帖子 (1:1)" },
      { value: "story_vertical", label: "Story/Reels (9:16)" },
      { value: "xhs_cover", label: "小红书封面 (3:4)" },
      { value: "wide_banner", label: "活动横幅 (3:1)" },
      { value: "promo_poster", label: "促销海报 (2:3)" },
    ]},
    { key: "extra_info", label: "补充信息（可选）", type: "text", placeholder: "折扣力度、活动时间、slogan 等" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const purpose = (input.purpose as string) || "ad";
    const templateId = (input.template_id as string) || "ad_banner";
    const extra = (input.extra_info as string) || "";

    const output = await callLLM(
      `You are a marketing creative director. Generate compelling copy and color scheme for a promotional banner.
Return JSON with these exact fields (all strings):
{
  "headline": "主标题（简短有力，10 字以内）",
  "subheadline": "副标题（补充信息）",
  "cta": "CTA 按钮文案",
  "badge": "角标文案（如 NEW, HOT, 限时）或空",
  "discount": "折扣信息（如 -30%, BUY 1 GET 1）或空",
  "backgroundColor": "CSS 背景（渐变或纯色）",
  "textColor": "文字颜色 hex",
  "accentColor": "强调色 hex",
  "brandName": "品牌名"
}`,
      `Purpose: ${purpose}
Product: ${product?.name || "general"}
Category: ${product?.category || "fashion"}
${extra ? `Extra: ${extra}` : ""}
Template: ${templateId}

Generate copy and colors that match the purpose. Be creative but professional.`,
      1500
    );

    // Add template_id so frontend knows which template to render
    const result = { ...output, template_id: templateId, product_image_url: product?.image_url || "" };

    return {
      skill_id: "banner_design",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
