import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const inventoryForecastSkill: ContentSkill = {
  id: "inventory_forecast",
  name: "备货预测",
  category: "copy",
  description: "基于销售历史和库存数据，预测补货需求和开发计划",
  icon: "Package",
  color: "amber",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["data_analyst"],
  inputs: [
    { key: "forecast_horizon", label: "预测周期", type: "select", default: "30", options: [
      { value: "14", label: "14 天" }, { value: "30", label: "30 天" },
      { value: "60", label: "60 天" }, { value: "90", label: "90 天" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const horizon = (input.forecast_horizon as string) || "30";

    const { data: products } = await supabase
      .from("products").select("name, stock_quantity, stock, price, category")
      .eq("platform", "shopify");
    const { data: orderItems } = await supabase
      .from("shopify_order_items").select("title, quantity");

    const salesByProduct = new Map<string, number>();
    for (const item of orderItems || []) {
      salesByProduct.set(item.title, (salesByProduct.get(item.title) || 0) + item.quantity);
    }

    const stockStatus = (products || []).map((p) => ({
      name: p.name,
      stock: p.stock_quantity ?? p.stock ?? 0,
      total_sold: salesByProduct.get(p.name) || 0,
      price: p.price,
      category: p.category,
    }));

    const output = await callLLM(
      `You are an inventory planning specialist for e-commerce. Analyze stock levels and sales velocity to forecast replenishment needs.
Return JSON: {
  "overview": "整体库存健康状况",
  "urgent_restock": [{"product","current_stock","daily_velocity","days_until_stockout","recommended_order_qty","urgency"}],
  "healthy_stock": [{"product","current_stock","days_of_supply"}],
  "overstock_risk": [{"product","current_stock","slow_moving_reason","recommendation"}],
  "new_product_suggestions": [{"category","rationale","estimated_demand"}],
  "budget_estimate": {"total_restock_cost","priority_restock_cost"},
  "timeline": [{"week","action","products"}]
}`,
      `Forecast horizon: ${horizon} days
Products inventory: ${JSON.stringify(stockStatus).slice(0, 2000)}`,
      3500
    );

    return { skill_id: "inventory_forecast", output, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
