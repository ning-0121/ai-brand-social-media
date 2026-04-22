/**
 * Skill: affiliate_tier_designer
 * 联盟分销体系设计 — 佣金结构 / 招募话术 / 激励机制 / 防刷量规则
 *
 * Research basis:
 * - Fashion/lifestyle average affiliate commission: 10-20% of sale
 * - Top affiliates (top 10%) generate 80% of affiliate revenue
 * - Tiered commissions increase affiliate activation 67% vs flat-rate
 * - Cookie window: 30 days is industry standard; 60 days for high-AOV
 * - Fraud prevention: device fingerprinting + last-click attribution minimum
 * - Platform options: ShareASale, Impact, Refersion (Shopify-native), PartnerStack
 * - Signup-to-first-sale conversion: 15-25% for well-designed programs
 * - Bonus threshold sweet spot: ~3x average monthly earnings
 */

import { callLLM } from "@/lib/content-skills/llm";
import type { ContentSkill, SkillInputData, SkillResult } from "@/lib/content-skills/types";

export interface AffiliateTierInput {
  product_margin_pct: string;       // e.g. "65"
  avg_order_value: string;          // e.g. "$65"
  product_category: string;
  current_monthly_revenue?: string; // optional context
  max_commission_budget_pct?: string; // max % of revenue for affiliate costs, default "15"
  affiliate_platform?: string;      // "refersion" | "impact" | "shareasale" | "custom"
}

export async function designAffiliateTiers(
  input: AffiliateTierInput
): Promise<Record<string, unknown>> {
  const margin = parseFloat(input.product_margin_pct) || 65;
  const maxCommPct = parseFloat(input.max_commission_budget_pct || "15");

  const result = await callLLM(
    `你是电商联盟营销专家，为 DTC 品牌设计高激活率的联盟分销体系。

**财务约束（必须遵守）：**
- 产品毛利率：${margin}%
- 最大联盟成本占收入：${maxCommPct}%
- 联盟佣金上限原则：不超过毛利的 35%（留足毛利空间）
- 因此单次佣金率上限 ≈ ${Math.min(margin * 0.35, maxCommPct).toFixed(0)}%

**分层设计原则：**
- Tier 1（新人期 0-3个月）：基础佣金，建立信任
- Tier 2（成长期，月销 > $1,000）：提升佣金 + 专属折扣码
- Tier 3（精英级，月销 > $5,000）：最高佣金 + 月度奖金 + 产品优先供样
- VIP Ambassador（月销 > $15,000）：深度合作，联名产品机会

**行业基准：**
- 时尚/生活方式平均联盟佣金：10-20%
- Cookie 窗口：30-60 天
- 付款周期：净 30 天或净 60 天
- 顶尖联盟伙伴（前 10%）贡献 80% 收入 → 重点维护

返回严格 JSON：
{
  "program_name": "品牌名 Affiliate Program",
  "platform_recommendation": "Refersion（Shopify 原生）| Impact | ShareASale",
  "platform_rationale": "推荐理由",
  "cookie_window_days": 30,
  "payment_schedule": "Net 30",
  "tiers": [
    {
      "tier_name": "Brand Friend",
      "tier_level": 1,
      "entry_requirement": "注册即进入",
      "commission_rate_pct": 12,
      "monthly_sales_threshold": null,
      "perks": ["专属折扣码 FRIEND20", "早期新品试用"],
      "estimated_monthly_payout_per_affiliate": "$50-200"
    },
    {
      "tier_name": "Brand Advocate",
      "tier_level": 2,
      "entry_requirement": "月销 ≥ $1,000",
      "commission_rate_pct": 15,
      "monthly_sales_threshold": 1000,
      "perks": ["更高佣金", "专属折扣码 ADV25", "优先客服"],
      "estimated_monthly_payout_per_affiliate": "$150-600"
    }
  ],
  "bonus_structure": {
    "quarterly_bonus_threshold": "$X cumulative sales",
    "quarterly_bonus_amount": "$X bonus",
    "annual_top_10_prize": "旅游/产品/现金奖励"
  },
  "recruitment_pitch": {
    "email_subject": "Join [Brand] Affiliate Program — Earn up to XX% Commission",
    "email_body": "自然对话风格的招募邮件（英文）",
    "landing_page_headline": "Earn money sharing what you love",
    "key_selling_points": ["...", "...", "..."]
  },
  "fraud_prevention_rules": [
    "禁止自我购买（设备指纹检测）",
    "折扣码不可叠加使用",
    "退款订单不计佣金",
    "首次购买才触发佣金（防止现有客户切换归因）"
  ],
  "estimated_program_roi": {
    "monthly_affiliate_revenue_target": "$X,XXX",
    "total_commission_cost": "$X,XXX",
    "net_margin_after_affiliate": "XX%"
  },
  "human_approval_required": true,
  "human_decision_points": [
    "最终佣金率需财务确认",
    "VIP Ambassador 合同条款需法律审核",
    "平台选择需评估集成成本"
  ]
}`,
    `品牌信息：
- 产品品类：${input.product_category}
- 毛利率：${input.product_margin_pct}%
- 平均客单价：${input.avg_order_value}
- 最大联盟成本预算：${input.max_commission_budget_pct || "15"}% of revenue
${input.current_monthly_revenue ? `- 当前月收入：${input.current_monthly_revenue}` : ""}
${input.affiliate_platform ? `- 偏好平台：${input.affiliate_platform}` : ""}

请设计完整联盟分销体系。`,
    2500
  );

  return result;
}

export const affiliateTierDesignerSkill: ContentSkill = {
  id: "affiliate_tier_designer",
  name: "联盟分销体系设计",
  description: "分层佣金结构 + 招募话术 + 激励机制 + 防刷量规则 + ROI 预测",
  category: "campaign",
  icon: "Network",
  color: "emerald",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 20,
  agents: ["campaign_planner"],
  inputs: [
    { key: "product_category", label: "产品品类", type: "text", placeholder: "如：女装/家居" },
    { key: "product_margin_pct", label: "产品毛利率 (%)", type: "text", placeholder: "65" },
    { key: "avg_order_value", label: "平均客单价", type: "text", placeholder: "$65" },
    { key: "current_monthly_revenue", label: "当前月收入（选填）", type: "text", placeholder: "$50,000" },
    { key: "max_commission_budget_pct", label: "最大联盟成本占比 (%)", type: "text", placeholder: "15" },
    { key: "affiliate_platform", label: "偏好联盟平台（选填）", type: "select", options: [
      { value: "refersion", label: "Refersion（Shopify 原生）" },
      { value: "impact", label: "Impact" },
      { value: "shareasale", label: "ShareASale" },
      { value: "custom", label: "自建系统" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await designAffiliateTiers(input as unknown as AffiliateTierInput);
    return {
      skill_id: "affiliate_tier_designer",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
