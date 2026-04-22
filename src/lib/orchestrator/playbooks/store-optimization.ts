/**
 * Playbook: 独立站优化工作流
 *
 * 整站诊断 → 动态决策要修什么 → 批量执行修复
 */

import type { Playbook } from "../types";
import { supabase } from "../../supabase";
import { readStepOutput } from "../workflow-engine";

export const storeOptimizationPlaybook: Playbook = {
  id: "store_optimization",
  name: "独立站一键优化",
  description: "诊断 → 优先级排序 → 批量修复，一次性拉升 CVR/SEO/AOV",
  objective: "在一次运行中完成独立站健康诊断和最关键的 5 项修复",
  when_to_use: "每月一次整站体检，或发现 CVR 低于 2% 时立即触发",
  category: "optimization",
  icon: "Stethoscope",
  color: "blue",
  estimated_duration_seconds: 300,
  required_inputs: [
    { key: "store_url", label: "店铺网址", type: "text", placeholder: "如：jojofeifei.com" },
    { key: "monthly_visitors", label: "月访客数", type: "number", placeholder: "如：5000" },
    { key: "current_cvr", label: "当前 CVR %", type: "number", placeholder: "如：2.1" },
    { key: "focus_area", label: "重点方向", type: "select", options: [
      { value: "full", label: "全面诊断" },
      { value: "checkout", label: "只看结账" },
      { value: "product_pages", label: "只看商品页" },
      { value: "mobile", label: "只看移动端" },
    ]},
  ],
  steps: [
    // ── Step 1: 完整店铺诊断 ─────────────────────────────
    {
      id: "audit",
      label: "店铺健康诊断 — 对比行业基准生成优先级清单",
      skill_id: "store_health_audit",
      inputs: (ctx) => ({
        store_url: ctx.user_inputs.store_url || "jojofeifei.com",
        monthly_visitors: String(ctx.user_inputs.monthly_visitors || ""),
        current_cvr: String(ctx.user_inputs.current_cvr || ""),
        focus_area: ctx.user_inputs.focus_area || "full",
      }),
      extract: (output, ctx) => {
        const o = output as Record<string, unknown>;
        ctx.decisions.priority_fixes = o.priority_fixes;
        ctx.decisions.overall_score = o.overall_score;
      },
      max_retries: 2,
    },

    // ── Step 2: 批量优化商品 SEO 标题（Google Shopping）──
    {
      id: "seo_titles",
      label: "批量优化商品标题（Google Shopping 公式）",
      skill_id: "google_shopping_title",
      handler: async () => {
        // Dynamically pull 10 worst-SEO products from DB
        const { data: products } = await supabase
          .from("products")
          .select("id, name, price, category, tags, shopify_product_id")
          .order("seo_score", { ascending: true, nullsFirst: true })
          .limit(10);

        if (!products || products.length === 0) {
          return { skipped: true, reason: "no products found" };
        }

        const { executeSkill } = await import("../../content-skills/executor");
        const { result } = await executeSkill("google_shopping_title", {
          products,
          brand_name: "JOJOFEIFEI",
          market: "us",
        }, { sourceModule: "orchestrator" });
        return result.output as Record<string, unknown>;
      },
      inputs: () => ({}),
      max_retries: 2,
    },

    // ── Step 3: 动态重写最差 3 个详情页 ─────────────────────
    {
      id: "rewrite_worst_detail_pages",
      label: "重写最差 3 个商品详情页（CRO 结构）",
      handler: async () => {
        const { data: products } = await supabase
          .from("products")
          .select("id, name, price, category, body_html, meta_title, meta_description, tags, image_url, shopify_product_id")
          .or("body_html.is.null,meta_description.is.null")
          .limit(3);

        if (!products || products.length === 0) {
          return { skipped: true, reason: "no bad detail pages found" };
        }

        const { executeSkill } = await import("../../content-skills/executor");
        const results = await Promise.allSettled(
          products.map(p => executeSkill("shopify_detail_page", {
            product: p,
            style: "modern",
            sections: "full",
          }, { sourceModule: "orchestrator" }))
        );

        const successful = results.filter(r => r.status === "fulfilled").length;
        return {
          rewritten_count: successful,
          total_processed: products.length,
          products_optimized: products.map(p => p.name),
        };
      },
      inputs: () => ({}),
      optional: true,
    },

    // ── Step 4: 更新首页 Hero ──────────────────────────────
    {
      id: "homepage_hero",
      label: "首页 Hero 更新（对齐本季重点）",
      skill_id: "homepage_hero",
      inputs: () => ({
        brand_name: "JOJOFEIFEI",
        season: "general",
      }),
      optional: true,
    },

    // ── Step 5: 部署审批 ────────────────────────────────────
    {
      id: "deploy_approval",
      label: "部署审批 — 推送到 Shopify（可回滚）",
      requires_approval: true,
      approval_prompt: (ctx) => {
        const audit = readStepOutput<Record<string, unknown>>(ctx, "audit");
        const score = audit?.overall_score || "?";
        const fixes = ctx.log.filter(l => l.status === "completed").length;
        return `本次优化已完成 ${fixes} 项。店铺当前健康分 ${score}/100。审批后将把生成的内容部署到 Shopify（可通过版本回滚）。`;
      },
      inputs: () => ({}),
      skill_id: "store_health_audit",
      optional: true,
    },
  ],
};
