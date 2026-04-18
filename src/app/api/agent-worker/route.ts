import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { updateProductSEO, updateProductBodyHtml, createDiscountCode, createShopifyPage } from "@/lib/shopify-operations";
import { callLLM } from "@/lib/content-skills/llm";
import { reviewContent } from "@/lib/content-qa";
import { productContentPipeline, socialContentPipeline, campaignPipeline } from "@/lib/content-pipeline";
import { createApprovalTask } from "@/lib/supabase-approval";
import { inngest } from "@/inngest/client";
import { recordSEOOutcome } from "@/lib/outcomes";
import { supabase as supabaseClient } from "@/lib/supabase";

function inngestEnabled(): boolean {
  return !!process.env.INNGEST_EVENT_KEY;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name || "unknown error";
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg = o.message || o.error || o.statusText || o.code;
    if (msg) return String(msg);
    try { return JSON.stringify(err).slice(0, 300); } catch { return "non-serializable error"; }
  }
  return String(err).slice(0, 300);
}

// 单个 worker 60s 限制，执行 1-4 个任务
export const maxDuration = 60;

interface DailyTask {
  id: string;
  task_type: string;
  title: string;
  description?: string;
  target_product_id?: string;
  target_product_name?: string;
  target_platform?: string;
  module: string;
  auto_executable: boolean;
}

