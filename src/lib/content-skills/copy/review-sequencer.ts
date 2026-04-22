import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * review_sequencer — 生成带图评价获取系统
 *
 * 研究验证：
 * - 照片评价比纯文字转化率高 2.3x
 * - Day 2-3 SMS 收获率最高（7%+ vs 2-3% email）
 * - 5 条评价 = +270% 购买意愿
 */
export const reviewSequencerSkill: ContentSkill = {
  id: "review_sequencer",
  name: "评价获取系统",
  category: "copy",
  description: "生成 Day 2-3 带图评价请求 SMS + 邮件 + 激励机制（Loox/Judge.me 模式）",
  icon: "Star",
  color: "yellow",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 25,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "商品（可选，批量留空）", type: "product" },
    { key: "platform_preference", label: "偏好平台", type: "select", default: "loox", options: [
      { value: "loox", label: "Loox（带图评价率最高）" },
      { value: "judgeme", label: "Judge.me（功能全、便宜）" },
      { value: "okendo", label: "Okendo（高端功能多）" },
      { value: "internal", label: "自建，不依赖第三方" },
    ]},
    { key: "incentive_budget", label: "可接受激励", type: "select", default: "small_discount", options: [
      { value: "none", label: "不打折，只求真实反馈" },
      { value: "small_discount", label: "带图留 10% 下次折扣" },
      { value: "free_gift", label: "带图送小样/礼品" },
      { value: "loyalty_points", label: "积分奖励" },
    ]},
    { key: "brand_voice", label: "品牌语气", type: "select", default: "friendly", options: [
      { value: "friendly", label: "朋友式（推荐）" },
      { value: "luxury", label: "高端克制" },
      { value: "playful", label: "活泼" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const platform = (input.platform_preference as string) || "loox";
    const incentive = (input.incentive_budget as string) || "small_discount";
    const voice = (input.brand_voice as string) || "friendly";

    const output = await callLLM(
      `你是 DTC 品牌评价获取专家。研究数据如下：
- 带图评价比纯文字 CVR 高 2.3x
- Day 2-3 SMS 收获率 7%+（vs 邮件 2-3%）
- 5+ 条评价 = +270% 购买意愿
- 收到货后 48-72 小时是兴奋峰值，错过效果大降
- 激励带图的转化率 +150%（vs 不激励）
- 过度激励（满20% off）反而让评价失真

你要生成 4 个触点的评价请求序列：
1. **送达当天 push/SMS**（如果有 app）— 只提醒，不要求评价
2. **Day 2 SMS**（最高收获率）— 请求评价 + 明确激励
3. **Day 5 Email**（错过 SMS 的）— 更长故事感，聚焦带图
4. **Day 14 最后请求** — 最后激励（稍加码）

返回 JSON:
{
  "sequence_strategy": "整体策略一句话",
  "predicted_review_rate": "预计每 100 订单多少条评价",
  "predicted_photo_rate": "带图比例",
  "touchpoints": [
    {
      "order_day": 0,
      "channel": "push | sms | email",
      "send_time_of_day": "最优发送时间",
      "content_type": "arrival_notice | review_request_sms | review_request_email | final_reminder",
      "subject_or_preview": "主题或预览文字（SMS <50字）",
      "full_message": "完整正文",
      "incentive_offered": "此触点的激励",
      "expected_cta_rate": "预期点击率"
    }
  ],
  "platform_setup": {
    "tool": "${platform}",
    "install_steps": ["具体设置步骤"],
    "automation_config": "关键配置（Day 2 SMS 触发条件等）"
  },
  "photo_incentive_rules": {
    "qualifying_photos": "什么样的照片算合格（清晰度/穿着/场景）",
    "reward_delivery": "如何发放奖励（自动 vs 人工审核）",
    "gaming_prevention": "防止刷评价的规则"
  },
  "response_handling": {
    "positive_review_action": "收到 4-5 星如何加码（求转发/UGC）",
    "negative_review_action": "收到 1-2 星怎么私下处理",
    "neutral_review_action": "3 星的补救策略"
  },
  "monthly_kpis": [
    {"metric": "评价率", "target": "> X%"},
    {"metric": "带图评价占比", "target": "> X%"},
    {"metric": "平均星级", "target": "> 4.5"}
  ]
}`,
      `商品: ${product?.name || "（通用模板）"}
${product ? `价格: $${product.price} / 描述: ${(product.body_html || "").slice(0, 150)}` : ""}
平台: ${platform}
激励预算: ${incentive}
品牌语气: ${voice}

请生成完整评价获取序列。每条消息必须是可以直接使用的真实文案，不要占位符。`,
      4500
    );

    return {
      skill_id: "review_sequencer",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
