import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const productValidatorSkill: ContentSkill = {
  id: "product_validator",
  name: "测款验证框架",
  category: "copy",
  description: "上新前验证市场需求：PMF信号/sell-through目标/英雄品标准/预售策略",
  icon: "FlaskConical",
  color: "teal",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "待测款商品", type: "product", required: true },
    { key: "test_type", label: "测款阶段", type: "select", default: "pre_launch", options: [
      { value: "pre_launch", label: "上新前（市场验证）" },
      { value: "post_launch", label: "已上线（数据诊断）" },
      { value: "hero_check", label: "英雄品判断" },
      { value: "clearance_decision", label: "清仓还是继续？" },
    ]},
    { key: "inventory_qty", label: "库存数量", type: "text", placeholder: "如：200" },
    { key: "days_on_sale", label: "已上架天数（上线后用）", type: "text", placeholder: "如：30" },
    { key: "units_sold", label: "已售件数（上线后用）", type: "text", placeholder: "如：45" },
    { key: "repeat_buyers", label: "复购买家数（可选）", type: "text", placeholder: "如：12" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const testType = (input.test_type as string) || "pre_launch";
    const inventory = parseInt((input.inventory_qty as string) || "0");
    const daysOnSale = parseInt((input.days_on_sale as string) || "0");
    const unitsSold = parseInt((input.units_sold as string) || "0");
    const repeatBuyers = parseInt((input.repeat_buyers as string) || "0");

    const sellThrough = inventory > 0 ? Math.round((unitsSold / inventory) * 100) : 0;
    const dailyVelocity = daysOnSale > 0 ? (unitsSold / daysOnSale).toFixed(2) : "未知";
    const daysToSellOut = unitsSold > 0 && daysOnSale > 0
      ? Math.round((inventory - unitsSold) / (unitsSold / daysOnSale))
      : null;
    const repeatRate = unitsSold > 0 ? Math.round((repeatBuyers / unitsSold) * 100) : 0;

    // Pull store-wide benchmarks for comparison
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: storeOrders } = await supabase
      .from("shopify_orders")
      .select("line_items")
      .gte("created_at", thirtyDaysAgo)
      .limit(300);

    let storeUnits = 0;
    const productUnits: Record<string, number> = {};
    for (const o of storeOrders || []) {
      for (const item of (o.line_items as Array<{ product_id?: string | number; quantity?: number }>) || []) {
        const pid = String(item.product_id || "");
        if (!pid) continue;
        storeUnits += item.quantity || 0;
        productUnits[pid] = (productUnits[pid] || 0) + (item.quantity || 0);
      }
    }
    const productCount = Object.keys(productUnits).length || 1;
    const avgDailyUnitsPerProduct = storeUnits / productCount / 30;

    const output = await callLLM(
      `你是 DTC 时尚品牌产品策略专家，帮助品牌用数据驱动决定哪些款值得加码、哪些要清仓。

你的判断标准（行业研究验证）：

【英雄品 PMF 信号】
- Sell-through > 70% 且持续：健康，可加库存
- 重复购买率 20-30%：英雄品信号
- 重复购买率 > 50%：极强品牌黏性，可扩品类
- Sean Ellis 测试：40%+ 用户"非常失望如果产品消失" = PMF

【库存健康阈值】
- > 70% sell-through：加码
- 50-70%：观察，减少内容投入
- < 50%：危险，启动 discount 或 bundle
- 库存停滞 > 180 天：dead stock，强制清仓（即使亏本也比继续占资金强）
- 理想周转：每年 6-12 次（30-60 天售完）

【测款前验证方法】
- 预售落地页：上线前 2 周测市场需求（无库存风险）
- 小批量首单：100-200 件，验证后再补货
- 社媒A/B测试：同时发不同款式，哪个互动更高就下单
- 内部穿测：5-10 人真实反馈（Rhone/Ministry of Supply 模式）

【定价-市场适配】
- 时尚品价格弹性低（消费者买情感价值）
- 动态定价：需求旺盛时提价 5-10% 可提升 sell-through
- 心理定价：$49.99 vs $50 → 左位效应，低价区间有效

返回完整 JSON 分析报告。`,
      `商品: ${product.name}
价格: $${product.price || "N/A"}
分类: ${product.category || "N/A"}
描述: ${(product.body_html || "").slice(0, 200)}

测款阶段: ${testType}
库存: ${inventory || "未提供"} 件
已上架: ${daysOnSale || "未提供"} 天
已售: ${unitsSold || "未提供"} 件
复购买家: ${repeatBuyers || "未提供"} 人

计算指标:
- Sell-through: ${sellThrough}%
- 日均销速: ${dailyVelocity} 件/天
- 预计售罄天数: ${daysToSellOut !== null ? daysToSellOut + " 天" : "数据不足"}
- 复购率: ${repeatRate}%
- 店铺日均单品销速基准: ${avgDailyUnitsPerProduct.toFixed(2)} 件/天

请返回 JSON:
{
  "verdict": "hero_candidate | healthy | watch | clearance_now | pre_launch_go | pre_launch_wait",
  "verdict_label": "中文结论（一句话）",
  "confidence": "high | medium | low",
  "sell_through_status": {
    "current_pct": ${sellThrough},
    "health": "excellent | healthy | warning | danger",
    "vs_target": "对比行业 >70% 目标的差距"
  },
  "pmf_signals": [
    {"signal": "信号名称", "status": "green | yellow | red", "detail": "具体说明"}
  ],
  "inventory_action": {
    "recommended": "hold | reorder | bundle | discount | clearance",
    "urgency": "immediate | this_week | this_month | no_rush",
    "specific_action": "具体操作建议（折扣多少/如何捆绑）"
  },
  "content_strategy": {
    "investment_level": "加码 | 维持 | 减少 | 停止",
    "rationale": "理由",
    "recommended_formats": ["内容格式建议"]
  },
  "price_recommendation": {
    "current": $${product.price || 0},
    "suggestion": "维持 | 提价 X% | 降价 X% | 捆绑定价",
    "rationale": "理由"
  },
  "30_day_action_plan": [
    {"week": 1, "action": "具体行动"},
    {"week": 2, "action": "具体行动"},
    {"week": 3, "action": "具体行动"},
    {"week": 4, "action": "具体行动"}
  ],
  "hero_potential_score": "1-10 分，附理由"
}`,
      4000
    );

    return {
      skill_id: "product_validator",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
