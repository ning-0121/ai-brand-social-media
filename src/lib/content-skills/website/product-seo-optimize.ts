import { callLLM } from "../llm";
import { runPrompt, getActivePrompt } from "../../prompts";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const productSeoOptimizeSkill: ContentSkill = {
  id: "product_seo_optimize",
  name: "SEO 标题描述优化",
  category: "website",
  description: "针对商品生成优化后的 meta title、description、tags — 单次 AI 生成+自评",
  icon: "Search",
  color: "green",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 10,
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
    const qaFeedback = (input.qa_feedback as string) || "";

    // Try DB prompt first (versioned, logged, A/B testable)
    try {
      const dbPrompt = await getActivePrompt("product.seo.optimize");
      if (dbPrompt) {
        const output = await runPrompt("product.seo.optimize", {
          product: {
            ...product,
            body_html_plain: (product.body_html || "").replace(/<[^>]+>/g, " ").slice(0, 300),
            meta_title: product.meta_title || "none",
            meta_description: product.meta_description || "none",
            tags: product.tags || "none",
          },
          keywords_block: keywords ? `Target keywords: ${keywords}` : "",
          qa_feedback_block: qaFeedback ? `Previous QA feedback to fix: ${qaFeedback}` : "",
          competitors_block: competitors.length > 0 ? `Competitor reference: ${JSON.stringify(competitors).slice(0, 200)}` : "",
        }, {
          source: "product_seo_optimize",
          scoreWithSlug: "product.seo.judge",
          scoreContext: { input: { product: product.name, keywords } },
        });
        return {
          skill_id: "product_seo_optimize",
          output,
          generated_at: new Date().toISOString(),
          estimated_cost: { text: 0.01, image: 0 },
        };
      }
    } catch (err) {
      console.warn("DB prompt failed, falling back to hardcoded:", err instanceof Error ? err.message : err);
    }

    // Fallback: hardcoded prompt (used when DB not migrated yet)
    const output = await callLLM(
      `You are a senior Shopify SEO expert. Generate optimized SEO content AND self-score it in one pass.

RULES:
- meta_title: ≤60 chars, lead with primary keyword, brand at end
- meta_description: ≤155 chars, include CTA verb ("Shop", "Discover", "Get")
- tags: 6-10 tags covering primary keyword, category, use-case, long-tail, seasonal
- body_html: keyword-rich but natural, structured with <h2>/<ul>, ≥150 words
- qa_score: honest 0-100. Must be ≥75 to deploy. Deduct for: keyword stuffing, generic copy, >60 char title, >155 char description.

Return JSON only — no markdown.`,
      `Product: ${product.name}
Current meta_title: ${product.meta_title || "none"}
Current meta_description: ${product.meta_description || "none"}
Current description (truncated): ${(product.body_html || "").replace(/<[^>]+>/g, " ").slice(0, 300)}
Current tags: ${product.tags || "none"}
${keywords ? `Target keywords: ${keywords}` : ""}
${qaFeedback ? `Previous QA feedback to fix: ${qaFeedback}` : ""}
${competitors.length > 0 ? `Competitor reference: ${JSON.stringify(competitors).slice(0, 200)}` : ""}

Return:
{
  "meta_title": "...",
  "meta_description": "...",
  "tags": "tag1, tag2, tag3, ...",
  "body_html": "<h2>...</h2><p>...</p>...",
  "improvements": ["what was improved"],
  "qa_score": 85
}`,
      1800
    );

    return {
      skill_id: "product_seo_optimize",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
