import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * campaign_page — 轻量促销承接页（老版，只生成页面）。
 *
 * 新工作流请用:
 *   - flash_sale_planner   — 完整活动策划（四阶段/FOMO/定价）
 *   - landing_page         — CRO 结构完整的承接页（上折公式/紧迫感/JSON-LD）
 *
 * 保留本 skill 仅为向后兼容（content-warehouse 仍在引用）。
 */
export const campaignPageSkill: ContentSkill = {
  id: "campaign_page",
  name: "轻量活动页（旧版）",
  category: "page",
  description: "⚠️ 旧版，新项目建议用 flash_sale_planner + landing_page 组合",
  icon: "Megaphone",
  color: "red",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 40,
  agents: ["content_producer"],
  inputs: [
    { key: "campaign_theme", label: "活动主题", type: "text", required: true, placeholder: "如：黑五大促、新品首发、春季上新" },
    { key: "products", label: "活动商品", type: "products" },
    { key: "discount", label: "折扣信息", type: "text", placeholder: "如：全场 8 折、满 200 减 50" },
    { key: "deadline", label: "活动截止", type: "text", placeholder: "如：3 天后、12/31" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const theme = (input.campaign_theme as string) || "";
    const products = input.products || [];
    const discount = (input.discount as string) || "";
    const deadline = (input.deadline as string) || "";

    const productList = products.map((p) => `${p.name} ($${p.price || "?"})`).join(", ");

    const output = await callLLM(
      `You are a conversion-focused landing page designer. Generate Shopify-compatible HTML with ALL inline CSS. Design a high-converting campaign page with urgency elements, product highlights, and strong CTAs. No external CSS, no JavaScript, no <style> tags.

Return: { "body_html": "...HTML..." }`,
      `Campaign: ${theme}
Products: ${productList || "general collection"}
Discount: ${discount || "special offer"}
Deadline: ${deadline || "limited time"}

Create sections: Hero with countdown feel, offer details, featured products grid, trust badges, final CTA.
Return { "body_html": "..." }`,
      4000
    );

    return { skill_id: "campaign_page", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.03, image: 0 } };
  },
};