export async function POST(request: Request) {
  // 简单 bearer 校验（避免外部滥用）
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET || "";
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task_ids } = await request.json();
  if (!Array.isArray(task_ids) || task_ids.length === 0) {
    return NextResponse.json({ error: "缺少 task_ids" }, { status: 400 });
  }

  // Shopify 集成
  const { data: integration } = await supabase
    .from("integrations").select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
  const integrationId = integration?.id || null;

  const startTime = Date.now();
  const WORKER_TIMEOUT = 55_000; // 给 response 留 5 秒
  const results: Array<{ task_id: string; status: string; result?: unknown; error?: string }> = [];

  for (const taskId of task_ids) {
    if (Date.now() - startTime > WORKER_TIMEOUT) {
      results.push({ task_id: taskId, status: "skipped_timeout" });
      continue;
    }

    try {
      const { data: task } = await supabase
        .from("ops_daily_tasks").select("*").eq("id", taskId).single();

      if (!task) {
        results.push({ task_id: taskId, status: "not_found" });
        continue;
      }

      // 标记 running
      await supabase.from("ops_daily_tasks")
        .update({ execution_status: "running", updated_at: new Date().toISOString() })
        .eq("id", taskId);

      const result = await executeSingleTask(task, integrationId);

      await supabase.from("ops_daily_tasks").update({
        execution_status: "auto_executed",
        execution_result: result,
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);

      results.push({ task_id: taskId, status: "success", result });
    } catch (err) {
      const errMsg = extractErrorMessage(err);
      await supabase.from("ops_daily_tasks").update({
        execution_status: "failed",
        execution_result: {
          error: errMsg,
          stack: err instanceof Error ? err.stack?.split("\n").slice(0, 3).join("\n") : null,
          timestamp: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
      results.push({ task_id: taskId, status: "failed", error: errMsg });
    }
  }

  return NextResponse.json({
    worker_duration_ms: Date.now() - startTime,
    processed: results.length,
    results,
  });
}

// 执行单个任务（从 ops-director 提取）
async function executeSingleTask(
  task: DailyTask,
  integrationId: string | null
): Promise<Record<string, unknown>> {
  switch (task.task_type) {
    case "seo_fix": {
      if (!task.target_product_id || !integrationId) return { skipped: true, reason: "no product or integration" };

      const { data: product } = await supabase
        .from("products").select("*").eq("id", task.target_product_id).single();
      if (!product?.shopify_product_id) return { skipped: true, reason: "no shopify product" };

      // Single-pass: skill now self-scores — no separate reviewContent call
      let seoData: Record<string, unknown> = {};
      let qaScore = 0;
      let attempts = 0;

      for (let i = 0; i < 2; i++) {
        attempts++;
        const inputs: Record<string, unknown> = { product };
        if (i > 0) inputs.qa_feedback = `Score was ${qaScore}/100, regenerate with higher quality`;
        const { result } = await executeSkill("product_seo_optimize", inputs, { sourceModule: "agent_pool" });
        seoData = result.output as Record<string, unknown>;
        qaScore = (seoData.qa_score as number) || 75;
        if (qaScore >= 75) break;
      }

      if (qaScore < 65) {
        return { action: "qa_rejected", product: product.name, score: qaScore, attempts };
      }

      await updateProductSEO(integrationId, product.shopify_product_id, product.id, {
        meta_title: seoData.meta_title as string,
        meta_description: seoData.meta_description as string,
        body_html: seoData.body_html as string,
        tags: seoData.tags as string,
      });

      // 记录效果基线 — 7 天后 daily cron 自动测量真实 SEO 分变化
      let outcomeId: string | null = null;
      try {
        const { data: latestRun } = await supabaseClient
          .from("prompt_runs").select("id, prompt_version")
          .eq("prompt_slug", "product.seo.optimize")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const r = await recordSEOOutcome({
          productId: product.id,
          productName: product.name,
          promptSlug: "product.seo.optimize",
          promptRunId: latestRun?.id,
          promptVersion: latestRun?.prompt_version,
        });
        outcomeId = r?.outcome_id || null;
      } catch { /* outcome tracking failure doesn't block task */ }

      return {
        action: "seo_updated",
        product: product.name,
        qa_score: qaScore,
        attempts,
        outcome_id: outcomeId,
        preview: {
          meta_title: seoData.meta_title,
          meta_description: seoData.meta_description,
          tags: seoData.tags,
        },
      };
    }

    case "detail_page": {
      if (!task.target_product_id || !integrationId) return { skipped: true };
      const { data: product } = await supabase
        .from("products").select("*").eq("id", task.target_product_id).single();
      if (!product?.shopify_product_id) return { skipped: true };

      let pageData: Record<string, unknown> = {};
      let dpQaScore = 0;
      let dpFeedback = "";

      for (let i = 0; i < 2; i++) {
        const inputs: Record<string, unknown> = { product };
        if (dpFeedback) inputs.qa_feedback = dpFeedback;
        const { result } = await executeSkill("product_detail_page", inputs, { sourceModule: "agent_pool" });
        pageData = result.output as Record<string, unknown>;
        const qa = await reviewContent("detail_page", pageData, { name: product.name, category: product.category });
        dpQaScore = qa.score;
        if (qa.passed) break;
        dpFeedback = qa.improvements.join("; ");
      }

      if (dpQaScore < 70) return { action: "qa_rejected", product: product.name, score: dpQaScore };

      if (pageData.description) {
        await updateProductBodyHtml(integrationId, product.shopify_product_id, product.id, pageData.description as string);
      }
      return { action: "detail_page_updated", product: product.name, qa_score: dpQaScore, preview: pageData };
    }

    case "post": {
      const r = await socialContentPipeline(task.target_product_id || null, task.target_platform || "instagram");
      return r as unknown as Record<string, unknown>;
    }

    case "engage": {
      const { result } = await executeSkill("ugc_response", {
        product: task.target_product_id ? { id: task.target_product_id, name: task.target_product_name || "" } : undefined,
        platform: task.target_platform || "instagram",
        context: task.description || "",
      }, { sourceModule: "agent_pool" });
      return { action: "engage_content_generated", output: result.output };
    }

    case "hashtag_strategy": {
      const { result } = await executeSkill("hashtag_strategy", {
        product: task.target_product_id ? { id: task.target_product_id, name: task.target_product_name || "" } : undefined,
        platform: task.target_platform || "instagram",
      }, { sourceModule: "agent_pool" });
      return { action: "hashtag_strategy_generated", output: result.output };
    }

    case "short_video_script": {
      const { result } = await executeSkill("short_video_script", {
        product: task.target_product_id ? { id: task.target_product_id, name: task.target_product_name || "" } : undefined,
        platform: task.target_platform || "tiktok",
        style: "种草",
      }, { sourceModule: "agent_pool" });
      return { action: "video_script_generated", output: result.output };
    }

    case "landing_page": {
      if (!integrationId) {
        // 不能直接执行 → 创建审批任务
        const approval = await createApprovalTask({
          type: "products",
          title: `[AI 运营] ${task.title}`,
          description: task.description || "",
          payload: { ops_task_id: task.id, task_type: task.task_type, module: task.module },
        });
        return { action: "approval_created", approval_id: approval.id };
      }
      const r = await campaignPipeline(task.description || "Campaign", [], integrationId);
      return r as unknown as Record<string, unknown>;
    }

    case "homepage_update": {
      // If Inngest enabled, dispatch to DAG (doesn't block worker)
      if (inngestEnabled()) {
        await inngest.send({
          name: "content/homepage.hero.requested",
          data: { brand_name: "JOJOFEIFEI", season: "general", ops_task_id: task.id },
        });
        return { action: "dispatched_to_inngest", event: "content/homepage.hero.requested" };
      }
      const { result } = await executeSkill("homepage_hero", {
        brand_name: "JOJOFEIFEI",
        season: "general",
      }, { sourceModule: "agent_pool" });
      return { action: "homepage_hero_generated", output: result.output };
    }

    case "new_product_content": {
      if (!task.target_product_id || !integrationId) return { skipped: true };
      // Heavy pipeline — always go through Inngest when available to avoid 60s timeout
      if (inngestEnabled()) {
        await inngest.send({
          name: "content/product.full.requested",
          data: {
            product_id: task.target_product_id,
            integration_id: integrationId,
            ops_task_id: task.id,
          },
        });
        return { action: "dispatched_to_inngest", event: "content/product.full.requested" };
      }
      const r = await productContentPipeline(task.target_product_id, integrationId);
      return r as unknown as Record<string, unknown>;
    }

    case "discount_create": {
      if (!integrationId) return { skipped: true, reason: "no integration" };
      // 生成一个随机码 + 默认 15% 折扣，7 天有效
      const code = `AI${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      let shopifyProductId: number | undefined;
      if (task.target_product_id) {
        const { data: p } = await supabaseClient.from("products")
          .select("shopify_product_id").eq("id", task.target_product_id).maybeSingle();
        shopifyProductId = p?.shopify_product_id || undefined;
      }
      const endsAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const r = await createDiscountCode(integrationId, {
        code,
        value: 15,
        value_type: "percentage",
        ends_at: endsAt,
        usage_limit: 200,
        applies_to_product_id: shopifyProductId,
        title: `AI Auto-Discount — ${task.title}`,
      });
      return {
        action: "discount_created",
        code: r.code,
        value: "15%",
        ends_at: endsAt,
        price_rule_id: r.price_rule_id,
        applies_to: task.target_product_name || "整店",
      };
    }

    case "bundle_page": {
      if (!integrationId || !task.target_product_id) return { skipped: true, reason: "缺主商品或集成" };
      // 拉主商品 + 另一热销做搭配
      const { data: mainP } = await supabaseClient.from("products")
        .select("*").eq("id", task.target_product_id).maybeSingle();
      if (!mainP) return { skipped: true, reason: "找不到主商品" };

      // 找一个热销品搭配（简化：取近 30 天有销量的随机 2 个）
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: recentOrders } = await supabaseClient.from("shopify_orders")
        .select("line_items").gte("created_at", thirtyDaysAgo).limit(200);
      const soldIds = new Set<string>();
      for (const o of recentOrders || []) {
        const items = (o.line_items as Array<{ product_id?: number | string }>) || [];
        for (const i of items) if (i.product_id) soldIds.add(String(i.product_id));
      }
      const { data: bundlePartners } = await supabaseClient.from("products")
        .select("id, name, price, image_url, shopify_product_id")
        .neq("id", task.target_product_id)
        .in("shopify_product_id", Array.from(soldIds).slice(0, 50))
        .limit(2);

      // LLM 生成 bundle HTML
      const bundleOutput = await callLLM(
        `Generate a Shopify bundle cross-sell page HTML (inline CSS, Shopify-ready). Highlight savings when bought together. Return JSON: { "title": "...", "body_html": "<div>...</div>" }`,
        `Main product: ${mainP.name} ($${mainP.price})
Bundle partners: ${(bundlePartners || []).map(p => `${p.name} ($${p.price})`).join(", ")}
Suggested bundle price: 10% off total

Generate the cross-sell page.`,
        3500,
        "complex"
      );
      const bodyHtml = (bundleOutput.body_html as string) || `<h1>${mainP.name} Bundle</h1>`;
      const title = (bundleOutput.title as string) || `${mainP.name} Bundle`;

      const page = await createShopifyPage(integrationId, title, bodyHtml);
      return {
        action: "bundle_page_created",
        page_id: page.page_id,
        handle: page.handle,
        main_product: mainP.name,
        bundle_partners: (bundlePartners || []).map(p => p.name),
        output: { body_html: bodyHtml, title },
      };
    }

    case "winback_email": {
      // 弃购挽回邮件文案 — 目前只生成内容，需要用户接入邮件发送后自动触发
      const out = await callLLM(
        `You write win-back emails for abandoned carts. Return JSON: { "subject_a": "variant A", "subject_b": "variant B", "preview_text": "...", "body_html": "<div>...</div>", "cta_text": "..." }`,
        `Brand: JOJOFEIFEI athletic wear
Abandoned product: ${task.target_product_name || "recent item"}
Offer: 10% off for 24 hours with code WINBACK10
Goal: recover cart

Write 2 subject line variants + email HTML.`,
        2500,
        "balanced"
      );
      return {
        action: "winback_email_generated",
        output: out,
        note: "邮件内容已生成，需接入邮件服务（Klaviyo/Mailchimp）才能自动发送",
      };
    }

    default:
      return { action: "unknown_task_type", type: task.task_type };
  }
}
