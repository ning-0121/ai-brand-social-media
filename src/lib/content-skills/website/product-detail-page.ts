import { callLLM } from "../llm";
import { runPrompt, getActivePrompt } from "../../prompts";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const productDetailPageSkill: ContentSkill = {
  id: "product_detail_page",
  name: "商品详情页制作",
  category: "website",
  description: "为商品生成完整的详情页（标题、副标题、卖点、规格、CTA、SEO meta）",
  icon: "FileText",
  color: "blue",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["store_optimizer", "content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "tone", label: "文案语气", type: "select", default: "professional", options: [
      { value: "professional", label: "专业" },
      { value: "casual", label: "轻松" },
      { value: "luxury", label: "高奢" },
      { value: "playful", label: "活泼" },
    ]},
    { key: "target_audience", label: "目标人群（可选）", type: "text", placeholder: "如：25-35 岁注重品质的女性" },
  ],
  async execute(input: SkillInputData, context?: SkillContext): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品信息");

    const tone = (input.tone as string) || "professional";
    const audience = (input.target_audience as string) || "";
    const positioning = context?.brand_positioning || "";

    // Try DB prompt first
    try {
      const dbPrompt = await getActivePrompt("product.detail.page");
      if (dbPrompt) {
        const output = await runPrompt("product.detail.page", {
          product: {
            ...product,
            body_html: product.body_html || product.description || "无",
            price: product.price || "未知",
            category: product.category || "未知",
            meta_title: product.meta_title || "",
            meta_description: product.meta_description || "",
          },
          brand_positioning: positioning,
          tone,
          audience_block: audience ? `目标人群：${audience}` : "",
        }, {
          source: "product_detail_page",
          scoreWithSlug: "product.detail.page.judge",
          scoreContext: { input: { product: product.name, tone, audience } },
        });
        return {
          skill_id: "product_detail_page",
          output,
          generated_at: new Date().toISOString(),
          estimated_cost: { text: 0.02, image: 0 },
        };
      }
    } catch (err) {
      console.warn("DB prompt failed, falling back to hardcoded:", err instanceof Error ? err.message : err);
    }

    const systemPrompt = `你是顶级电商详情页文案专家，擅长为 Shopify、Amazon、独立站撰写高转化率的商品详情页。
你的文案有以下特点：
1. 标题简洁有力，直击痛点
2. 副标题强化价值主张
3. 卖点用 3-5 个 bullet point，每个突出一个价值
4. 详细描述场景化、有故事感
5. SEO meta 包含核心关键词且自然
6. CTA 紧迫且有行动力

请严格按 JSON 格式返回结果。`;

    const userPrompt = `为以下商品生成完整的详情页文案：

商品名称：${product.name}
当前描述：${product.body_html || product.description || "无"}
价格：${product.price || "未知"}
品类：${product.category || "未知"}
当前 meta：${product.meta_title || ""} / ${product.meta_description || ""}
品牌定位：${positioning}
文案语气：${tone}
${audience ? `目标人群：${audience}` : ""}

请生成 JSON 格式：
{
  "title": "商品标题（60字以内）",
  "subtitle": "副标题（强化价值主张）",
  "highlights": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
  "description": "详细描述（场景化故事化，300-500字）",
  "specs": [{"name": "规格项", "value": "规格值"}],
  "cta_primary": "主 CTA 按钮文案",
  "cta_secondary": "次 CTA 按钮文案",
  "meta_title": "SEO 标题（70字符内）",
  "meta_description": "SEO 描述（160字符内）",
  "tags": "标签1, 标签2, 标签3"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3000);

    return {
      skill_id: "product_detail_page",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
