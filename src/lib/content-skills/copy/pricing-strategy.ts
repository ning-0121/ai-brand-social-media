import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const pricingStrategySkill: ContentSkill = {
  id: "pricing_strategy",
  name: "定价策略专家",
  category: "copy",
  description: "完整定价决策：锚点/组合/弹性/涨价策略/竞品定位，含具体数字公式",
  icon: "CircleDollarSign",
  color: "emerald",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "products", label: "定价商品（可多选）", type: "products", required: true },
    { key: "scenario", label: "定价场景", type: "select", default: "new_product", options: [
      { value: "new_product", label: "新品定价" },
      { value: "price_increase", label: "涨价策略" },
      { value: "bundle_pricing", label: "套装/组合定价" },
      { value: "competitive_response", label: "竞品应对" },
      { value: "full_audit", label: "全线定价审计" },
    ]},
    { key: "gross_margin_target", label: "目标毛利率 %", type: "text", default: "60", placeholder: "如：60" },
    { key: "brand_positioning", label: "品牌定位", type: "select", default: "mid_premium", options: [
      { value: "value", label: "性价比（大众市场）" },
      { value: "mid_premium", label: "中高端（品质之选）" },
      { value: "premium", label: "高端（精品/奢侈）" },
    ]},
    { key: "competitor_price_range", label: "竞品价格区间（可选）", type: "text", placeholder: "如：$35-85" },
    { key: "increase_reason", label: "涨价原因（涨价场景用）", type: "text", placeholder: "如：原材料成本上涨15%" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const products = (input.products as typeof input.product[]) || (input.product ? [input.product] : []);
    if (!products.length) throw new Error("请至少选择一个商品");

    const scenario = (input.scenario as string) || "new_product";
    const marginTarget = parseInt((input.gross_margin_target as string) || "60");
    const positioning = (input.brand_positioning as string) || "mid_premium";
    const competitorRange = (input.competitor_price_range as string) || "";
    const increaseReason = (input.increase_reason as string) || "";

    // Pull historical order data for price elasticity hints
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: orders } = await supabase
      .from("shopify_orders")
      .select("total_price, line_items")
      .gte("created_at", thirtyDaysAgo)
      .limit(200);

    const totalOrders = orders?.length || 0;
    const productSales: Record<string, { units: number; revenue: number }> = {};
    for (const o of orders || []) {
      for (const item of (o.line_items as Array<{ product_id?: string | number; quantity?: number; price?: number }>) || []) {
        const pid = String(item.product_id || "");
        if (!pid) continue;
        if (!productSales[pid]) productSales[pid] = { units: 0, revenue: 0 };
        productSales[pid].units += item.quantity || 0;
        productSales[pid].revenue += (item.price || 0) * (item.quantity || 0);
      }
    }

    const productData = products.map(p => {
      const sales = p?.shopify_product_id ? productSales[String(p.shopify_product_id)] : null;
      return {
        name: p?.name,
        current_price: p?.price,
        category: p?.category,
        sold_30d: sales?.units || 0,
        revenue_30d: sales?.revenue?.toFixed(0) || 0,
        cost_estimate: p?.price ? (p.price * (1 - marginTarget / 100)).toFixed(2) : "未知",
      };
    });

    const output = await callLLM(
      `你是 DTC 品牌定价策略专家，深度理解价格心理学和利润最大化原则。

定价科学框架（研究验证的具体公式）：

【价格心理学工具】
- 魅力定价：$49.99 vs $50.00 → 左位效应，低价区间有效（蜡烛店 +25%）
- 价格锚点：先展示高价（$299 专业版），让目标价（$99 标准版）显得超值
- 诱饵效应：三档定价，中档变成"诱饵"推动消费者选大档
  示例：$3（小）/ $6（中/诱饵）/ $7（大）→ 80% 选大

【套装定价公式】
- 毛利 > 50%：套装折扣最多 10-20%（有空间让利）
- 毛利 ≤ 50%：套装折扣最多 5-10%（边际已薄）
- 套装 AOV 目标：主商品价格的 115-140%（不超过 150% 会产生决策摩擦）
- 最优套装策略：1个核心单品 + 1-2个互补单品（用滞销品搭热销品）

【定价与品牌定位】
- 价值定位（大众）：市场价格区间 -10% 到 +5%
- 中高端定位：市场均价 +20-40%（需要强视觉/内容支撑）
- 高端/精品：市场均价 +80-200%（品牌故事和工艺是溢价来源）
- 时尚品价格弹性低：消费者购买的是情感价值，不只是功能

【涨价策略（科学流程）】
- 提前 1-2 周公告（普通产品）/ 1 个月以上（高频复购）
- 沟通方式：创始人亲笔信格式，解释成本原因（非道歉式）
- 忠实用户福利：可以在涨价前锁价或提前购买
- 预期效果：哈佛研究，有策略涨价 95% 客户留存率
- 每次涨幅：忠实用户可承受 10%；新用户对 5% 以上就敏感
- 涨价信号：成本上涨、市场地位提升、产品升级迭代

【折扣危险区】
- 频繁打折 = 训练消费者等折扣（Adidas/GoPro 的教训）
- 折扣 > 30% = 开始损害品牌感知
- 替代方案：免运费（高感知价值，实际成本低）、赠品、会员积分

【增量营收计算】
- 真实增量 = 测试组销售额 - 对照组销售额
- 表面高 ROAS ≠ 真实盈利（注意蚕食效应）
- 如果捆绑导致核心 SKU 下降 >15%，需要减少套装折扣

返回完整定价建议 JSON。`,
      `定价场景: ${scenario}
品牌定位: ${positioning}
目标毛利率: ${marginTarget}%
${competitorRange ? `竞品价格区间: ${competitorRange}` : ""}
${increaseReason ? `涨价原因: ${increaseReason}` : ""}
近 30 天订单数: ${totalOrders}

商品详情:
${JSON.stringify(productData, null, 2)}

请返回 JSON:
{
  "pricing_summary": "整体定价策略一句话",
  "products": [
    {
      "name": "商品名",
      "current_price": 数字,
      "recommended_price": 数字,
      "price_change_pct": 数字,
      "positioning_tier": "entry | core | hero | premium",
      "psychological_technique": "使用的定价心理学技巧",
      "rationale": "定价理由（含数据）",
      "margin_at_recommended": "推荐价的毛利率%",
      "charm_price_option": "最近的魅力定价（如：$49.99）"
    }
  ],
  "bundle_recommendations": [
    {
      "bundle_name": "套装名称",
      "products_included": ["商品1", "商品2"],
      "individual_total": 数字,
      "bundle_price": 数字,
      "discount_pct": 数字,
      "aov_lift_vs_single": "AOV 提升估算",
      "margin_safe": true或false,
      "rationale": "为什么这个组合有效"
    }
  ],
  "price_increase_plan": {
    "applicable": true或false,
    "recommended_increase_pct": 数字,
    "timing": "建议涨价时机",
    "communication_template": "创始人亲笔信框架（可直接使用的文字框架）",
    "customer_segment_strategy": {
      "loyal_customers": "老客处理方式",
      "new_customers": "新客处理方式"
    },
    "expected_retention_rate": "预期客户留存率"
  },
  "anchor_pricing_strategy": {
    "decoy_option": "是否建议增加诱饵定价档位",
    "anchor_product": "用于锚定的高价商品推荐",
    "implementation": "如何在网站展示价格锚定"
  },
  "competitor_positioning": {
    "price_gap": "与竞品的价差分析",
    "recommendation": "定价调整建议",
    "unique_value_justification": "支撑溢价的品牌/产品独特价值"
  },
  "annual_promo_framework": {
    "max_discount_pct": ${Math.min(30, Math.round((marginTarget - 20) / 2))},
    "recommended_sale_frequency": "每年 X 次重大促销",
    "safe_everyday_price": "建议的日常定价策略（不参与频繁促销）"
  }
}`,
      5000
    );

    return {
      skill_id: "pricing_strategy",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
