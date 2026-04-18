import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { updateProductSEO, updateProductBodyHtml } from "@/lib/shopify-operations";
import { reviewContent } from "@/lib/content-qa";
import { productContentPipeline, socialContentPipeline, campaignPipeline } from "@/lib/content-pipeline";
import { createApprovalTask } from "@/lib/supabase-approval";

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

      return {
        action: "seo_updated",
        product: product.name,
        qa_score: qaScore,
        attempts,
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
      const { result } = await executeSkill("homepage_hero", {
        brand_name: "JOJOFEIFEI",
        season: "general",
      }, { sourceModule: "agent_pool" });
      return { action: "homepage_hero_generated", output: result.output };
    }

    case "new_product_content": {
      if (!task.target_product_id || !integrationId) return { skipped: true };
      const r = await productContentPipeline(task.target_product_id, integrationId);
      return r as unknown as Record<string, unknown>;
    }

    default:
      return { action: "unknown_task_type", type: task.task_type };
  }
}
