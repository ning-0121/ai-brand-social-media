import { callLLM } from "../llm";
import { getBrandGuide } from "../../brand-guide";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * customer_service_responder — AI 辅助客服回复
 *
 * 研究：<45 秒首次响应 = 3x 购买意愿
 * 好客服 = 隐藏的销售渠道（10-20% chat-to-convert CVR）
 */
export const customerServiceResponderSkill: ContentSkill = {
  id: "customer_service_responder",
  name: "客服回复生成器",
  category: "copy",
  description: "把客服对话变成销售机会 — 尺码/物流/退货快速响应 + 智能推荐加购",
  icon: "MessageCircle",
  color: "cyan",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 15,
  agents: ["content_producer"],
  inputs: [
    { key: "customer_message", label: "客户的消息（原话）", type: "textarea", required: true, placeholder: "粘贴客户发来的内容" },
    { key: "channel", label: "沟通渠道", type: "select", default: "live_chat", options: [
      { value: "live_chat", label: "网站在线聊天" },
      { value: "whatsapp", label: "WhatsApp" },
      { value: "instagram_dm", label: "Instagram DM" },
      { value: "email", label: "邮件" },
      { value: "sms", label: "SMS" },
    ]},
    { key: "context", label: "其他上下文（可选）", type: "textarea", placeholder: "比如：客户之前买过 X、正在看 Y、购物车有 Z" },
    { key: "tone_preference", label: "回复语气", type: "select", default: "friendly_helpful", options: [
      { value: "friendly_helpful", label: "友好热心（推荐）" },
      { value: "quick_efficient", label: "快速专业" },
      { value: "empathetic", label: "共情耐心（客户不满时）" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const message = (input.customer_message as string) || "";
    const channel = (input.channel as string) || "live_chat";
    const context = (input.context as string) || "";
    const tone = (input.tone_preference as string) || "friendly_helpful";

    const guide = await getBrandGuide();
    const brandContext = guide ? `品牌：${guide.brand_name}
语气：${guide.tone_of_voice || ""}
常用词：${(guide.vocabulary_yes || []).join(", ")}
禁用词：${(guide.vocabulary_no || []).join(", ")}
政策：30 天免费退换 · $50 免运费` : "";

    const channelConstraints: Record<string, string> = {
      live_chat: "对话式，每条 < 80 字，必要时多条发出",
      whatsapp: "可以更长，emoji 适度，主题清晰",
      instagram_dm: "像朋友聊天，emoji 多一些，casual",
      email: "完整段落，正式但有温度，完整签名",
      sms: "精简！< 160 字符，重点信息 + 链接",
    };

    const output = await callLLM(
      `你是顶级客服经理 + 销售大师。把每个客户对话都看成潜在销售机会：
- <45 秒响应 = 3x 购买意愿
- 正面对话 6 次以上 = 250% CVR 提升
- AI 辅助可解决 40-50% 简单问题，复杂的交给人类

**回复铁律**：
1. **先解决问题，再促转化**（不要上来就推销）
2. **具体答案 > 政策模板**（别说"请查看退货页"，直接给答案）
3. **主动超出期待**（如推荐更合适的尺码/搭配）
4. **一个对话最多推一次加购**（过度销售会毁信任）
5. **遇到投诉先道歉 + 立即行动**（不要解释为什么不是你的错）

**典型意图识别**：
- sizing_question → 给具体建议 + 推荐适合的款
- shipping_query → 给实际时间 + 加订推荐
- return_request → 快速同意 + 问根因（帮产品改进）
- complaint → 道歉 + 补救（退款 / 替换 / 补偿）+ 记录
- pre_purchase → 详细解答 + 推荐购买
- upsell_opportunity → 当客户已决定买，推荐相关商品

**渠道约束（${channel}）**: ${channelConstraints[channel]}

返回 JSON:
{
  "detected_intent": "识别到的意图",
  "customer_sentiment": "positive | neutral | concerned | angry",
  "response_priority": "immediate | within_1h | within_24h",
  "primary_response": "直接回给客户的完整回复（符合渠道约束）",
  "backup_responses": ["2 个备选版本（如果客户继续追问可以用）"],
  "upsell_opportunity": {
    "detected": true或false,
    "suggestion": "如果合适，自然推荐什么商品（不强推）",
    "how_to_insert": "在对话哪个环节插入最合适"
  },
  "escalate_to_human": {
    "needed": true或false,
    "reason": "为什么需要人类接手"
  },
  "follow_up_actions": [
    {"action": "记录到客户档案", "data": "记录什么"},
    {"action": "触发什么自动流程"}
  ],
  "internal_note": "给运营/产品团队的备忘（尤其是发现的新问题）"
}`,
      `客户消息:
"""
${message}
"""

渠道: ${channel}
${context ? `上下文: ${context}` : ""}
语气偏好: ${tone}
${brandContext}

请生成专业回复 + 销售机会判断。不要占位符，给完整可用的话术。`,
      3500,
      "fast" // 客服要快
    );

    return {
      skill_id: "customer_service_responder",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
