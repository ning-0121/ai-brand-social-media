import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const productDescriptionSkill: ContentSkill = {
  id: "product_description",
  name: "商品描述优化",
  category: "copy",
  description: "为商品重写/优化描述文案（卖点提炼、场景化、多平台适配）",
  icon: "FileText",
  color: "blue",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "target_platform", label: "目标平台", type: "select", default: "shopify", options: [
      { value: "shopify", label: "Shopify 详情" },
      { value: "amazon", label: "Amazon Listing" },
      { value: "xiaohongshu", label: "小红书种草文" },
      { value: "instagram", label: "IG 配文" },
    ]},
    { key: "focus", label: "重点强调", type: "select", default: "benefits", options: [
      { value: "benefits", label: "利益点/痛点解决" },
      { value: "features", label: "功能特性" },
      { value: "story", label: "品牌故事" },
      { value: "lifestyle", label: "生活方式" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const platform = (input.target_platform as string) || "shopify";
    const focus = (input.focus as string) || "benefits";

    const platformRules: Record<string, string> = {
      shopify: "Professional, scannable with bullet points, SEO-friendly, 200-400 words",
      amazon: "Amazon A+ style with bullet points (5 bullets, each starting with CAPS keyword), search term optimized",
      xiaohongshu: "小红书种草风格，口语化，emoji 开头每段，分享体验感，300-500 字中文",
      instagram: "Short and punchy, emoji-rich, 2-3 short paragraphs, CTA at end, 150 words max",
    };

    const output = await callLLM(
      `You are an expert product copywriter. Rewrite the product description for maximum conversion on the target platform.

Return JSON:
{
  "title": "优化后的商品标题",
  "description": "完整的优化描述",
  "bullet_points": ["卖点 1", "卖点 2", "卖点 3", "卖点 4", "卖点 5"],
  "keywords": ["核心关键词"],
  "meta_description": "SEO 描述 (160 chars)",
  "platform_tips": ["平台特定建议"]
}`,
      `Product: ${product.name}
Current description: ${(product.body_html || product.description || "").slice(0, 500)}
Price: $${product.price || "N/A"}
Category: ${product.category || "N/A"}
Platform: ${platform}
Focus: ${focus}
Platform rules: ${platformRules[platform]}

Rewrite for maximum impact.`,
      2500
    );

    return {
      skill_id: "product_description",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
