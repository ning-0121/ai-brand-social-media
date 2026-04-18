import { runPrompt } from "../../prompts";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * 广告蓝图 Skill — 调用 expert.ads.master 产出跨平台投放方案
 */
export const adCampaignBlueprintSkill: ContentSkill = {
  id: "ad_campaign_blueprint",
  name: "广告投放蓝图",
  category: "copy",
  description: "由顶级广告投放大师产出跨平台蓝图（受众分层 / 创意矩阵 / 预算分配 / 出价策略 / kill rules）",
  icon: "Target",
  color: "red",
  estimated_cost: { text: 0.08, image: 0 },
  estimated_time_seconds: 30,
  agents: ["ads_master"],
  inputs: [
    { key: "product", label: "核心商品", type: "product", required: true },
    { key: "budget", label: "本次投放预算 (USD)", type: "text", required: true, placeholder: "5000" },
    { key: "duration_days", label: "投放天数", type: "text", default: "14" },
    { key: "goal", label: "投放目标", type: "select", default: "conversion", options: [
      { value: "conversion", label: "拉销量（purchase）" },
      { value: "add_to_cart", label: "拉加购" },
      { value: "awareness", label: "品牌曝光" },
      { value: "app_install", label: "APP 下载" },
      { value: "leads", label: "收集邮箱/留资" },
    ]},
    { key: "prior_roas", label: "历史 ROAS（可选）", type: "text", placeholder: "2.8" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少核心商品");

    // 查近 30 天销量给专家参考
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: orders } = await supabase.from("shopify_orders")
      .select("line_items")
      .gte("created_at", thirtyDaysAgo).limit(500);

    let sold = 0, revenue = 0;
    for (const o of orders || []) {
      const items = (o.line_items as Array<{ product_id?: number | string; quantity?: number; price?: number }>) || [];
      for (const i of items) {
        if (String(i.product_id) === String(product.shopify_product_id)) {
          sold += i.quantity || 0;
          revenue += (i.price || 0) * (i.quantity || 0);
        }
      }
    }

    const vars = {
      product: {
        name: product.name,
        price: product.price || "N/A",
        sold_30d: sold,
        revenue_30d: revenue.toFixed(0),
        shopify_product_id: product.shopify_product_id,
      },
      budget: input.budget || "1000",
      duration_days: input.duration_days || "14",
      goal: input.goal || "conversion",
      prior_roas: input.prior_roas || "N/A (首次投放)",
    };

    const blueprint = await runPrompt("expert.ads.master", vars, {
      source: "ad_campaign_blueprint",
    });

    return {
      skill_id: "ad_campaign_blueprint",
      output: blueprint,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.08, image: 0 },
    };
  },
};
