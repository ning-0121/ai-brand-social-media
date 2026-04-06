import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const promotionStrategySkill: ContentSkill = {
  id: "promotion_strategy",
  name: "卖家活动分析与建议",
  category: "website",
  description: "基于销售数据生成下次活动建议（折扣、商品组合、节奏）",
  icon: "TrendingUp",
  color: "amber",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["data_analyst", "ad_manager"],
  inputs: [
    { key: "goal", label: "目标", type: "select", default: "boost_sales", options: [
      { value: "boost_sales", label: "提升销量" },
      { value: "clear_inventory", label: "清库存" },
      { value: "acquire_users", label: "拉新" },
      { value: "boost_aov", label: "提升客单价" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const goal = (input.goal as string) || "boost_sales";

    // 获取近 30 天数据
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders } = await supabase
      .from("shopify_orders")
      .select("total_price, order_date")
      .gte("order_date", thirtyDaysAgo);

    const { data: orderItems } = await supabase
      .from("shopify_order_items")
      .select("title, quantity, price");

    const { data: products } = await supabase
      .from("products")
      .select("name, price, stock_quantity, category");

    // 计算 KPI
    const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total_price || 0), 0);
    const totalOrders = (orders || []).length;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top sellers
    const byProduct = new Map<string, number>();
    for (const item of orderItems || []) {
      byProduct.set(item.title, (byProduct.get(item.title) || 0) + item.quantity);
    }
    const topSellers = Array.from(byProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // High stock products
    const highStock = (products || [])
      .filter((p) => (p.stock_quantity || 0) > 20)
      .slice(0, 5);

    const systemPrompt = `你是顶级电商促销策略专家，操盘过双十一、黑五等大型活动。
你能从数据中识别：
1. 最适合的活动类型
2. 最佳折扣力度（基于利润和心理学）
3. 商品组合策略
4. 推广节奏

返回 JSON。`;

    const userPrompt = `基于以下店铺数据，生成下次活动建议：

近 30 天数据：
- 总收入：$${totalRevenue.toFixed(2)}
- 订单数：${totalOrders}
- 客单价：$${aov.toFixed(2)}

热销商品 TOP 5：
${topSellers.map((s) => `- ${s[0]}: ${s[1]} 件`).join("\n")}

高库存商品 (>20)：
${highStock.map((p) => `- ${p.name}: 库存 ${p.stock_quantity}`).join("\n")}

活动目标：${goal}

请生成 JSON：
{
  "campaign_type": "活动类型",
  "campaign_name": "活动名称",
  "duration_days": 7,
  "best_timing": "最佳启动时机",
  "discount_strategy": {
    "discount_type": "折扣类型（满减/折扣/买赠/捆绑）",
    "discount_value": "折扣力度",
    "rationale": "选择理由"
  },
  "product_bundles": [
    {"name": "组合名", "products": ["商品1", "商品2"], "rationale": "理由", "expected_aov_lift": "预期客单价提升"}
  ],
  "promotion_schedule": [
    {"day": 1, "action": "动作", "channel": "渠道"},
    {"day": 3, "action": "动作", "channel": "渠道"},
    {"day": 7, "action": "动作", "channel": "渠道"}
  ],
  "expected_results": {
    "estimated_revenue_lift": "预期收入提升 %",
    "estimated_orders": "预期订单数",
    "risks": ["风险1", "风险2"]
  },
  "key_messages": ["核心传播信息1", "信息2", "信息3"]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3500);

    return {
      skill_id: "promotion_strategy",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
