import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const abandonedCartSequenceSkill: ContentSkill = {
  id: "abandoned_cart_sequence",
  name: "弃购挽回邮件序列",
  category: "copy",
  description: "生成经研究验证的3封弃购挽回邮件（1-3h / 24h / 72h），可配合 Klaviyo 自动触发",
  icon: "ShoppingBag",
  color: "amber",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 35,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "弃购商品", type: "product" },
    { key: "brand_name", label: "品牌名", type: "text", default: "JOJOFEIFEI" },
    { key: "discount_offer", label: "第3封折扣（可选）", type: "text", placeholder: "如：10% off，留空则不含折扣" },
    { key: "free_shipping_threshold", label: "免运费门槛", type: "text", placeholder: "如：$50，留空则不提" },
    { key: "tone", label: "邮件语气", type: "select", default: "friendly", options: [
      { value: "friendly", label: "友好亲切（推荐）" },
      { value: "urgent", label: "紧迫感强" },
      { value: "luxury", label: "高端品牌语气" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const brand = (input.brand_name as string) || "JOJOFEIFEI";
    const discount = (input.discount_offer as string) || "";
    const freeShipping = (input.free_shipping_threshold as string) || "";
    const tone = (input.tone as string) || "friendly";

    const toneGuide: Record<string, string> = {
      friendly: "像朋友提醒，温暖不pushy，用'我们'而不是'我们的品牌'",
      urgent: "制造适度紧迫感（库存/时间限制），但不要虚假",
      luxury: "克制优雅，暗示产品稀缺性和独特价值，不说'折扣'说'礼遇'",
    };

    const productContext = product
      ? `商品: ${product.name}（$${product.price || "N/A"}）\n描述: ${(product.body_html || "").slice(0, 200)}`
      : "弃购的商品（通用模板）";

    const output = await callLLM(
      `你是 DTC 品牌邮件营销专家，熟悉 Klaviyo 最佳实践。研究表明三封弃购挽回序列可增加 56% 营收。

三封邮件的策略节奏:
1. **邮件1（1-3小时后）**: 友好提醒，没有折扣。目的：找回因意外离开的用户。
   - 语气：轻松、无压力
   - 重点：你遗忘了好东西
   - 不要：给折扣（太早给折扣会训练用户等待）

2. **邮件2（24小时后）**: 加入社会证明 + 消除顾虑。目的：帮犹豫的用户做决定。
   - 语气：略更紧迫，但仍自然
   - 重点：产品好评 + 答疑（退换货政策等）
   - 可以：提及免运费（如配置了阈值）

3. **邮件3（48-72小时后）**: 最后一次机会 + 折扣（如果配置了）。目的：用优惠拿下最后一批。
   - 语气：最终提醒
   - 重点：时间限制 + 价值感
   - 必须：明确 CTA，让这是最后一封

语气风格: ${toneGuide[tone] || toneGuide.friendly}

每封邮件返回完整 HTML（600px 宽，内联 CSS，移动响应式）。

返回 JSON:
{
  "sequence_strategy": "整体策略说明",
  "emails": [
    {
      "send_timing": "1-3小时后",
      "trigger": "abandoned_cart",
      "subject_line": "主题行（含 emoji，50字符内）",
      "preview_text": "预览文本（90字符内）",
      "body_html": "完整 HTML 邮件（内联 CSS，600px，CTA 按钮，品牌 footer）",
      "key_tactic": "这封邮件的核心战术",
      "ab_test_suggestion": "可测试的变体建议"
    },
    { "send_timing": "24小时后", ... },
    { "send_timing": "72小时后", ... }
  ],
  "klaviyo_setup_note": "如何在 Klaviyo 中配置这个流程的简要说明"
}`,
      `品牌: ${brand}
${productContext}
${discount ? `第三封折扣优惠: ${discount}` : "第三封：不含折扣（仅最后提醒）"}
${freeShipping ? `免运费门槛: ${freeShipping}` : ""}
语气: ${tone}

请生成完整的三封弃购挽回邮件序列。`,
      6000
    );

    return {
      skill_id: "abandoned_cart_sequence",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
