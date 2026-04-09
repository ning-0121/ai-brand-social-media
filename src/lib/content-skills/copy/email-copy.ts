import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const emailCopySkill: ContentSkill = {
  id: "email_copy",
  name: "邮件文案",
  category: "copy",
  description: "生成营销邮件（欢迎邮件、促销、弃购挽回、新品通知等）",
  icon: "Mail",
  color: "cyan",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["content_producer"],
  inputs: [
    { key: "email_type", label: "邮件类型", type: "select", required: true, default: "promotion", options: [
      { value: "welcome", label: "欢迎新用户" },
      { value: "promotion", label: "促销活动" },
      { value: "abandoned_cart", label: "弃购挽回" },
      { value: "new_arrival", label: "新品通知" },
      { value: "review_request", label: "邀请评价" },
      { value: "win_back", label: "客户召回" },
    ]},
    { key: "product", label: "相关商品（可选）", type: "product" },
    { key: "offer", label: "优惠信息（可选）", type: "text", placeholder: "如：限时 85 折" },
    { key: "brand_name", label: "品牌名", type: "text", default: "JOJOFEIFEI" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const emailType = (input.email_type as string) || "promotion";
    const product = input.product;
    const offer = (input.offer as string) || "";
    const brand = (input.brand_name as string) || "";

    const output = await callLLM(
      `You are an email marketing expert with 10%+ open rates and 3%+ click rates. Generate a complete marketing email.

Return JSON:
{
  "subject_line": "主题行（50 字符内，含 emoji）",
  "preview_text": "预览文本（90 字符内）",
  "body_html": "邮件正文 HTML（内联 CSS，600px 宽，带品牌色、CTA 按钮、footer）",
  "plain_text": "纯文本备用版",
  "send_timing": "建议发送时间",
  "subject_alternatives": ["备选主题行 1", "备选 2"]
}`,
      `Type: ${emailType}
Brand: ${brand}
Product: ${product?.name || "general"}
${offer ? `Offer: ${offer}` : ""}

Rules for ${emailType}:
- welcome: warm, brand introduction, first purchase incentive
- promotion: urgency, value proposition, clear CTA
- abandoned_cart: reminder, product image reference, incentive to complete
- new_arrival: excitement, exclusivity, early access feel
- review_request: gratitude, easy CTA, possibly incentive
- win_back: "we miss you", exclusive comeback offer`,
      3000
    );

    return {
      skill_id: "email_copy",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
