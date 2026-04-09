import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adBudgetPlannerSkill: ContentSkill = {
  id: "ad_budget_planner",
  name: "广告预算规划",
  category: "copy",
  description: "基于目标和商品数据，规划广告预算分配和 ROI 预测",
  icon: "DollarSign",
  color: "green",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["ad_manager"],
  inputs: [
    { key: "monthly_budget", label: "月度广告预算 (USD)", type: "text", required: true, placeholder: "如：5000" },
    { key: "platforms", label: "投放平台", type: "text", default: "facebook,google,tiktok" },
    { key: "goal", label: "核心目标", type: "select", default: "roas", options: [
      { value: "roas", label: "最大化 ROAS" }, { value: "traffic", label: "最大化流量" },
      { value: "awareness", label: "品牌曝光" }, { value: "balanced", label: "均衡投放" },
    ]},
    { key: "product", label: "主推商品（可选）", type: "product" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const budget = (input.monthly_budget as string) || "5000";
    const platforms = (input.platforms as string) || "facebook,google,tiktok";
    const goal = (input.goal as string) || "roas";
    const product = input.product;

    const output = await callLLM(
      `You are a performance marketing budget strategist. Generate a detailed budget allocation plan with projected performance.
Return JSON: { "total_budget", "allocation": [{"platform","budget","percentage","rationale","expected_cpa","expected_roas"}], "weekly_schedule": [{"week","focus","budget_split"}], "kpi_targets": {"impressions","clicks","ctr","conversions","cpa","roas"}, "optimization_tips": ["建议"], "risk_assessment": "风险评估", "scaling_plan": "如果表现好，如何扩量" }`,
      `Monthly budget: $${budget}
Platforms: ${platforms}
Goal: ${goal}
Product: ${product?.name || "fashion collection"}, Price: $${product?.price || "50-100"}`,
      3000
    );

    return { skill_id: "ad_budget_planner", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
