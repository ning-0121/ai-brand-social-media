/**
 * Campaign Composer
 *
 * 给一个活动概念（名字 + 主推商品 + 优惠 + 紧迫性），
 * 并行生成 5 件一致的套件：
 *   1. 活动落地页（Landing Page）
 *   2. 首页 Banner（图 + 文案）
 *   3. 3 条社媒帖子（Instagram / TikTok / 小红书）
 *   4. Hashtag 策略
 *   5. 短视频脚本
 *
 * 关键价值：所有 5 件都走同一个 BrandGuide，视觉/语气完全一致。
 */

import { executeSkill } from "./content-skills/executor";
import { supabase } from "./supabase";
import type { ProductLite } from "./content-skills/types";

export interface CampaignSpec {
  name: string;                     // 活动名 e.g. "春夏新品"
  goal: string;                     // purchase | email_signup | presale | brand_story
  product_id?: string;              // 主推商品 id
  headline_idea?: string;
  offer?: string;                   // 如 "限时 8 折"
  urgency?: string;                 // 如 "本周末结束"
  banner_size?: "ad_banner" | "wide_banner" | "promo_poster";
  /** 'B' 版会在 headline 和视觉方向上偏移 */
  variant_hint?: "A" | "B";
}

export interface CampaignResult {
  campaign_name: string;
  started_at: string;
  duration_ms: number;
  /** 落地页 prompt_runs.id — A/B winner 会据此回写 score */
  landing_prompt_run_id?: string | null;
  /** 顶级活动策划大师的战略蓝图（4 阶段计划、资产需求、风险、成功标准） */
  master_plan?: Record<string, unknown> | null;
  components: {
    landing_page?: { success: boolean; output?: Record<string, unknown>; error?: string };
    banner?: { success: boolean; output?: Record<string, unknown>; error?: string };
    social_posts?: Array<{ platform: string; success: boolean; output?: Record<string, unknown>; error?: string }>;
    hashtag_strategy?: { success: boolean; output?: Record<string, unknown>; error?: string };
    video_script?: { success: boolean; output?: Record<string, unknown>; error?: string };
  };
}

