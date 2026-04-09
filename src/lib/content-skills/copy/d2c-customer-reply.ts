import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const d2cCustomerReplySkill: ContentSkill = {
  id: "d2c_customer_reply",
  name: "D2C 客服回复",
  category: "copy",
  description: "为 D2C 店铺客户消息生成友好专业的回复（退换货、物流、尺码、咨询、投诉）",
  icon: "MessageSquare",
  color: "cyan",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "customer_message", label: "客户消息", type: "textarea", required: true, placeholder: "粘贴客户的消息内容" },
    { key: "issue_type", label: "问题类型", type: "select", default: "general", options: [
      { value: "general", label: "一般咨询" },
      { value: "sizing", label: "尺码建议" },
      { value: "shipping", label: "物流查询" },
      { value: "return", label: "退换货" },
      { value: "complaint", label: "投诉处理" },
      { value: "product_info", label: "产品咨询" },
    ]},
    { key: "order_info", label: "订单信息（可选）", type: "text", placeholder: "订单号或相关信息" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const message = (input.customer_message as string) || "";
    const issueType = (input.issue_type as string) || "general";
    const orderInfo = (input.order_info as string) || "";

    // Load store policies
    const { data: products } = await supabase
      .from("products").select("name, price, category").eq("platform", "shopify").limit(10);

    const output = await callLLM(
      `You are a friendly, professional customer service agent for an online fashion/apparel store.

Your tone: warm, empathetic, helpful (like a friend who works at the store, not a robot)

Store policies:
- Returns: 30-day return policy, items must be unworn with tags
- Shipping: 3-7 business days domestic, 7-14 international
- Sizing: refer to size chart on product page, we offer free exchanges
- Price matching: we don't price match, but offer seasonal promotions

Rules:
1. Always acknowledge the customer's feeling first
2. Be specific and actionable (don't say "we'll look into it" — say what you'll actually do)
3. If you don't know something, say so honestly and offer to escalate
4. End with a warm closing + offer additional help
5. Keep it concise (3-5 sentences)
6. Reply in the same language as the customer

Return JSON:
{
  "reply_text": "完整回复",
  "language": "detected language",
  "sentiment": "positive/neutral/negative",
  "issue_category": "实际问题分类",
  "requires_escalation": false,
  "escalation_reason": null,
  "suggested_actions": ["建议的后续动作"],
  "ai_confidence": 0.9
}`,
      `Customer message: "${message}"
Issue type hint: ${issueType}
${orderInfo ? `Order info: ${orderInfo}` : ""}
Available products: ${(products || []).map(p => p.name).join(", ")}`,
      2000
    );

    return {
      skill_id: "d2c_customer_reply",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
