/**
 * Skill: marketplace_expansion_scorer
 * 渠道扩张评分矩阵 — Amazon / TikTok Shop / Walmart / 独立站 多渠道就绪度评分
 *
 * Research basis:
 * - Amazon accounts for 38% of US e-commerce; entry fee: referral 8-15% + FBA fees
 * - TikTok Shop average order value: $35-45; commission: 8% of sale; best for viral products
 * - Walmart Marketplace: harder entry (invite-based), but 12% of online shoppers
 * - Multi-channel brands have 190% higher customer retention (Omnisend 2024)
 * - Minimum viable for Amazon FBA: $15+ selling price, 30%+ net margin after fees
 * - TikTok Shop requirement: product must be "watchable" — tells a story in 30s
 * - Wholesale entry: minimum order $5,000+, need UPC codes, need retail-ready packaging
 * - DTC brands should protect 70%+ revenue on owned channels before expanding
 */

import { callLLM } from "@/lib/content-skills/llm";
import type { ContentSkill, SkillInputData, SkillResult } from "@/lib/content-skills/types";

export interface MarketplaceExpansionInput {
  current_channels: string;          // e.g. "Shopify DTC only"
  monthly_revenue: string;           // e.g. "$30,000"
  product_price_range: string;       // e.g. "$45-120"
  product_count: string;             // e.g. "12 SKUs"
  fulfillment_method: string;        // "self_fulfill" | "3pl" | "dropship"
  brand_recognition: string;         // "none" | "small_social_following" | "established"
  product_type: string;              // e.g. "women's linen clothing"
  expansion_priority?: string;       // "revenue_fast" | "brand_building" | "diversify_risk"
}

export async function scoreMarketplaceExpansion(
  input: MarketplaceExpansionInput
): Promise<Record<string, unknown>> {
  const result = await callLLM(
    `你是多渠道电商战略专家，帮助 DTC 品牌评估渠道扩张时机和优先级。

**渠道特征与门槛：**

**Amazon FBA：**
- 推荐门槛：售价 > $25，净利率扣除 FBA 费（15-30%）后 ≥ 20%
- 适合：标准化产品，已有评价体系，非专属设计款
- 风险：价格透明化，竞品仿款，品牌价值稀释
- 适合评分：有强 review 积累、高复购品类（非时尚趋势款）

**TikTok Shop：**
- 推荐门槛：产品能在 30s 内讲清楚价值 + 有视觉冲击力
- 佣金：8%（2024），平台补贴退坡中
- 适合：冲动购买型（价格 < $80），视觉驱动型
- 风险：退货率高（15-25%），品牌感弱化
- 适合评分：服装/美妆/小家电/新奇特产品

**Walmart Marketplace：**
- 推荐门槛：需申请审核（通过率约 30%），需要 2-day shipping 能力
- 佣金：6-20%（品类不同）
- 适合：家居/宠物/健康，价格带 $20-80
- 风险：需求预测难，服务标准严苛

**批发/零售渠道（Wholesale）：**
- 推荐门槛：产品有清晰品牌故事，利润 ≥ 50%（批发价 = 零售价 50%）
- 适合：有独特品类定位，关系型销售
- 风险：账期长（Net 60-90），退货政策宽松

**核心原则：**
- DTC 收入稳定（月 > $30K）后才考虑扩张，否则稀释精力
- TikTok Shop 是最快测试的渠道，但需要内容基础设施
- 先扩张容易赢的渠道，再考虑高竞争渠道

返回严格 JSON：
{
  "expansion_readiness_score": 72,
  "recommended_sequence": ["先做哪个", "再做哪个", "最后考虑"],
  "channels": [
    {
      "name": "TikTok Shop",
      "readiness_score": 85,
      "score_breakdown": {
        "product_fit": 90,
        "fulfillment_readiness": 80,
        "content_infrastructure": 70,
        "financial_viability": 88,
        "brand_risk": 75
      },
      "recommendation": "立即启动 | 6个月后 | 暂缓",
      "rationale": "具体理由（引用品牌数据）",
      "estimated_monthly_revenue_potential": "$3,000-8,000",
      "estimated_setup_cost": "$500-2,000",
      "estimated_time_to_first_sale": "2-4周",
      "action_plan": [
        "Week 1: 注册 TikTok Shop 账号，提交产品审核",
        "Week 2-3: 拍摄 5 条 shoppable 视频",
        "Week 4: 邀请 3 名 micro-creator 发带货视频"
      ],
      "risks": ["...", "..."],
      "monthly_cost_estimate": "$200-500（内容制作）",
      "break_even_timeline": "3个月"
    },
    {
      "name": "Amazon FBA",
      "readiness_score": 55,
      "score_breakdown": {
        "product_fit": 60,
        "fulfillment_readiness": 50,
        "content_infrastructure": 40,
        "financial_viability": 65,
        "brand_risk": 55
      },
      "recommendation": "暂缓（12个月后重评）",
      "rationale": "时尚品牌在 Amazon 面临价格战和仿款风险，建议先建立品牌护城河",
      "estimated_monthly_revenue_potential": "$5,000-20,000（如执行好）",
      "risks": ["价格透明化", "仿款竞争", "FBA 费用侵蚀利润"]
    }
  ],
  "dtc_protection_strategy": "建议 DTC 渠道保持 ≥ 70% 收入，避免平台依赖",
  "next_30_day_actions": [
    "优先动作 1（最高 ROI）",
    "优先动作 2",
    "优先动作 3"
  ],
  "human_approval_required": true,
  "human_decision_points": [
    "渠道扩张决策需 CEO 审批（涉及战略方向）",
    "Amazon 入驻需评估定价策略和渠道冲突",
    "TikTok Shop 启动需内容团队就绪确认"
  ]
}`,
    `品牌信息：
- 当前渠道：${input.current_channels}
- 月收入：${input.monthly_revenue}
- 产品价格带：${input.product_price_range}
- SKU 数量：${input.product_count}
- 履单方式：${input.fulfillment_method}
- 品牌知名度：${input.brand_recognition}
- 产品类型：${input.product_type}
${input.expansion_priority ? `- 扩张优先级：${input.expansion_priority}` : ""}

请输出渠道扩张评分矩阵。`,
    2500
  );

  return result;
}

