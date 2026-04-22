/**
 * Playbook: 新品上市完整工作流
 *
 * 从一个产品 ID 开始，AI 自动完成：
 * PMF 验证 → 定价建议 → 详情页 → 图片素材 → 视频脚本 → 社媒文案 → 广告 Brief → 承接页
 *
 * 最终产出：可以直接上市的完整素材包 + 部署审批
 */

import type { Playbook } from "../types";
import { readStepOutput } from "../workflow-engine";

export const productLaunchPlaybook: Playbook = {
  id: "product_launch",
  name: "新品上市全套",
  description: "一个产品从验证到上市需要的全部素材 — AI 自动完成 8 步",
  objective: "把一款新品从「有库存」推到「市场感知 + 可以卖」的完整闭环",
  when_to_use: "有新品要上架、或对已有产品想做一次完整的市场推广",
  category: "growth",
  icon: "Rocket",
  color: "indigo",
  estimated_duration_seconds: 240,
  required_inputs: [
    { key: "product", label: "上市商品", type: "product", required: true },
    { key: "inventory_qty", label: "库存数量", type: "number", placeholder: "如：200" },
    { key: "target_audience", label: "目标人群（可选）", type: "text", placeholder: "如：20-30岁都市女性" },
    { key: "launch_date", label: "计划上市日期", type: "date" },
    { key: "gross_margin_pct", label: "目标毛利率 %", type: "number", placeholder: "如：60" },
  ],
  steps: [
    // ── Step 1: PMF 验证 ──────────────────────────────────────
    {
      id: "validate_pmf",
      label: "PMF 信号分析 — 判断这款值不值得上市",
      skill_id: "product_validator",
      inputs: (ctx) => ({
        product: ctx.user_inputs.product as Record<string, unknown>,
        test_type: "pre_launch",
        inventory_qty: String(ctx.user_inputs.inventory_qty || ""),
      }),
      extract: (output, ctx) => {
        ctx.decisions.pmf_verdict = (output as Record<string, unknown>).verdict;
        ctx.decisions.hero_potential = (output as Record<string, unknown>).hero_potential_score;
      },
    },

    // ── Step 2: 定价策略 ──────────────────────────────────────
    {
      id: "pricing",
      label: "定价策略 — 锚点 / 套装 / 涨价空间",
      skill_id: "pricing_strategy",
      inputs: (ctx) => ({
        products: [ctx.user_inputs.product],
        scenario: "new_product",
        gross_margin_target: String(ctx.user_inputs.gross_margin_pct || "60"),
        brand_positioning: "mid_premium",
      }),
      extract: (output, ctx) => {
        const o = output as Record<string, unknown>;
        const products = o.products as Array<{ recommended_price: number }> | undefined;
        if (products?.[0]?.recommended_price) {
          ctx.decisions.recommended_price = products[0].recommended_price;
        }
      },
    },

    // ── Step 3 + 4 + 5 + 6: 素材并行生成 ──────────────────────
    {
      id: "detail_page",
      label: "商品详情页（含 JSON-LD Schema）",
      skill_id: "shopify_detail_page",
      parallel_group: "creative_pack",
      inputs: (ctx) => ({
        product: ctx.user_inputs.product,
        style: "modern",
        sections: "full",
      }),
    },
    {
      id: "product_photo",
      label: "AI 生活方式场景图",
      skill_id: "ai_product_photo",
      parallel_group: "creative_pack",
      inputs: (ctx) => ({
        product: ctx.user_inputs.product,
        photo_style: "lifestyle",
        aspect_ratio: "1:1",
      }),
      optional: true,
    },
    {
      id: "video_script",
      label: "TikTok BAB 脚本（含钩子公式）",
      skill_id: "short_video_script",
      parallel_group: "creative_pack",
      inputs: (ctx) => ({
        product: ctx.user_inputs.product,
        platform: "tiktok",
        duration: "30s",
        style: "bab",
        hook_type: "auto",
      }),
    },
    {
      id: "social_posts",
      label: "Instagram 社媒帖子包",
      skill_id: "social_post_pack",
      parallel_group: "creative_pack",
      inputs: (ctx) => ({
        product: ctx.user_inputs.product,
        platform: "instagram",
      }),
      optional: true,
    },

    // ── Step 7: 广告 Brief（用前面 PMF + 定价做 context）────
    {
      id: "ad_brief",
      label: "Meta+TikTok 广告投放 Brief（ABO→CBO）",
      skill_id: "ad_creative_brief",
      inputs: (ctx) => {
        const pricing = readStepOutput<Record<string, unknown>>(ctx, "pricing");
        const angle = ctx.user_inputs.target_audience as string | undefined;
        return {
          product: ctx.user_inputs.product,
          platform: "both",
          campaign_objective: "purchase",
          budget_phase: "testing",
          creative_angle: angle || "",
          monthly_budget_usd: "500",
          pricing_context: pricing,
        };
      },
    },

    // ── Step 8: Landing Page（广告承接页）──────────────────
    {
      id: "landing_page",
      label: "付费流量承接页",
      skill_id: "landing_page",
      inputs: (ctx) => ({
        page_goal: "purchase",
        product: ctx.user_inputs.product,
        traffic_source: "paid_social",
        audience: ctx.user_inputs.target_audience || "",
      }),
    },

    // ── Step 9: 部署审批 ──────────────────────────────────
    {
      id: "deploy_approval",
      label: "部署审批 — 是否推送详情页到 Shopify",
      skill_id: "shopify_detail_page",
      requires_approval: true,
      approval_prompt: (ctx) => {
        const artifactCount = ctx.artifacts.length;
        const product = ctx.user_inputs.product as { name?: string };
        return `新品 ${product?.name} 上市素材包已完成，共 ${artifactCount} 个素材。审批后将自动推送详情页到 Shopify，并启动后续广告流程。`;
      },
      inputs: (ctx) => ({ product: ctx.user_inputs.product }),
      optional: true,
    },
  ],
};
