/**
 * Playbook: 每周内容包
 *
 * 一键生成一周全部社媒素材，按 40/40/20 配比：
 * - 教育类内容 × 2（穿搭教程 / 材质讲解）
 * - 产品种草 × 2（热销品 / 新品）
 * - 社区互动 × 1（UGC 征集）
 * 每个都带视频脚本 + 配图 + 标签策略
 */

import type { Playbook } from "../types";
import { supabase } from "../../supabase";

export const weeklyContentPackPlaybook: Playbook = {
  id: "weekly_content_pack",
  name: "一周社媒内容包",
  description: "按 40/40/20 研究配比生成一周 5 条社媒内容，含视频脚本+配图+标签",
  objective: "一次产出一整周的社媒素材，当天发得完全部",
  when_to_use: "每周一/每周日规划下周内容时运行",
  category: "content",
  icon: "Calendar",
  color: "pink",
  estimated_duration_seconds: 200,
  required_inputs: [
    { key: "platform", label: "主平台", type: "select", options: [
      { value: "tiktok", label: "TikTok" },
      { value: "instagram", label: "Instagram" },
      { value: "xiaohongshu", label: "小红书" },
      { value: "douyin", label: "抖音" },
    ], required: true },
    { key: "week_theme", label: "本周主题（可选）", type: "text", placeholder: "如：春季穿搭 / 显瘦系列" },
  ],
  steps: [
    // ── Step 1: 抓取本周应推产品（热销+新品） ───────────────
    {
      id: "select_products",
      label: "选品 — 抓出本周要推的热销和新品",
      handler: async (ctx) => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: orders } = await supabase
          .from("shopify_orders")
          .select("line_items")
          .gte("created_at", thirtyDaysAgo)
          .limit(300);

        const salesByPid: Record<string, number> = {};
        for (const o of orders || []) {
          for (const item of (o.line_items as Array<{ product_id?: string | number; quantity?: number }>) || []) {
            const pid = String(item.product_id || "");
            if (!pid) continue;
            salesByPid[pid] = (salesByPid[pid] || 0) + (item.quantity || 0);
          }
        }

        const topPids = Object.entries(salesByPid)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([pid]) => pid);

        const { data: topProducts } = await supabase
          .from("products")
          .select("id, name, price, category, body_html, tags, image_url, shopify_product_id")
          .in("shopify_product_id", topPids.filter(Boolean));

        const { data: newProducts } = await supabase
          .from("products")
          .select("id, name, price, category, body_html, tags, image_url, shopify_product_id")
          .order("created_at", { ascending: false })
          .limit(2);

        const hero = topProducts?.[0] || newProducts?.[0];
        const secondary = topProducts?.[1] || newProducts?.[1];
        const newOne = newProducts?.[0];

        ctx.decisions.selected_products = { hero, secondary, newOne };

        return {
          hero_product: hero,
          secondary_product: secondary,
          new_product: newOne,
          selection_rationale: `热销 TOP1: ${hero?.name || "无数据"} · TOP2: ${secondary?.name || "无数据"} · 最新: ${newOne?.name || "无数据"}`,
        };
      },
      inputs: () => ({}),
    },

    // ── Step 2: 内容日历（40/40/20 配比） ─────────────────────
    {
      id: "content_calendar",
      label: "生成内容日历 — 按教育/种草/社区 40/40/20 配比",
      skill_id: "content_calendar",
      inputs: (ctx) => ({
        platform: ctx.user_inputs.platform,
        campaign_theme: ctx.user_inputs.week_theme || "",
      }),
    },

    // ── Step 3: 并行生成 3 个视频脚本 ──────────────────────
    {
      id: "video_hero",
      label: "视频脚本 #1 — 热销 TOP1 种草（BAB 框架）",
      skill_id: "short_video_script",
      parallel_group: "video_scripts",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { hero?: Record<string, unknown> } | undefined;
        return {
          product: products?.hero,
          platform: ctx.user_inputs.platform,
          duration: "30s",
          style: "bab",
          hook_type: "benefit_promise",
        };
      },
      optional: true,
    },
    {
      id: "video_new",
      label: "视频脚本 #2 — 新品钩子悬念",
      skill_id: "short_video_script",
      parallel_group: "video_scripts",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { newOne?: Record<string, unknown> } | undefined;
        return {
          product: products?.newOne,
          platform: ctx.user_inputs.platform,
          duration: "15s",
          style: "hook_reveal",
          hook_type: "contrarian",
        };
      },
      optional: true,
    },
    {
      id: "video_tryon",
      label: "视频脚本 #3 — 试穿 Haul（最高转化格式）",
      skill_id: "short_video_script",
      parallel_group: "video_scripts",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { hero?: Record<string, unknown> } | undefined;
        return {
          product: products?.hero,
          platform: ctx.user_inputs.platform,
          duration: "60s",
          style: "try_on_haul",
          hook_type: "direct_address",
        };
      },
      optional: true,
    },

    // ── Step 4: 社媒帖子 + 标签并行 ────────────────────────
    {
      id: "social_posts",
      label: "社媒图文帖子包（5 条：教育2+产品2+社区1）",
      skill_id: "social_post_pack",
      parallel_group: "copy_assets",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { hero?: Record<string, unknown> } | undefined;
        return {
          product: products?.hero,
          platform: ctx.user_inputs.platform,
          campaign_theme: ctx.user_inputs.week_theme || "本周推荐",
        };
      },
    },
    {
      id: "hashtags",
      label: "本周标签策略（宽泛+垂直+微众 11 条公式）",
      skill_id: "hashtag_strategy",
      parallel_group: "copy_assets",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { hero?: Record<string, unknown> } | undefined;
        return {
          product: products?.hero,
          platform: ctx.user_inputs.platform,
        };
      },
      optional: true,
    },

    // ── Step 5: 并行生成 2 张配图 ───────────────────────────
    {
      id: "image_hero",
      label: "热销品配图 — 生活方式场景",
      skill_id: "ai_product_photo",
      parallel_group: "images",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { hero?: Record<string, unknown> } | undefined;
        return {
          product: products?.hero,
          photo_style: "lifestyle",
          aspect_ratio: ctx.user_inputs.platform === "instagram" ? "1:1" : "9:16",
        };
      },
      optional: true,
    },
    {
      id: "image_new",
      label: "新品配图 — 平铺摆拍",
      skill_id: "ai_product_photo",
      parallel_group: "images",
      inputs: (ctx) => {
        const products = ctx.decisions.selected_products as { newOne?: Record<string, unknown> } | undefined;
        return {
          product: products?.newOne,
          photo_style: "flat_lay",
          aspect_ratio: "1:1",
        };
      },
      optional: true,
    },
  ],
};
