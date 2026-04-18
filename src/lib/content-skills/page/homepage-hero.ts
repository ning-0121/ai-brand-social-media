import { callLLM } from "../llm";
import { tryRunPrompt } from "../../prompts";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const homepageHeroSkill: ContentSkill = {
  id: "homepage_hero",
  name: "首页 Hero 区",
  category: "page",
  description: "生成网站首页 Hero Section HTML（大标题 + 副标题 + CTA + 背景建议）",
  icon: "Home",
  color: "purple",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["content_producer"],
  inputs: [
    { key: "brand_name", label: "品牌名", type: "text", required: true },
    { key: "brand_positioning", label: "品牌定位/一句话描述", type: "text", placeholder: "如：高端运动女装品牌" },
    { key: "season", label: "当前季节/主题", type: "select", default: "general", options: [
      { value: "general", label: "通用常青" },
      { value: "spring", label: "春季" },
      { value: "summer", label: "夏季" },
      { value: "autumn", label: "秋季" },
      { value: "winter", label: "冬季" },
      { value: "holiday", label: "节日促销" },
      { value: "new_collection", label: "新品系列" },
    ]},
    { key: "products", label: "主推商品（可选）", type: "products" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const brand = (input.brand_name as string) || "";
    const positioning = (input.brand_positioning as string) || "";
    const season = (input.season as string) || "general";
    const products = input.products || [];

    const dbOut = await tryRunPrompt("page.homepage.hero", {
      brand,
      positioning: positioning || "premium fashion",
      season,
      product_names: products.map((p) => p.name).join(", ") || "none",
    }, { source: "homepage_hero" });
    if (dbOut) {
      return {
        skill_id: "homepage_hero",
        output: dbOut,
        generated_at: new Date().toISOString(),
        estimated_cost: { text: 0.02, image: 0 },
      };
    }

    const output = await callLLM(
      `You are a premium e-commerce homepage designer. Generate a Shopify-ready Hero section with inline CSS. The HTML should be visually striking, conversion-focused, and mobile-responsive.

Return JSON: { "body_html": "...complete Hero section HTML with inline CSS..." }

Rules:
- Full-width hero with gradient or solid background
- Large headline (48-64px), centered
- Subtitle (18-24px), max 2 lines
- CTA button with hover-like styling
- If products provided, show 2-3 featured product cards below hero
- All CSS inline, no external resources
- Mobile-friendly (use max-width, flex-wrap)`,
      `Brand: ${brand}
Positioning: ${positioning || "premium fashion"}
Season/Theme: ${season}
Featured products: ${products.map((p) => p.name).join(", ") || "none"}

Generate the Hero section HTML.`,
      3500
    );

    return {
      skill_id: "homepage_hero",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
