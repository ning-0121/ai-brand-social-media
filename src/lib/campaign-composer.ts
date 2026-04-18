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
  if (spec.product_id) {
    const { data } = await supabase.from("products").select("*").eq("id", spec.product_id).maybeSingle();
    if (data) product = data as unknown as ProductLite;
  }

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

  const result: CampaignResult = {
    campaign_name: spec.name,
    started_at: startedAt,
    duration_ms: Date.now() - started,
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
