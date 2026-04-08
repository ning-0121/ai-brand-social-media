import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const oemInquiryReplySkill: ContentSkill = {
  id: "oem_inquiry_reply",
  name: "OEM 询盘智能回复",
  category: "oem", // 复用现有 category
  description: "根据客户消息生成专业的 OEM/ODM 询盘回复（含 MOQ、交期、报价区间）",
  icon: "MessageSquare",
  color: "blue",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "buyer_message", label: "客户原始消息", type: "textarea", required: true, placeholder: "粘贴客户的 WhatsApp/邮件内容" },
    { key: "buyer_country", label: "客户国家", type: "text", placeholder: "United States" },
    { key: "buyer_company", label: "客户公司", type: "text", placeholder: "Atlantic Apparel Co." },
    { key: "tone", label: "回复语气", type: "select", default: "professional", options: [
      { value: "professional", label: "专业正式" },
      { value: "warm", label: "热情友好" },
      { value: "concise", label: "简洁直接" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const message = (input.buyer_message as string) || "";
    const country = (input.buyer_country as string) || "Unknown";
    const company = (input.buyer_company as string) || "buyer";
    const tone = (input.tone as string) || "professional";

    const systemPrompt = `You are a senior OEM/ODM sales manager at a Chinese apparel/textile factory.
You have 10+ years of experience handling international B2B inquiries from brands and importers.

Your replies have these characteristics:
1. Acknowledge the buyer's needs specifically (don't generic-reply)
2. Provide concrete numbers when reasonable (MOQ ranges, lead times, sample policy)
3. Ask the right qualifying questions (target market, certifications needed, customization)
4. Build trust with factory credentials (years in business, certifications, capacity)
5. End with clear next step (call, samples, NDA, etc.)
6. Match the tone of the buyer (formal vs casual)
7. Reply in the same language as the buyer's message

Default factory profile (use unless overridden):
- 15 years in business, 200+ workers, 3 production lines
- Certifications: BSCI, OEKO-TEX, GOTS (organic), GRS (recycled)
- Capacity: 50,000 pcs/month
- Standard MOQ: 500 pcs/color/style (negotiable)
- Lead time: 30-45 days for production after sample approval
- Samples: $30-50/pc, refundable on bulk order
- Payment: 30% T/T deposit, 70% before shipment
- Incoterms: FOB Shanghai/Ningbo by default

Return JSON.`;

    const userPrompt = `Buyer: ${company} (${country})
Tone: ${tone}

Buyer message:
"""
${message}
"""

Generate a reply that addresses their specific needs.

Return JSON:
{
  "reply_text": "完整的回复内容（自然流畅，无 placeholder）",
  "language": "detected language code (en/zh/es/fr/etc)",
  "key_points_addressed": ["要点 1", "要点 2"],
  "questions_asked": ["你向客户问的问题 1", "问题 2"],
  "next_step": "建议的下一步",
  "missing_info_to_clarify": ["需要客户补充的信息"],
  "ai_confidence": 0.9,
  "warnings": ["如有 - 例如这里涉及报价承诺，建议人工审核"]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2500);

    return {
      skill_id: "oem_inquiry_reply",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
