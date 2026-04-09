import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const campaignPlannerSkill: ContentSkill = {
  id: "campaign_planner",
  name: "活动方案策划",
  category: "copy",
  description: "基于数据制定完整的营销活动方案（时间线、折扣、商品、渠道、预算）",
  icon: "Calendar",
  color: "red",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 35,
  agents: ["data_analyst", "ad_manager"],
  inputs: [
    { key: "campaign_type", label: "活动类型", type: "select", required: true, default: "seasonal", options: [
      { value: "black_friday", label: "黑五/大促" }, { value: "new_launch", label: "新品首发" },
      { value: "seasonal", label: "季节性活动" }, { value: "clearance", label: "季末清仓" },
      { value: "holiday", label: "节日营销" }, { value: "flash_sale", label: "限时闪购" },
    ]},
    { key: "budget", label: "活动预算 (USD)", type: "text", placeholder: "如：10000" },
    { key: "duration_days", label: "活动天数", type: "select", default: "7", options: [
      { value: "1", label: "1 天" }, { value: "3", label: "3 天" }, { value: "7", label: "7 天" },
      { value: "14", label: "14 天" }, { value: "30", label: "30 天" },
    ]},
    { key: "products", label: "参与商品", type: "products" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const type = (input.campaign_type as string) || "seasonal";
    const budget = (input.budget as string) || "10000";
    const days = (input.duration_days as string) || "7";
    const products = input.products || [];

    const { data: orders } = await supabase
      .from("shopify_orders").select("total_price").order("order_date", { ascending: false }).limit(30);
    const avgOrderValue = orders?.length
      ? orders.reduce((s, o) => s + Number(o.total_price), 0) / orders.length : 0;

    const output = await callLLM(
      `You are a marketing campaign strategist for e-commerce. Generate a complete campaign plan.
Return JSON: {
  "campaign_name", "slogan", "timeline": [{"phase","dates","actions":[]}],
  "discount_strategy": {"type","value","rationale","margin_impact"},
  "product_strategy": {"hero_products":[],"bundle_offers":[],"exclusive_items":[]},
  "channel_plan": [{"channel","budget","tactics":[]}],
  "content_checklist": [{"content_type","deadline","responsible","status"}],
  "kpi_targets": {"revenue","orders","new_customers","aov","roas"},
  "risk_mitigation": ["风险及应对"],
  "post_campaign": ["复盘项"]
}`,
      `Type: ${type}, Budget: $${budget}, Duration: ${days} days
Products: ${products.map(p => `${p.name} ($${p.price})`).join(", ") || "all products"}
Recent AOV: $${avgOrderValue.toFixed(0)}`,
      4000
    );

    return { skill_id: "campaign_planner", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.03, image: 0 } };
  },
};
