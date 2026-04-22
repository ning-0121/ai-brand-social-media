/**
 * Skill: brand_collab_matcher
 * 品牌联名匹配 — 互补品牌找搭档 + 合作结构设计 + 开口话术
 *
 * Research basis:
 * - Brand collabs average 30% increase in social engagement vs solo campaigns
 * - Best partners: same price point, different product category, overlapping audience
 * - Deal structure: revenue share (40/60 or 50/50) > cross-promotion > co-branded product
 * - Timing: 6-8 weeks lead time minimum for co-branded product collabs
 * - Red flags: competitors' suppliers, brand with negative press, audience mismatch >40%
 * - Sweet spot: partner with 0.5x-2x your brand's following/revenue scale
 */

import { callLLM } from "@/lib/content-skills/llm";
import type { ContentSkill, SkillInputData, SkillResult } from "@/lib/content-skills/types";

export interface BrandCollabInput {
  brand_description: string;       // e.g. "women's linen clothing brand, minimalist, $50-120 AOV"
  target_customer: string;         // e.g. "US women 25-35, interested in wellness, sustainable living"
  collab_goal: string;             // "new_audience" | "product_launch" | "content_creation" | "event"
  budget_range: string;            // e.g. "under $5K" | "$5K-20K" | "equity/rev share"
  brand_size: string;              // e.g. "under_1m" | "1m_5m" | "5m_20m"
  avoid_categories?: string;       // e.g. "fast fashion, alcohol"
}

export async function matchBrandCollab(
  input: BrandCollabInput
): Promise<Record<string, unknown>> {
  const result = await callLLM(
    `你是品牌合作战略专家，专精 DTC 品牌间的联名/交叉营销合作。

**黄金合作原则：**
1. 价格带相近（AOV 相差不超过 50%）
2. 受众重叠 60-80%（不是 100%，需要一定新鲜度）
3. 产品品类互补而非竞争（服装 × 香氛、服装 × 健身、服装 × 饰品）
4. 品牌体量接近（1/2x - 2x 体量，避免大小悬殊导致曝光不对等）
5. 价值观对齐（可持续 × 可持续，luxe × luxe，athletic × athletic）

**合作结构类型：**
- Cross-promo（成本最低）：互发邮件/社媒，互放折扣码
- Co-branded product（收入最高）：联名款，利润分成
- Bundle package（转化最高）：打包销售，各自运营
- Co-hosted event/giveaway（曝光最快）：联合 TikTok/Instagram 活动
- Affiliate cross-sell（风险最低）：在对方店铺设置联盟链接

**避免的信号：**
- 品牌有负面新闻或客诉风险
- 品牌规模悬殊 > 5x
- 完全同品类（即使不是竞品也会抢受众注意力）
- 对方已与竞品合作

返回严格 JSON：
{
  "strategy_overview": "联名策略一句话总结",
  "ideal_partner_profile": {
    "categories": ["香氛", "配饰", "健康食品", "瑜伽/健身"],
    "brand_size_range": "月收入 $30K-200K",
    "audience_overlap": "女性 25-35，生活方式导向，Instagram/TikTok 活跃",
    "price_point": "平均客单价 $40-120",
    "must_have_values": ["可持续", "小众感", "高质感"],
    "red_flags": ["快时尚", "大众 marketplace 品牌", "负面舆论"]
  },
  "recommended_brand_archetypes": [
    {
      "archetype": "天然香氛/蜡烛品牌",
      "rationale": "相同受众群体，高度互补，无竞争",
      "example_brand_types": "类似 Otherland, P.F. Candle Co. 风格的小众品牌",
      "collab_angle": "「慢生活套装」联名礼盒",
      "expected_benefit": "触达 20-40% 新受众，双方邮件列表互通"
    }
  ],
  "collab_structures": [
    {
      "type": "cross_promotion",
      "effort": "low",
      "cost": "$0-500",
      "timeline_weeks": 2,
      "revenue_upside": "+5-15% 短期收入",
      "how_it_works": "互发邮件 + 折扣码（FRIEND15），各自追踪转化",
      "best_for": "低门槛试探合作深度"
    },
    {
      "type": "bundle_package",
      "effort": "medium",
      "cost": "$500-2000（联合内容制作）",
      "timeline_weeks": 4,
      "revenue_upside": "+20-35% AOV 提升",
      "how_it_works": "联合礼盒，双方各自销售，利润各归各",
      "best_for": "节日送礼季"
    },
    {
      "type": "co_branded_product",
      "effort": "high",
      "cost": "$2000-20000（样品 + 生产）",
      "timeline_weeks": 8,
      "revenue_upside": "新品首发流量 + 媒体价值",
      "how_it_works": "联名款产品，利润按约定比例分成",
      "best_for": "黑五前 2 个月发布，制造话题"
    }
  ],
  "outreach_pitch": {
    "email_subject": "Collab idea for [Their Brand] × [Your Brand]",
    "email_body": "简洁英文邮件（3段，自然不做作，具体说明利益）",
    "follow_up_strategy": "发出 5 天后跟进，换一个角度"
  },
  "success_metrics": {
    "minimum_viable_collab": "各方获得 500+ 新邮件订阅者或 $5,000+ attributed revenue",
    "measurement": "UTM 链接追踪 + 邮件来源标记"
  },
  "human_approval_required": true,
  "human_decision_points": [
    "最终合作品牌选定需运营团队审核品牌调性",
    "合同条款（特别是联名款）需法律审核",
    "任何涉及产品联名需 CEO 最终确认"
  ]
}`,
    `品牌信息：
- 品牌描述：${input.brand_description}
- 目标客户：${input.target_customer}
- 合作目标：${input.collab_goal}
- 预算范围：${input.budget_range}
- 品牌体量：${input.brand_size}
${input.avoid_categories ? `- 避免合作的品类：${input.avoid_categories}` : ""}

请输出品牌联名匹配策略。`,
    2500
  );

  return result;
}

