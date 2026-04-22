/**
 * Playbook: campaign_year_planner
 *
 * 一次启动年度活动全链 — 日历规划 / KOL 策略 / 联盟体系 / 联名机会 / 渠道扩张 / 增量测量
 * 目标：用一个 workflow 完成 6 个独立决策域，输出可直接执行的年度运营手册
 *
 * 注意：带 ⚠️ 标记的步骤为「人类决策节点」，AI 只给建议，不自动执行
 */

import type { Playbook } from "../types";

export const campaignYearPlannerPlaybook: Playbook = {
  id: "campaign_year_planner",
  name: "年度活动操盘手册",
  description: "6 大系统一次规划：日历 + KOL + 联盟 + 联名 + 渠道扩张 + 增量测量",
  objective: "生成完整年度营销运营蓝图，所有关键决策清晰标注人工审批节点",
  when_to_use: "年初规划、品牌升级、新市场进入、或当前营销体系缺乏系统性时",
  category: "campaign",
  icon: "CalendarDays",
  color: "violet",
  estimated_duration_seconds: 360,
  required_inputs: [
    { key: "brand_category", label: "品牌品类", type: "text" },
    { key: "target_audience", label: "目标受众", type: "text" },
    { key: "avg_order_value", label: "平均客单价", type: "text" },
    { key: "top_platforms", label: "主要渠道", type: "text" },
    { key: "monthly_revenue", label: "当前月收入", type: "text" },
    { key: "product_margin_pct", label: "产品毛利率 (%)", type: "text" },
  ],
  steps: [
    // ── 第 1 步：年度日历（AI 自动生成，⚠️ 具体折扣/预算需人工确认）──
    {
      id: "annual_calendar",
      label: "第 1 步：年度营销日历（6-8 个锚点大促）",
      skill_id: "annual_campaign_calendar",
      inputs: (ctx) => ({
        brand_category: ctx.user_inputs.brand_category || "women's fashion",
        target_audience: ctx.user_inputs.target_audience || "US women 25-35",
        avg_order_value: ctx.user_inputs.avg_order_value || "$65",
        top_platforms: ctx.user_inputs.top_platforms || "TikTok, Instagram, Email",
        current_year: "2026",
      }),
      // ⚠️ 最终折扣力度 + 预算分配需 CEO 确认
    },

    // ── 第 2 步：KOL 策略（⚠️ 具体 KOL 名单 + 费用需人工确认）──
    {
      id: "kol_strategy",
      label: "第 2 步：KOL 合作策略（分层 + Brief 模板）",
      skill_id: "kol_sourcing_engine",
      inputs: (ctx) => ({
        campaign_name: `${ctx.user_inputs.brand_category || "品牌"} 年度 KOL 计划`,
        campaign_goal: "brand_awareness",
        budget_tier: "5k_20k",
        product_category: ctx.user_inputs.brand_category || "women's fashion",
        target_demo: ctx.user_inputs.target_audience || "US women 25-35",
        platforms: ctx.user_inputs.top_platforms || "TikTok, Instagram",
        brand_aesthetic: "minimalist, clean, lifestyle",
        deal_preference: "affiliate_only",
      }),
      // ⚠️ 最终 KOL 名单 + 合作费用需运营确认
    },

    // ── 第 3 步：联盟体系（⚠️ 佣金率需财务确认）──
    {
      id: "affiliate_system",
      label: "第 3 步：联盟分销体系设计",
      skill_id: "affiliate_tier_designer",
      inputs: (ctx) => ({
        product_category: ctx.user_inputs.brand_category || "women's fashion",
        product_margin_pct: ctx.user_inputs.product_margin_pct || "65",
        avg_order_value: ctx.user_inputs.avg_order_value || "$65",
        current_monthly_revenue: ctx.user_inputs.monthly_revenue || "$30,000",
        max_commission_budget_pct: "15",
        affiliate_platform: "refersion",
      }),
      // ⚠️ 最终佣金率需财务确认
    },

    // ── 第 4 步：联名机会（⚠️ 具体合作品牌需运营团队确认品牌调性）──
    {
      id: "brand_collab",
      label: "第 4 步：品牌联名机会匹配",
      skill_id: "brand_collab_matcher",
      inputs: (ctx) => ({
        brand_description: `${ctx.user_inputs.brand_category || "women's fashion"} brand, AOV ${ctx.user_inputs.avg_order_value || "$65"}`,
        target_customer: ctx.user_inputs.target_audience || "US women 25-35",
        collab_goal: "new_audience",
        budget_range: "under_5k",
        brand_size: "1m_5m",
      }),
      // ⚠️ 合作品牌最终决策需 CEO 审批
    },

    // ── 第 5 步：渠道扩张（⚠️ 渠道进入决策需 CEO 审批）──
    {
      id: "marketplace_expansion",
      label: "第 5 步：渠道扩张就绪度评分",
      skill_id: "marketplace_expansion_scorer",
      inputs: (ctx) => ({
        product_type: ctx.user_inputs.brand_category || "women's linen clothing",
        current_channels: "Shopify DTC only",
        monthly_revenue: ctx.user_inputs.monthly_revenue || "$30,000",
        product_price_range: ctx.user_inputs.avg_order_value || "$45-120",
        product_count: "12 SKUs",
        fulfillment_method: "3pl",
        brand_recognition: "small_social_following",
        expansion_priority: "revenue_fast",
      }),
      optional: true,
      // ⚠️ 渠道扩张是战略决策，需 CEO 最终拍板
    },

    // ── 第 6 步：增量测量（⚠️ Holdout 测试暂停广告期间有短期收入损失，需确认）──
    {
      id: "incrementality_setup",
      label: "第 6 步：增量测试设计（真实 ROI 衡量）",
      skill_id: "incrementality_tester",
      inputs: () => ({
        channel_to_test: "meta_ads",
        monthly_budget: "$5,000",
        current_attributed_roas: "3.2x",
        monthly_orders: "200",
        test_duration_weeks: "4",
        holdout_pct: "15",
        primary_kpi: "revenue",
      }),
      optional: true,
      // ⚠️ 控制组暂停广告会有短期收入损失，需 CEO 确认接受
    },
  ],
};
