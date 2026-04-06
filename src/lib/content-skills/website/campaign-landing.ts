import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const campaignLandingSkill: ContentSkill = {
  id: "campaign_landing",
  name: "活动落地页与方案",
  category: "website",
  description: "为营销活动生成完整落地页和推广方案",
  icon: "Megaphone",
  color: "red",
  estimated_cost: { text: 0.04, image: 0.04 },
  estimated_time_seconds: 90,
  agents: ["brand_strategist", "content_producer", "ad_manager"],
  inputs: [
    { key: "campaign_theme", label: "活动主题", type: "text", required: true, placeholder: "如：黑五大促、新品首发" },
    { key: "products", label: "活动商品", type: "products", required: true },
    { key: "duration", label: "活动时长", type: "select", default: "7days", options: [
      { value: "24h", label: "24 小时" },
      { value: "3days", label: "3 天" },
      { value: "7days", label: "7 天" },
      { value: "14days", label: "14 天" },
      { value: "30days", label: "30 天" },
    ]},
    { key: "discount", label: "折扣力度（可选）", type: "text", placeholder: "如：8折、买一送一" },
    { key: "goal", label: "活动目标", type: "select", default: "sales", options: [
      { value: "sales", label: "提升销量" },
      { value: "clearance", label: "清仓库存" },
      { value: "new_user", label: "拉新" },
      { value: "brand", label: "品牌曝光" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const theme = (input.campaign_theme as string) || "";
    const products = input.products || [];
    const duration = (input.duration as string) || "7days";
    const discount = (input.discount as string) || "";
    const goal = (input.goal as string) || "sales";

    const systemPrompt = `你是顶级营销活动策划专家，曾操盘多个亿级营销案例。
你的活动策划有这些特点：
1. 主题鲜明，朗朗上口
2. 时间节奏紧凑，制造紧迫感
3. 商品组合有策略（爆款引流 + 利润款）
4. 落地页转化漏斗清晰
5. 推广渠道全覆盖

返回 JSON。`;

    const productList = products.map((p) => `- ${p.name} (价格: ${p.price || "?"})`).join("\n");

    const userPrompt = `为以下营销活动生成完整方案：

活动主题：${theme}
活动商品：
${productList || "（无）"}
活动时长：${duration}
${discount ? `折扣力度：${discount}` : ""}
活动目标：${goal}

请生成 JSON：
{
  "campaign_name": "活动名称（朗朗上口）",
  "campaign_slogan": "活动 slogan",
  "landing_page": {
    "hero_headline": "落地页主标题",
    "hero_subheadline": "副标题",
    "hero_cta": "主 CTA",
    "hero_image_prompt": "Hero 图 prompt",
    "countdown_text": "倒计时文案",
    "rules": ["活动规则1", "活动规则2", "活动规则3"],
    "product_highlights": [{"product_name": "商品", "tagline": "一句话亮点"}],
    "trust_elements": ["信任要素1", "信任要素2"],
    "faq": [{"q": "问题", "a": "答案"}]
  },
  "promotion_plan": {
    "phases": [
      {"phase": "预热期", "duration": "时长", "actions": ["动作1", "动作2"]},
      {"phase": "爆发期", "duration": "时长", "actions": ["动作1", "动作2"]},
      {"phase": "返场期", "duration": "时长", "actions": ["动作1", "动作2"]}
    ],
    "channels": [
      {"channel": "Email", "tactic": "策略"},
      {"channel": "社媒", "tactic": "策略"},
      {"channel": "广告", "tactic": "策略"}
    ]
  },
  "ad_copy": {
    "facebook_ad": "Facebook 广告文案",
    "google_ad": "Google 广告文案",
    "email_subject": "邮件主题"
  },
  "expected_metrics": {
    "estimated_revenue_lift": "预期收入提升",
    "estimated_orders": "预期订单数",
    "key_kpis": ["KPI1", "KPI2"]
  }
}`;

    const output = await callLLM(systemPrompt, userPrompt, 4000);

    return {
      skill_id: "campaign_landing",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0.04 },
    };
  },
};
