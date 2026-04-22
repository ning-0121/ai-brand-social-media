import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const flashSalePlannerSkill: ContentSkill = {
  id: "flash_sale_planner",
  name: "限时活动策划",
  category: "copy",
  description: "科学策划限时活动：折扣公式/持续时长/紧迫感机制/四阶段执行蓝图，避免促销陷阱",
  icon: "Zap",
  color: "yellow",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "products", label: "活动商品（可多选）", type: "products", required: true },
    { key: "sale_type", label: "活动类型", type: "select", default: "flash_sale", options: [
      { value: "flash_sale", label: "限时闪购（24-72小时）" },
      { value: "holiday_promo", label: "节日大促（黑五/双11等）" },
      { value: "new_launch", label: "新品首发" },
      { value: "clearance", label: "清仓特卖" },
      { value: "vip_early", label: "会员专属早鸟" },
    ]},
    { key: "target_date", label: "活动日期", type: "text", placeholder: "如：2026-05-10" },
    { key: "duration_hours", label: "活动时长（小时）", type: "text", placeholder: "如：48" },
    { key: "max_discount_pct", label: "最大折扣 %", type: "text", placeholder: "如：30（建议不超过30%）" },
    { key: "gross_margin_pct", label: "毛利率 % (用于计算安全折扣)", type: "text", placeholder: "如：60" },
    { key: "goal_revenue", label: "目标营收 $", type: "text", placeholder: "如：5000" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const products = (input.products as typeof input.product[]) || (input.product ? [input.product] : []);
    if (!products.length) throw new Error("请至少选择一个商品");

    const saleType = (input.sale_type as string) || "flash_sale";
    const targetDate = (input.target_date as string) || "";
    const durationHours = parseInt((input.duration_hours as string) || "48");
    const maxDiscount = parseInt((input.max_discount_pct as string) || "30");
    const grossMargin = parseInt((input.gross_margin_pct as string) || "60");
    const goalRevenue = parseInt((input.goal_revenue as string) || "0");

    // Safe discount formula: margin >50% → max 20%, ≤50% → max 10%
    const safeMaxDiscount = grossMargin > 50 ? Math.min(maxDiscount, 20) : Math.min(maxDiscount, 10);

    // Check last 90 days promo frequency to avoid fatigue
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const { count: recentPromoCount } = await supabase
      .from("campaign_calendar")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_date", ninetyDaysAgo)
      .eq("status", "ready");

    const productSummary = products.map(p =>
      `- ${p?.name} ($${p?.price}) [${p?.category || "N/A"}]`
    ).join("\n");

    const output = await callLLM(
      `你是 DTC 品牌促销活动策略专家，深度研究过活动经济学，知道哪些促销方式真正赚钱、哪些只是表面繁荣。

活动策略铁律（研究数据支撑）：

【折扣安全线】
- 行业研究：折扣 > 30% = 开始侵蚀品牌感知（消费者质疑品质）
- 安全折扣公式：毛利 > 50% → 最多 10-20%；毛利 ≤ 50% → 最多 5-10%
- 优于折扣的替代方案：免运费（高感知价值，低实际成本）、赠品、会员早鸟权益

【频率控制（防促销疲劳）】
- 最优促销频率：每年 2-4 次重大活动（Flash Sale）
- 每月都在打折 = 训练消费者等折扣，摧毁正价购买意愿（Adidas/GoPro 的教训）
- 正价期 vs 促销期应为 8:1 以上

【Flash Sale 转化数据】
- Flash Sale 转化率 vs 常规促销：3.5x 更高
- 邮件 Flash Sale 转化率：18.1%（vs 常规邮件 3.8%）
- 最优时长：24-72 小时（过短无法渗透，过长失去紧迫感）
- 提前 2 周 pre-hype：流量积累更充分

【四阶段执行框架】
- PRE-HYPE（T-14 到 T-1）：种子预热、悬念营销、邮件收集
- LAUNCH（T-0）：多渠道 3-6 小时内完成 60% 流量爆发
- SUSTAIN（T+1 到 T+3）：UGC 放大、库存监控、紧迫感续力
- POST（T+7）：复盘 + winback 未转化流量（可回收 40%）

【FOMO 三元素】
- 稀缺：限量数量/限时窗口
- 社会认同：显示"X 人正在查看"/"已售 X 件"
- 锚点：划掉原价 + 展示省了多少钱

【价格增加策略（反过来用于涨价）】
- 提前 1-2 周公告（制造购买紧迫感）
- 创始人亲笔信格式：解释原因（材料/工艺），哈佛研究显示 95% 客户留存
- 忠实用户可以提前锁定当前价格

返回完整活动策划 JSON。`,
      `活动商品:
${productSummary}

活动类型: ${saleType}
活动日期: ${targetDate || "待定"}
活动时长: ${durationHours} 小时
输入最大折扣: ${maxDiscount}%
毛利率: ${grossMargin}%
安全最大折扣（系统计算）: ${safeMaxDiscount}%
目标营收: ${goalRevenue ? "$" + goalRevenue : "未设定"}
近 90 天已执行活动数: ${recentPromoCount || 0}（超过 3 次需注意促销疲劳）

请返回 JSON:
{
  "sale_strategy": {
    "thesis": "本次活动核心策略（一句话）",
    "positioning": "如何包装使其不像普通打折",
    "hero_emotion": "FOMO | exclusivity | savings | urgency | reward",
    "promo_fatigue_risk": "low | medium | high（基于近期活动频率）",
    "safe_discount_recommendation": "${safeMaxDiscount}%（基于毛利率计算）"
  },
  "discount_structure": [
    {
      "product": "商品名",
      "original_price": 数字,
      "discount_pct": 数字,
      "sale_price": 数字,
      "margin_after_discount_pct": 数字,
      "bundle_suggestion": "是否建议做套装（提 AOV）"
    }
  ],
  "alternatives_to_discount": [
    {"alternative": "替代折扣的方案", "perceived_value": "消费者感知价值", "actual_cost": "实际成本估算"}
  ],
  "timeline": {
    "pre_hype": {
      "start_days_before": 14,
      "actions": [
        {"day": "T-14", "channel": "渠道", "action": "具体动作", "copy_hint": "文案方向"}
      ]
    },
    "launch": {
      "date": "${targetDate || "活动日"}",
      "first_6_hours_plan": ["关键时间节点行动"],
      "channels": ["同时触发的渠道"]
    },
    "sustain": {
      "actions": ["T+1 到 T+3 的续力动作"],
      "urgency_escalation": "如何在最后 6 小时升级紧迫感"
    },
    "post": {
      "winback_sequence": "未转化访客的召回方案",
      "debrief_metrics": ["复盘必看的 5 个指标"]
    }
  },
  "fomo_mechanics": [
    {"mechanic": "紧迫感机制", "implementation": "实现方式", "proven_lift": "已验证的效果"}
  ],
  "assets_needed": {
    "emails": 数字,
    "social_posts": 数字,
    "landing_page": true或false,
    "banner": 数字,
    "copy_variants": 数字
  },
  "revenue_projection": {
    "conservative": "保守预测",
    "base_case": "基础预测",
    "optimistic": "乐观预测",
    "key_assumptions": ["关键假设"]
  },
  "risk_flags": ["潜在风险及应对方案"]
}`,
      5000
    );

    return {
      skill_id: "flash_sale_planner",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