export const marketplaceExpansionScorerSkill: ContentSkill = {
  id: "marketplace_expansion_scorer",
  name: "渠道扩张评分",
  description: "Amazon / TikTok Shop / Walmart 就绪度评分 + 分步行动计划 + 财务测算",
  category: "campaign",
  icon: "BarChart3",
  color: "orange",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 20,
  agents: ["campaign_planner"],
  inputs: [
    { key: "product_type", label: "产品类型", type: "text", placeholder: "如：亚麻女装" },
    { key: "current_channels", label: "当前销售渠道", type: "text", placeholder: "如：Shopify 独立站" },
    { key: "monthly_revenue", label: "当前月收入", type: "text", placeholder: "$30,000" },
    { key: "product_price_range", label: "产品价格带", type: "text", placeholder: "$45-120" },
    { key: "product_count", label: "SKU 数量", type: "text", placeholder: "12 SKUs" },
    { key: "fulfillment_method", label: "履单方式", type: "select", options: [
      { value: "self_fulfill", label: "自发货" },
      { value: "3pl", label: "第三方仓储（3PL）" },
      { value: "dropship", label: "代发货" },
    ]},
    { key: "brand_recognition", label: "品牌知名度", type: "select", options: [
      { value: "none", label: "几乎无知名度" },
      { value: "small_social_following", label: "有一定社媒粉丝（<50K）" },
      { value: "established", label: "有稳定品牌受众（50K+）" },
    ]},
    { key: "expansion_priority", label: "扩张优先目标", type: "select", options: [
      { value: "revenue_fast", label: "快速增收" },
      { value: "brand_building", label: "品牌建设" },
      { value: "diversify_risk", label: "分散渠道风险" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await scoreMarketplaceExpansion(input as unknown as MarketplaceExpansionInput);
    return {
      skill_id: "marketplace_expansion_scorer",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
