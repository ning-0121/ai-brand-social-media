import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const landingPageSkill: ContentSkill = {
  id: "landing_page",
  name: "Landing Page",
  category: "page",
  description: "生成高转化 Landing Page HTML（广告导流、邮件订阅、新品预售等）",
  icon: "Globe",
  color: "green",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 40,
  agents: ["content_producer"],
  inputs: [
    { key: "page_goal", label: "页面目标", type: "select", required: true, default: "purchase", options: [
      { value: "purchase", label: "促成购买" },
      { value: "email_signup", label: "邮件订阅/留资" },
      { value: "presale", label: "新品预售" },
      { value: "brand_story", label: "品牌故事" },
    ]},
    { key: "product", label: "核心商品", type: "product" },
    { key: "headline_idea", label: "主标题灵感（可选）", type: "text", placeholder: "有什么想法可以写这里" },
    { key: "offer", label: "优惠信息（可选）", type: "text", placeholder: "如：首单 9 折、免运费" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const goal = (input.page_goal as string) || "purchase";
    const product = input.product;
    const headline = (input.headline_idea as string) || "";
    const offer = (input.offer as string) || "";

    const goalSections: Record<string, string> = {
      purchase: "Hero with product image, 3 benefit blocks, social proof section (reviews/stats), urgency element, pricing, FAQ, final CTA",
      email_signup: "Hero with compelling hook, 3 value propositions, sample content preview, simple email form, trust badges",
      presale: "Countdown/coming soon hero, product teaser, early bird benefits, waitlist signup, sneak peek gallery",
      brand_story: "Full-width brand hero, origin story, mission/values, team/factory photos placeholder, customer testimonials, follow CTA",
    };

    const output = await callLLM(
      `You are a conversion rate optimization expert and landing page designer. Generate a high-converting Shopify-compatible landing page with ALL inline CSS.

Rules:
- Every section has clear visual hierarchy
- Use contrast, whitespace, and alignment for readability
- Include trust elements (stats, badges, reviews)
- Mobile responsive (max-width, flex-wrap)
- CTA buttons are large, high-contrast, with action verbs
- No JavaScript, no external CSS, all inline styles

Return: { "body_html": "...complete HTML..." }`,
      `Goal: ${goal}
Sections: ${goalSections[goal]}
Product: ${product?.name || "general"}
Description: ${(product?.body_html || "").slice(0, 300)}
${headline ? `Headline idea: ${headline}` : ""}
${offer ? `Offer: ${offer}` : ""}

Generate the full landing page HTML.`,
      4500
    );

    return {
      skill_id: "landing_page",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
