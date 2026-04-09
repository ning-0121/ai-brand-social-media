import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const shopifyDetailPageSkill: ContentSkill = {
  id: "shopify_detail_page",
  name: "Shopify 商品详情页",
  category: "page",
  description: "生成完整的 Shopify 商品详情页 HTML（内联 CSS），可直接推送为 body_html",
  icon: "FileText",
  color: "blue",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 40,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "style", label: "设计风格", type: "select", default: "modern", options: [
      { value: "modern", label: "现代简约" },
      { value: "luxury", label: "高端奢华" },
      { value: "playful", label: "活泼时尚" },
      { value: "minimal", label: "极简" },
      { value: "bold", label: "大胆醒目" },
    ]},
    { key: "sections", label: "包含区块", type: "select", default: "full", options: [
      { value: "full", label: "完整版（Hero+卖点+规格+场景+CTA）" },
      { value: "compact", label: "精简版（卖点+规格+CTA）" },
      { value: "story", label: "故事版（品牌故事+场景+评价）" },
    ]},
  ],
  async execute(input: SkillInputData, context?: SkillContext): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const style = (input.style as string) || "modern";
    const sections = (input.sections as string) || "full";
    const positioning = context?.brand_positioning || "";

    const systemPrompt = `You are a world-class Shopify product page designer. You generate production-ready HTML that goes directly into a Shopify product's body_html field.

CRITICAL RULES:
1. ALL CSS must be INLINE (style="...") — Shopify does not load external stylesheets for body_html
2. Use only standard HTML elements (div, h1-h3, p, table, tr, td, ul, li, img, span)
3. Max-width: 800px, centered, mobile-responsive using simple techniques
4. Use web-safe fonts: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif
5. Colors must be hex codes, not CSS variables
6. NO JavaScript, NO custom CSS classes, NO <style> tags
7. Keep it clean, professional, high-converting
8. Include emoji sparingly for visual interest (especially in bullet points)
9. Build for the style requested: ${style}

Return JSON with one field: { "body_html": "...complete HTML..." }`;

    const sectionGuide: Record<string, string> = {
      full: "Hero header with product name + tagline, 3-5 key features as icon+text grid, specifications table, usage scenario section, strong CTA section",
      compact: "Key features as bullet list, specifications table, CTA",
      story: "Brand story paragraph, lifestyle scenario, social proof/reviews section, CTA",
    };

    const userPrompt = `Generate a Shopify product detail page:

Product: ${product.name}
Current description: ${(product.body_html || product.description || "").slice(0, 800)}
Price: ${product.price || "N/A"}
Category: ${product.category || "N/A"}
Tags: ${product.tags || "N/A"}
${product.image_url ? `Product image: ${product.image_url}` : ""}
${positioning ? `Brand positioning: ${positioning}` : ""}

Design style: ${style}
Sections to include: ${sectionGuide[sections]}

Generate ONLY the body_html content (everything inside <body>), not a full HTML document.
The HTML will be inserted into Shopify's product description area.

Return: { "body_html": "...your HTML here..." }`;

    const output = await callLLM(systemPrompt, userPrompt, 4000);

    return {
      skill_id: "shopify_detail_page",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