export async function composeCampaign(spec: CampaignSpec): Promise<CampaignResult> {
  const started = Date.now();
  const startedAt = new Date().toISOString();

  // Fetch product if specified
  let product: ProductLite | undefined;
  let productSold30d = 0;
  if (spec.product_id) {
    const { data } = await supabase.from("products").select("*").eq("id", spec.product_id).maybeSingle();
    if (data) {
      product = data as unknown as ProductLite;
      // 拉销量给活动策划专家参考
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: orders } = await supabase.from("shopify_orders")
        .select("line_items").gte("created_at", thirtyDaysAgo).limit(500);
      for (const o of orders || []) {
        const items = (o.line_items as Array<{ product_id?: number | string; quantity?: number }>) || [];
        for (const i of items) {
          if (String(i.product_id) === String((data as Record<string, unknown>).shopify_product_id)) {
            productSold30d += i.quantity || 0;
          }
        }
      }
    }
  }

  // Step 0: 调用活动策划专家产出战略蓝图（被下游 skill 当作指导思想）
  let masterPlan: Record<string, unknown> | null = null;
  try {
    const { tryRunPrompt } = await import("./prompts");
    masterPlan = await tryRunPrompt("expert.campaign.master", {
      campaign_name: spec.name,
      target_date: new Date().toISOString().split("T")[0],
      campaign_type: spec.goal === "presale" ? "新品首发" : spec.goal === "brand_story" ? "品牌活动" : "促销",
      product: {
        name: product?.name || "未指定",
        price: (product as unknown as { price?: number })?.price || "N/A",
        sold_30d: productSold30d,
      },
      offer: spec.offer || "无",
      urgency: spec.urgency || "无",
    }, { source: "campaign_composer" });
  } catch { /* 失败不阻塞 */ }

  // Variant B 时偏移 headline 方向：让 AI 用对立角度写
  const variantHint = spec.variant_hint === "B"
    ? `\n\nIMPORTANT — This is VARIANT B of an A/B test. Take the OPPOSITE angle from a typical ${spec.goal} page: emphasize transformation/outcome over features, use emotional hook instead of rational, scarcity over abundance, personal story over product specs.`
    : "";

  // 并行跑 5 个子任务
  const [landingRes, bannerRes, postIG, postTT, postXHS, hashtagRes, videoRes] = await Promise.allSettled([
    executeSkill("landing_page", {
      page_goal: spec.goal,
      product,
      headline_idea: (spec.headline_idea || spec.name) + variantHint,
      offer: spec.offer || "",
      urgency: spec.urgency || "",
    }, { sourceModule: "campaign_composer", productId: spec.product_id }),

    executeSkill("banner_design", {
      product,
      purpose: "campaign",
      template_id: spec.banner_size || "wide_banner",
      extra_info: `${spec.name} · ${spec.offer || ""} · ${spec.urgency || ""}`.trim(),
    }, { sourceModule: "campaign_composer", productId: spec.product_id }),

    executeSkill("social_post_pack", {
      product,
      platform: "instagram",
      angle: spec.name,
      extra: `${spec.offer || ""} ${spec.urgency || ""}`.trim(),
    }, { sourceModule: "campaign_composer", productId: spec.product_id }).catch(() => null),

    executeSkill("social_post_pack", {
      product,
      platform: "tiktok",
      angle: spec.name,
      extra: `${spec.offer || ""} ${spec.urgency || ""}`.trim(),
    }, { sourceModule: "campaign_composer", productId: spec.product_id }).catch(() => null),

    executeSkill("social_post_pack", {
      product,
      platform: "xiaohongshu",
      angle: spec.name,
      extra: `${spec.offer || ""} ${spec.urgency || ""}`.trim(),
    }, { sourceModule: "campaign_composer", productId: spec.product_id }).catch(() => null),

    executeSkill("hashtag_strategy", {
      product,
      platform: "instagram",
      audience: "",
    }, { sourceModule: "campaign_composer", productId: spec.product_id }),

    executeSkill("short_video_script", {
      product,
      platform: "tiktok",
      duration: "30s",
      style: "engaging",
    }, { sourceModule: "campaign_composer", productId: spec.product_id }),
  ]);

  const unwrap = (r: PromiseSettledResult<{ result: { output: Record<string, unknown> } } | null>) => {
    if (r.status === "rejected") return { success: false, error: String(r.reason).slice(0, 200) };
    if (!r.value) return { success: false, error: "skill returned null" };
    return { success: true, output: r.value.result.output };
  };

  const unwrapPost = (r: PromiseSettledResult<{ result: { output: Record<string, unknown> } } | null>, platform: string) => {
    const base = unwrap(r);
    return { platform, ...base };
  };

  // 捕获本次 compose 对应的 landing_page prompt_run_id（给 A/B 回流用）
  let landingPromptRunId: string | null = null;
  try {
    const { data: recentRun } = await supabase
      .from("prompt_runs")
      .select("id")
      .eq("prompt_slug", "page.landing")
      .gte("created_at", startedAt)
      .order("created_at", { ascending: false })
      .limit(1).maybeSingle();
    landingPromptRunId = recentRun?.id || null;
  } catch { /* silent */ }

  const result: CampaignResult = {
    campaign_name: spec.name,
    started_at: startedAt,
    duration_ms: Date.now() - started,
    landing_prompt_run_id: landingPromptRunId,
    master_plan: masterPlan,
    components: {
      landing_page: unwrap(landingRes),
      banner: unwrap(bannerRes),
      social_posts: [
        unwrapPost(postIG, "instagram"),
        unwrapPost(postTT, "tiktok"),
        unwrapPost(postXHS, "xiaohongshu"),
      ],
      hashtag_strategy: unwrap(hashtagRes),
      video_script: unwrap(videoRes),
    },
  };

  // 持久化活动记录
  await supabase.from("auto_ops_logs").insert({
    run_type: "campaign_compose",
    trigger_source: "manual",
    results_summary: result as unknown as Record<string, unknown>,
    duration_ms: result.duration_ms,
  });

  return result;
}
