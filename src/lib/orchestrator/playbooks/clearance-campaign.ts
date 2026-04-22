/**
 * Playbook: 清仓活动工作流
 *
 * 给定滞销产品 → AI 完成：
 * 确认清仓 → 安全折扣计算 → 活动蓝图 → 承接页 → 挽回邮件 → 推广素材
 */

import type { Playbook } from "../types";

export const clearanceCampaignPlaybook: Playbook = {
  id: "clearance_campaign",
  name: "清仓去库存",
  description: "滞销品死库存一键做完整清仓活动：从定价到推广到召回",
  objective: "把占资金的滞销库存 30 天内清完，最大化回收率",
  when_to_use: "库存停滞 > 90 天、sell-through < 50%、或要为新品上市腾仓位",
  category: "inventory",
  icon: "Archive",
  color: "orange",
  estimated_duration_seconds: 180,
  required_inputs: [
    { key: "products", label: "清仓商品（可多选）", type: "products", required: true },
    { key: "target_days", label: "目标清完天数", type: "number", placeholder: "如：30" },
    { key: "gross_margin_pct", label: "毛利率 %（决定安全折扣）", type: "number", placeholder: "如：55" },
    { key: "max_discount_pct", label: "可接受最大折扣 %", type: "number", placeholder: "如：40" },
  ],
  steps: [
    // ── Step 1: 确认清仓动作必要性 ─────────────────────────
    {
      id: "validate_clearance",
      label: "清仓必要性诊断 — 每个 SKU 的真实状态",
      skill_id: "product_validator",
      inputs: (ctx) => {
        const products = ctx.user_inputs.products as Array<Record<string, unknown>>;
        return {
          product: products?.[0],
          test_type: "clearance_decision",
        };
      },
    },

    // ── Step 2: 定清仓价格（套装 vs 折扣 vs 免运费） ─────
    {
      id: "clearance_pricing",
      label: "清仓定价 — 折扣 / 套装 / 免运费组合",
      skill_id: "pricing_strategy",
      inputs: (ctx) => ({
        products: ctx.user_inputs.products,
        scenario: "bundle_pricing",
        gross_margin_target: String(ctx.user_inputs.gross_margin_pct || "55"),
        brand_positioning: "mid_premium",
      }),
      extract: (output, ctx) => {
        const o = output as Record<string, unknown>;
        ctx.decisions.bundle_recommendations = o.bundle_recommendations;
      },
    },

    // ── Step 3: 活动蓝图（四阶段 FOMO 机制） ──────────────
    {
      id: "campaign_blueprint",
      label: "活动蓝图 — pre-hype / launch / sustain / post",
      skill_id: "flash_sale_planner",
      inputs: (ctx) => ({
        products: ctx.user_inputs.products,
        sale_type: "clearance",
        duration_hours: "72",
        max_discount_pct: String(ctx.user_inputs.max_discount_pct || "30"),
        gross_margin_pct: String(ctx.user_inputs.gross_margin_pct || "55"),
      }),
    },

    // ── Step 4 + 5: 承接页 + 邮件并行 ──────────────────────
    {
      id: "landing_page",
      label: "清仓活动承接页",
      skill_id: "landing_page",
      parallel_group: "campaign_assets",
      inputs: (ctx) => {
        const products = ctx.user_inputs.products as Array<Record<string, unknown>>;
        return {
          page_goal: "purchase",
          product: products?.[0],
          traffic_source: "email",
          offer: `清仓特价 · 最高 ${ctx.user_inputs.max_discount_pct || 30}% off`,
          urgency: `限时 ${ctx.user_inputs.target_days || 30} 天，售完即止`,
        };
      },
    },
    {
      id: "winback_emails",
      label: "弃购挽回邮件三步序列",
      skill_id: "abandoned_cart_sequence",
      parallel_group: "campaign_assets",
      inputs: (ctx) => {
        const products = ctx.user_inputs.products as Array<Record<string, unknown>>;
        return {
          product: products?.[0],
          discount_offer: `${ctx.user_inputs.max_discount_pct || 20}% off`,
          tone: "urgent",
        };
      },
    },

    // ── Step 6: 推广素材并行（社媒 + 广告） ──────────────
    {
      id: "social_posts",
      label: "社媒清仓帖子（Instagram + TikTok）",
      skill_id: "social_post_pack",
      parallel_group: "promo_assets",
      inputs: (ctx) => {
        const products = ctx.user_inputs.products as Array<Record<string, unknown>>;
        return {
          product: products?.[0],
          platform: "instagram",
          campaign_theme: "清仓特惠",
        };
      },
      optional: true,
    },
    {
      id: "ad_brief",
      label: "再营销广告 Brief（8-30 天受众）",
      skill_id: "ad_creative_brief",
      parallel_group: "promo_assets",
      inputs: (ctx) => {
        const products = ctx.user_inputs.products as Array<Record<string, unknown>>;
        return {
          product: products?.[0],
          platform: "meta",
          campaign_objective: "retargeting",
          budget_phase: "testing",
          creative_angle: "限时清仓 + 折扣激励",
        };
      },
    },
  ],
};
