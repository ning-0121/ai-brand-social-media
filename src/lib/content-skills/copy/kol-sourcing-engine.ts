/**
 * Skill: kol_sourcing_engine
 * KOL/创作者发现 + 分级合作简报
 *
 * Research basis:
 * - Micro-influencer (10K-100K): avg engagement 3.86% vs mega 1.21% (Influencer Marketing Hub 2024)
 * - Nano (1K-10K): 8%+ engagement, best for niche DTC/fashion
 * - CPM formula: (Budget / Followers) × 1000 — target <$15 CPM for fashion/lifestyle
 * - UGC-style content converts 4x better than polished brand content (Stackla)
 * - Best ROI tier for DTC under $5M revenue: 10-100K micro + UGC creator mix
 * - TikTok CPM average $3.21 vs Instagram $6.70 (2024 benchmarks)
 * - Affiliate-first ask converts 3x better than flat-fee for cold outreach
 */

import { callLLM } from "@/lib/content-skills/llm";
import type { ContentSkill, SkillInputData, SkillResult } from "@/lib/content-skills/types";

export interface KolSourcingInput {
  campaign_name: string;
  campaign_goal: string;           // "brand awareness" | "sales conversion" | "UGC collection"
  budget_tier: string;             // "under_5k" | "5k_20k" | "20k_50k" | "50k_plus"
  product_category: string;
  target_demo: string;             // e.g. "US women 22-32, fashion & lifestyle"
  platforms: string;               // e.g. "TikTok, Instagram"
  brand_aesthetic: string;         // e.g. "minimalist, clean, earthy tones"
  deal_preference?: string;        // "affiliate_only" | "flat_fee" | "hybrid" | "gifting"
}

export async function runKolSourcingEngine(
  input: KolSourcingInput
): Promise<Record<string, unknown>> {
  const result = await callLLM(
    `你是 DTC 品牌的 KOL 合作负责人，专精 TikTok + Instagram 生态。
根据活动需求，输出一套完整的创作者合作策略。

**行业基准（必须体现在建议中）：**
- Nano（1K-10K）：参与率 8%+，最适合真实感内容，成本最低
- Micro（10K-100K）：参与率 3.86%，DTC 品牌最高 ROI 段位
- Mid（100K-500K）：参与率 2%，需要更高预算，适合大促曝光
- 服装/生活方式品牌目标 CPM < $15（TikTok）/ < $25（Instagram）
- 冷启动邮件：以联盟佣金开始，比直接谈费用高 3 倍转化率
- UGC 风格内容比精修品牌内容转化高 4 倍
- 一次活动最佳搭配：2-3 个 micro + 5-10 个 nano + UGC 征集

**Brief 要包含：**
1. 内容方向（不是命令，是灵感）
2. 必须出现的元素（产品特写/尺码试穿/链接）
3. 绝对不能出现的元素（竞品/低质量滤镜）
4. 交付格式（TikTok 竖版 / Reel / 静态图）
5. 时间线（发布日期 ± 3 天灵活）

返回严格 JSON：
{
  "campaign_name": "...",
  "strategy_summary": "一句话总结合作策略",
  "creator_tiers": [
    {
      "tier": "micro | nano | mid | ugc",
      "follower_range": "10K-100K",
      "count_target": 3,
      "budget_per_creator": "$300-500",
      "deal_type": "affiliate_10pct + gifting",
      "platform_focus": "TikTok",
      "expected_cpm": "$8-12",
      "expected_reach": "30K-90K",
      "content_format": "60s TikTok try-on haul",
      "sourcing_criteria": [
        "fashion content ≥ 60% of their feed",
        "engagement rate ≥ 3%",
        "US audience ≥ 70%",
        "no recent competitive brand collab"
      ]
    }
  ],
  "outreach_template": {
    "subject": "邮件主题行",
    "body": "合作邀约邮件正文（英文，自然对话风格，非正式）",
    "follow_up_day": 5
  },
  "brief_template": {
    "campaign_overview": "...",
    "what_we_love_about_your_content": "...",
    "content_direction": "...",
    "must_include": ["...", "..."],
    "avoid": ["...", "..."],
    "deliverables": "X TikTok videos (60s max) + X Instagram Stories",
    "timeline": "Content due by [DATE], publish between [DATE RANGE]",
    "compensation": "...",
    "tracking_link": "Use provided UTM link in bio/caption"
  },
  "total_estimated_budget": "$X,XXX",
  "expected_total_reach": "XXX,XXX",
  "expected_attributed_revenue": "$X,XXX",
  "human_approval_required": true,
  "human_decision_points": [
    "最终 KOL 名单需运营确认审核",
    "合作费用 > $500 需 CEO 审批",
    "合约条款需法律确认"
  ]
}`,
    `活动信息：
- 活动名称：${input.campaign_name}
- 活动目标：${input.campaign_goal}
- 预算级别：${input.budget_tier}
- 产品品类：${input.product_category}
- 目标用户：${input.target_demo}
- 主要平台：${input.platforms}
- 品牌风格：${input.brand_aesthetic}
${input.deal_preference ? `- 合作偏好：${input.deal_preference}` : ""}

请输出完整 KOL 合作策略。`,
    3000
  );

  return result;
}

export const kolSourcingEngineSkill: ContentSkill = {
  id: "kol_sourcing_engine",
  name: "KOL 发现 + 合作简报",
  description: "分级创作者策略 + 邀约邮件模板 + Brief 模板 + ROI 预测",
  category: "campaign",
  icon: "Users",
  color: "pink",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 25,
  agents: ["campaign_planner"],
  inputs: [
    { key: "campaign_name", label: "活动名称", type: "text", placeholder: "如：夏季上新 × KOL 计划" },
    { key: "campaign_goal", label: "活动目标", type: "select", options: [
      { value: "brand_awareness", label: "品牌曝光" },
      { value: "sales_conversion", label: "销售转化" },
      { value: "ugc_collection", label: "UGC 素材收集" },
      { value: "new_product_launch", label: "新品首发" },
    ]},
    { key: "budget_tier", label: "合作预算", type: "select", options: [
      { value: "under_5k", label: "< $5,000（礼品 + 联盟）" },
      { value: "5k_20k", label: "$5,000-20,000（Micro 主力）" },
      { value: "20k_50k", label: "$20,000-50,000（混合策略）" },
      { value: "50k_plus", label: "$50,000+（中量级 KOL）" },
    ]},
    { key: "product_category", label: "产品品类", type: "text", placeholder: "如：亚麻女装" },
    { key: "target_demo", label: "目标人群", type: "text", placeholder: "如：美国女性 22-32 岁，时尚生活方式" },
    { key: "platforms", label: "主要平台", type: "text", placeholder: "TikTok, Instagram" },
    { key: "brand_aesthetic", label: "品牌风格", type: "text", placeholder: "如：极简、干净、大地色系" },
    { key: "deal_preference", label: "合作形式偏好（选填）", type: "select", options: [
      { value: "affiliate_only", label: "联盟佣金优先" },
      { value: "flat_fee", label: "固定费用" },
      { value: "hybrid", label: "固定费 + 联盟" },
      { value: "gifting", label: "礼品换内容" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await runKolSourcingEngine(input as unknown as KolSourcingInput);
    return {
      skill_id: "kol_sourcing_engine",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
