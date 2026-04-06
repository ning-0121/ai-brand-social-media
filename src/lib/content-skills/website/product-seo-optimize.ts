import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const productSeoOptimizeSkill: ContentSkill = {
  id: "product_seo_optimize",
  name: "SEO 标题描述优化",
  category: "website",
  description: "针对商品生成优化后的 meta title、description、tags 和 body_html",
  icon: "Search",
  color: "green",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 20,
  agents: ["store_optimizer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "keywords", label: "目标关键词（可选）", type: "text", placeholder: "用逗号分隔" },
  ],
  async execute(input: SkillInputData, context?: SkillContext): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品信息");

    const keywords = (input.keywords as string) || "";
    const competitors = context?.competitors || [];

    const systemPrompt = `你是资深 Shopify SEO 专家，精通 Google 搜索算法和电商 SEO 最佳实践。
你的优化目标：
1. meta_title 控制在 60 字符内，包含主关键词
2. meta_description 控制在 155 字符内，包含 CTA
3. body_html 自然融入关键词，避免堆砌
4. tags 覆盖核心词、长尾词、品类词

返回 JSON 格式。`;

    const userPrompt = `为以下商品做 SEO 优化：

商品名称：${product.name}
当前 meta_title：${product.meta_title || "无"}
当前 meta_description：${product.meta_description || "无"}
当前描述：${(product.body_html || "").slice(0, 500)}
当前 tags：${product.tags || "无"}
${keywords ? `目标关键词：${keywords}` : ""}
${competitors.length > 0 ? `参考竞品：${JSON.stringify(competitors).slice(0, 300)}` : ""}

请生成：
{
  "meta_title": "新的 SEO 标题",
  "meta_description": "新的 SEO 描述",
  "body_html": "优化后的商品描述（HTML 格式）",
  "tags": "标签1, 标签2, 标签3, 标签4, 标签5",
  "improvements": ["改进点1", "改进点2", "改进点3"]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2500);

    return {
      skill_id: "product_seo_optimize",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
