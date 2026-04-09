import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const campaignReviewSkill: ContentSkill = {
  id: "campaign_review",
  name: "活动复盘分析",
  category: "copy",
  description: "基于活动数据生成复盘报告（成功因素、改进点、下次建议）",
  icon: "TrendingUp",
  color: "teal",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["data_analyst"],
  inputs: [
    { key: "campaign_name", label: "活动名称", type: "text", required: true },
    { key: "revenue", label: "活动收入 (USD)", type: "text", required: true },
    { key: "orders", label: "订单数", type: "text", required: true },
    { key: "ad_spend", label: "广告花费 (USD)", type: "text" },
    { key: "target_revenue", label: "目标收入 (USD)", type: "text" },
    { key: "notes", label: "活动备注/观察", type: "textarea", placeholder: "任何主观观察，如：哪些商品卖得最好，遇到什么问题" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const name = (input.campaign_name as string) || "";
    const revenue = (input.revenue as string) || "0";
    const orders = (input.orders as string) || "0";
    const adSpend = (input.ad_spend as string) || "0";
    const target = (input.target_revenue as string) || "";
    const notes = (input.notes as string) || "";

    const output = await callLLM(
      `You are a marketing analytics expert. Generate a comprehensive campaign post-mortem review.
Return JSON: { "summary": "一句话总结", "goal_achievement": {"target","actual","percentage"}, "key_metrics": {"revenue","orders","aov","roas","cpa"}, "what_worked": ["成功因素"], "what_didnt": ["不足之处"], "surprises": ["意外发现"], "customer_insights": "客户洞察", "product_insights": "商品洞察", "recommendations_for_next": ["下次改进建议"], "action_items": [{"action","priority","deadline"}] }`,
      `Campaign: ${name}
Revenue: $${revenue}, Orders: ${orders}, Ad spend: $${adSpend}
${target ? `Target: $${target}` : ""}
${notes ? `Notes: ${notes}` : ""}`,
      2500
    );

    return { skill_id: "campaign_review", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
