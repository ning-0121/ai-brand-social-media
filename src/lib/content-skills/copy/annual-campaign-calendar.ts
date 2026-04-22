/**
 * Skill: annual_campaign_calendar
 * 年度营销日历 — 根据品牌品类/受众/平台生成 6-8 个锚点大促 + 每场活动的
 * 目标 / 内容需求 / 预算分配 / 关键动作时间线
 *
 * Research basis:
 * - DTC brands that pre-plan 6+ campaigns hit 22% higher annual revenue (Klaviyo 2024)
 * - Black Friday accounts for ~30% of DTC annual revenue for apparel/home
 * - Q4 (Oct-Dec) should get ≥ 40% of paid budget
 * - Lead-time rule: content creation must start 3-4 weeks before launch
 */

import { callLLM } from "@/lib/content-skills/llm";
import type { ContentSkill, SkillInputData, SkillResult } from "@/lib/content-skills/types";

export interface AnnualCalendarInput {
  brand_category: string;           // e.g. "women's fashion", "home decor"
  target_audience: string;          // e.g. "women 25-35, US, lifestyle-focused"
  avg_order_value: string;          // e.g. "$65"
  top_platforms: string;            // e.g. "TikTok, Instagram, Email"
  current_year?: string;            // defaults to current year
  prior_top_campaign?: string;      // optional: best performing past campaign
  brand_values?: string;            // e.g. "sustainable, minimalist"
}

export async function generateAnnualCampaignCalendar(
  input: AnnualCalendarInput
): Promise<Record<string, unknown>> {
  const year = input.current_year || "2026";

  const result = await callLLM(
    `你是顶级 DTC 品牌营销总监，专注于 ${input.brand_category} 品类。
根据以下品牌信息，生成一份完整的年度营销日历。

**研究基础：**
- 黑五/Cyber Monday 是 DTC 服装/家居品牌全年最大单场，通常占年收入 25-35%
- Q4（10-12月）应分配 ≥ 40% 年度付费预算
- 内容制作必须比活动启动提前 3-4 周
- 每个锚点大促需要：流量预热（2周）→ 活动正式（3-7天）→ 延长尾单（3天）
- 小品牌最多同时运营 2 个活动，避免执行稀释

**必须包含的锚点事件（根据品类调整）：**
1. 新春/Valentine's（1-2月）— 情感驱动型
2. 春季上新（3-4月）— 新品首发型
3. 母亲节/Memorial Day（5月）— 礼品驱动型
4. 夏日促销（6-7月）— 清仓 + 新品双驱
5. Back to School / 秋季上新（8-9月）— 趋势驱动型
6. 黑五大促（11月）— 全年最大流量收割
7. 圣诞/Holiday Season（12月）— 礼品驱动 + 会员复购
8. [可选] 品牌周年/特别节点

返回严格 JSON（不要 markdown，只返回 JSON 对象）：
{
  "year": "${year}",
  "brand_category": "...",
  "annual_budget_split": {
    "Q1_pct": 15,
    "Q2_pct": 20,
    "Q3_pct": 25,
    "Q4_pct": 40
  },
  "campaigns": [
    {
      "rank": 1,
      "name": "活动名称（中英双语）",
      "campaign_type": "seasonal|new_launch|holiday|clearance|flash_sale|collab",
      "anchor_date": "YYYY-MM-DD",
      "prep_start_date": "YYYY-MM-DD",
      "active_start": "YYYY-MM-DD",
      "active_end": "YYYY-MM-DD",
      "goal": "本场目标（增收/获新客/清库存）",
      "kpi_target": "具体 KPI（如：+30% revenue vs. last year, 500 new customers）",
      "revenue_pct_of_annual": 25,
      "budget_pct_of_annual": 30,
      "discount_depth": "20% off | BOGO | Free gift with $X",
      "key_actions": [
        { "week": -3, "action": "拍摄素材 + 邮件序列设计" },
        { "week": -2, "action": "开启预热流量 + 社媒倒计时" },
        { "week": -1, "action": "早鸟预售 + KOL 内容发布" },
        { "week": 0, "action": "正式开启 + 全平台推送" },
        { "week": 1, "action": "尾单 + 复购邮件" }
      ],
      "content_needs": {
        "videos": 3,
        "images": 8,
        "emails": 4,
        "social_posts": 12
      },
      "platforms": ["TikTok", "Email"],
      "human_approval_required": true,
      "human_decision_points": ["最终折扣力度需 CEO 审批", "KOL 名单需运营确认"]
    }
  ],
  "execution_principles": ["原则1", "原则2", "原则3"],
  "one_line_strategy": "本年度营销战略一句话总结"
}`,
    `品牌信息：
- 品类：${input.brand_category}
- 目标受众：${input.target_audience}
- 平均客单价：${input.avg_order_value}
- 主要渠道：${input.top_platforms}
- 年份：${year}
${input.prior_top_campaign ? `- 历史最佳活动：${input.prior_top_campaign}` : ""}
${input.brand_values ? `- 品牌价值观：${input.brand_values}` : ""}

请生成完整年度营销日历。`,
    3000
  );

  return result;
}

export const annualCampaignCalendarSkill: ContentSkill = {
  id: "annual_campaign_calendar",
  name: "年度营销日历",
  description: "AI 生成 6-8 个锚点大促 + 每场预算分配 + 内容需求 + 关键动作时间线",
  category: "campaign",
  icon: "CalendarDays",
  color: "violet",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 30,
  agents: ["campaign_planner"],
  inputs: [
    { key: "brand_category", label: "品牌品类", type: "text", placeholder: "如：女装/家居/配饰" },
    { key: "target_audience", label: "目标受众", type: "text", placeholder: "如：美国女性 25-35 岁，生活方式品牌" },
    { key: "avg_order_value", label: "平均客单价", type: "text", placeholder: "$65" },
    { key: "top_platforms", label: "主要渠道", type: "text", placeholder: "TikTok, Instagram, Email" },
    { key: "current_year", label: "规划年份", type: "text", placeholder: "2026" },
    { key: "prior_top_campaign", label: "历史最佳活动（选填）", type: "text", placeholder: "如：2025 黑五营收超目标 40%" },
    { key: "brand_values", label: "品牌价值观（选填）", type: "text", placeholder: "如：可持续、极简主义" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await generateAnnualCampaignCalendar(input as unknown as AnnualCalendarInput);
    return {
      skill_id: "annual_campaign_calendar",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