export const brandCollabMatcherSkill: ContentSkill = {
  id: "brand_collab_matcher",
  name: "品牌联名匹配",
  description: "互补品牌画像 + 合作结构设计 + 开口邮件模板 + ROI 预测",
  category: "campaign",
  icon: "Handshake",
  color: "blue",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 20,
  agents: ["campaign_planner"],
  inputs: [
    { key: "brand_description", label: "品牌描述", type: "text", placeholder: "如：亚麻女装，极简主义，客单价 $65-120" },
    { key: "target_customer", label: "目标客户画像", type: "text", placeholder: "如：美国女性 25-35，关注可持续生活" },
    { key: "collab_goal", label: "合作目标", type: "select", options: [
      { value: "new_audience", label: "触达新受众" },
      { value: "product_launch", label: "新品发布造势" },
      { value: "content_creation", label: "共同内容创作" },
      { value: "holiday_bundle", label: "节日礼盒联名" },
    ]},
    { key: "brand_size", label: "品牌体量", type: "select", options: [
      { value: "under_1m", label: "年收入 < $1M" },
      { value: "1m_5m", label: "年收入 $1M-5M" },
      { value: "5m_20m", label: "年收入 $5M-20M" },
    ]},
    { key: "budget_range", label: "合作预算", type: "select", options: [
      { value: "zero_cost", label: "纯交叉推广（零成本）" },
      { value: "under_5k", label: "< $5,000" },
      { value: "5k_20k", label: "$5,000-20,000" },
      { value: "rev_share", label: "收入分成" },
    ]},
    { key: "avoid_categories", label: "避免合作的品类（选填）", type: "text", placeholder: "如：快时尚、酒精" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await matchBrandCollab(input as unknown as BrandCollabInput);
    return {
      skill_id: "brand_collab_matcher",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
