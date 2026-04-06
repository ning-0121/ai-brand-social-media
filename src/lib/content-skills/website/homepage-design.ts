import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const homepageDesignSkill: ContentSkill = {
  id: "homepage_design",
  name: "首页装修与文案",
  category: "website",
  description: "为店铺首页生成完整文案：banner、Hero 区、推荐区、活动区",
  icon: "Home",
  color: "purple",
  estimated_cost: { text: 0.03, image: 0.04 },
  estimated_time_seconds: 60,
  agents: ["brand_strategist", "content_producer"],
  inputs: [
    { key: "products", label: "主推商品（最多 5 个）", type: "products", required: true },
    { key: "season", label: "当前季节/主题", type: "select", default: "spring", options: [
      { value: "spring", label: "春季" },
      { value: "summer", label: "夏季" },
      { value: "autumn", label: "秋季" },
      { value: "winter", label: "冬季" },
      { value: "holiday", label: "节日" },
      { value: "newcollection", label: "新品" },
    ]},
    { key: "campaign_theme", label: "营销主题（可选）", type: "text", placeholder: "如：夏日清凉特惠" },
  ],
  async execute(input: SkillInputData, context?: SkillContext): Promise<SkillResult> {
    const products = input.products || [];
    const season = (input.season as string) || "spring";
    const theme = (input.campaign_theme as string) || "";
    const positioning = context?.brand_positioning || "";

    const systemPrompt = `你是顶级电商首页设计文案专家，深谙转化心理学和视觉营销。
你设计的首页有这些特点：
1. Hero 区 5 秒内传达品牌核心价值
2. CTA 强烈但不突兀
3. 推荐商品区有清晰的购买动机
4. 活动区营造紧迫感
5. 文案符合品牌调性

返回 JSON。`;

    const productList = products.map((p) => `- ${p.name} (${p.category || "未分类"})`).join("\n");

    const userPrompt = `为店铺首页生成完整文案：

品牌定位：${positioning || "未设置"}
当前季节：${season}
${theme ? `营销主题：${theme}` : ""}
主推商品：
${productList || "（无）"}

请生成 JSON：
{
  "hero": {
    "headline": "Hero 主标题",
    "subheadline": "副标题",
    "cta_text": "主 CTA 按钮",
    "background_prompt": "Hero 背景图 prompt（用于 AI 生成）"
  },
  "value_propositions": [
    {"icon": "truck", "title": "价值主张1", "description": "描述"},
    {"icon": "shield", "title": "价值主张2", "description": "描述"},
    {"icon": "heart", "title": "价值主张3", "description": "描述"}
  ],
  "featured_section": {
    "title": "精选区标题",
    "subtitle": "副标题",
    "product_descriptions": [{"product_name": "商品名", "tagline": "一句话推荐"}]
  },
  "campaign_banner": {
    "title": "活动标题",
    "subtitle": "活动副标题",
    "cta_text": "活动 CTA",
    "urgency_text": "紧迫感文案（如：仅剩3天）"
  },
  "newsletter_cta": {
    "headline": "邮件订阅标题",
    "description": "订阅理由",
    "incentive": "订阅奖励"
  },
  "footer_tagline": "Footer 品牌标语"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3500);

    return {
      skill_id: "homepage_design",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0.04 },
    };
  },
};
