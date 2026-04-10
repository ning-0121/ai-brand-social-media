import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { onApprovalDecision } from "@/lib/workflow-engine";
import {
  updateProductSEO,
  updateProductInfo,
  updateProductPrice,
  updateProductInventory,
} from "@/lib/shopify-operations";
import { requireAuth } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit-logger";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function executeTask(task: {
  type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
}) {
  const { type, entity_id, payload } = task;
  const integrationId = payload.integration_id as string;
  const shopifyProductId = payload.shopify_product_id as number;
  const shopifyVariantId = payload.shopify_variant_id as number;
  const newValues = payload.new_values as Record<string, unknown>;

  switch (type) {
    case "seo_update": {
      if (!integrationId || !shopifyProductId || !entity_id) {
        throw new Error(
          `缺少 Shopify 连接信息：integration_id=${!!integrationId}, shopify_product_id=${!!shopifyProductId}, entity_id=${!!entity_id}`
        );
      }
      return await updateProductSEO(
        integrationId,
        shopifyProductId,
        entity_id,
        newValues as {
          title?: string;
          body_html?: string;
          meta_title?: string;
          meta_description?: string;
          tags?: string;
        }
      );
    }

    case "product_edit": {
      if (!integrationId || !shopifyProductId || !entity_id) {
        throw new Error("缺少 Shopify 连接信息");
      }
      return await updateProductInfo(
        integrationId,
        shopifyProductId,
        entity_id,
        newValues as { title?: string; body_html?: string; product_type?: string; tags?: string }
      );
    }

    case "price_update": {
      if (!integrationId || !shopifyVariantId || !entity_id) {
        throw new Error("缺少 Shopify 连接信息");
      }
      return await updateProductPrice(
        integrationId,
        shopifyVariantId,
        entity_id,
        newValues.price as number
      );
    }

    case "inventory_update": {
      if (!integrationId || !shopifyVariantId || !entity_id) {
        throw new Error("缺少 Shopify 连接信息");
      }
      return await updateProductInventory(
        integrationId,
        shopifyVariantId,
        entity_id,
        newValues.quantity as number
      );
    }

    case "content_publish": {
      if (entity_id) {
        await supabase
          .from("contents")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", entity_id);
      }
      // For workflow approvals, entity_id may be null — just approve the step
      return { success: true, message: "已批准" };
    }

    case "social_post": {
      if (!entity_id) throw new Error("缺少发布 ID");
      await supabase
        .from("scheduled_posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", entity_id);
      return { success: true, message: "社媒内容已发布" };
    }

    default:
      throw new Error(`未知任务类型: ${type}`);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "approve": {
        const { id, reviewed_by = "user" } = params;
        if (!id) return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });

        // Get the task
        const { data: task, error: fetchErr } = await supabase
          .from("approval_tasks")
          .select("*")
          .eq("id", id)
          .single();
        if (fetchErr || !task)
          return NextResponse.json({ error: "未找到任务" }, { status: 404 });
        if (task.status !== "pending" && task.status !== "failed")
          return NextResponse.json({ error: "任务状态不允许审批" }, { status: 400 });

        // Mark as approved
        await supabase
          .from("approval_tasks")
          .update({
            status: "approved",
            reviewed_by,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id);

        // Execute
        try {
          const result = await executeTask(task);
          await supabase
            .from("approval_tasks")
            .update({ status: "executed", execution_result: result })
            .eq("id", id);

          // Advance workflow if linked
          if (task.workflow_task_id) {
            try { await onApprovalDecision(task.workflow_task_id, "approved"); } catch (e) { console.error("Workflow advance error:", e); }
          }

          // Update diagnostic finding status if linked
          if (task.payload?.diagnostic_finding_id) {
            try {
              await supabase
                .from("diagnostic_findings")
                .update({ status: "resolved", updated_at: new Date().toISOString() })
                .eq("id", task.payload.diagnostic_finding_id);
            } catch (e) { console.error("Diagnostic finding update error:", e); }
          }

          // Execute workflow-specific post-approval actions
          if (task.payload?.workflow === "product_page_workflow" && task.payload?.new_values) {
            try {
              const { deployProductPage } = await import("@/agents/workflows/product-page-workflow");
              await deployProductPage(
                task.payload.integration_id as string,
                task.payload.shopify_product_id as number,
                task.payload.product_id as string,
                task.payload.new_values as { body_html: string; meta_title?: string; meta_description?: string; tags?: string }
              );
              // Writeback: mark project + agent task as published
              await supabase.from("creative_projects")
                .update({ status: "published", updated_at: new Date().toISOString() })
                .eq("approval_id", id);
              await supabase.from("agent_tasks_v2")
                .update({ status: "executed", updated_at: new Date().toISOString() })
                .eq("approval_id", id);
            } catch (e) { console.error("Product page deploy error:", e); }
          }

          if (task.payload?.workflow === "content_publish_workflow" && task.payload?.content_items) {
            try {
              const { publishContentToQueue } = await import("@/agents/workflows/content-publish-workflow");
              await publishContentToQueue(
                task.payload.content_items as Array<{ content_type: string; platform: string; title: string; body: string; hashtags?: string[]; skill_used: string }>,
                task.payload.product_id as string || "",
                task.payload.product_name as string || "",
                id
              );
              // Writeback: mark agent task as executed (content is queued, not yet published)
              await supabase.from("agent_tasks_v2")
                .update({ status: "executed", updated_at: new Date().toISOString() })
                .eq("approval_id", id);
            } catch (e) { console.error("Content queue error:", e); }
          }

          if (task.payload?.workflow === "campaign_pack_workflow" && task.payload?.project_id) {
            try {
              await supabase.from("creative_projects").update({ status: "approved" }).eq("id", task.payload.project_id);
              // Generate remaining assets (social + email copy) and create export
              const { generateAndExportCampaignPack } = await import("@/agents/workflows/campaign-pack-workflow");
              await generateAndExportCampaignPack(
                task.payload.project_id as string,
                task.payload.campaign_name as string || "Campaign",
                task.payload.assets as Record<string, unknown> || {}
              );
              // Writeback
              await supabase.from("agent_tasks_v2")
                .update({ status: "executed", updated_at: new Date().toISOString() })
                .eq("approval_id", id);
            } catch (e) { console.error("Campaign export error:", e); }
          }

          logAudit({
            actorType: "user",
            actorId: auth.userId,
            actionType: "approval.approve",
            targetType: "approval_task",
            targetId: id,
            requestPayload: { task_type: task.type, entity_id: task.entity_id },
            responsePayload: result as Record<string, unknown>,
            status: "success",
          });

          return NextResponse.json({ success: true, status: "executed", result });
        } catch (execErr: unknown) {
          const errMsg = execErr instanceof Error ? execErr.message : "执行失败";
          await supabase
            .from("approval_tasks")
            .update({
              status: "failed",
              execution_result: { error: errMsg },
            })
            .eq("id", id);

          logAudit({
            actorType: "user",
            actorId: auth.userId,
            actionType: "approval.approve",
            targetType: "approval_task",
            targetId: id,
            status: "failed",
            error: errMsg,
          });

          return NextResponse.json({
            success: false,
            status: "failed",
            error: errMsg,
          });
        }
      }

      case "reject": {
        const { id, reviewed_by = "user" } = params;
        if (!id) return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });

        await supabase
          .from("approval_tasks")
          .update({
            status: "rejected",
            reviewed_by,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id);

        logAudit({
          actorType: "user",
          actorId: auth.userId,
          actionType: "approval.reject",
          targetType: "approval_task",
          targetId: id,
          status: "success",
        });

        return NextResponse.json({ success: true, status: "rejected" });
      }

      case "retry": {
        const { id } = params;
        if (!id) return NextResponse.json({ error: "缺少任务 ID" }, { status: 400 });

        const { data: task, error: fetchErr } = await supabase
          .from("approval_tasks")
          .select("*")
          .eq("id", id)
          .single();
        if (fetchErr || !task)
          return NextResponse.json({ error: "未找到任务" }, { status: 404 });
        if (task.status !== "failed")
          return NextResponse.json({ error: "只能重试失败的任务" }, { status: 400 });

        try {
          const result = await executeTask(task);
          await supabase
            .from("approval_tasks")
            .update({ status: "executed", execution_result: result })
            .eq("id", id);
          return NextResponse.json({ success: true, status: "executed", result });
        } catch (execErr: unknown) {
          const errMsg = execErr instanceof Error ? execErr.message : "重试失败";
          await supabase
            .from("approval_tasks")
            .update({ execution_result: { error: errMsg, retried_at: new Date().toISOString() } })
            .eq("id", id);
          return NextResponse.json({ success: false, status: "failed", error: errMsg });
        }
      }

      case "create": {
        const { task } = params;
        if (!task || !task.title || !task.type) {
          return NextResponse.json({ error: "缺少任务信息" }, { status: 400 });
        }

        const { data: created, error: createErr } = await supabase
          .from("approval_tasks")
          .insert({
            type: task.type,
            entity_id: task.entity_id || null,
            entity_type: task.entity_type || null,
            title: task.title,
            description: task.description || null,
            payload: task.payload || {},
            status: "pending",
            created_by: task.created_by || "ai",
          })
          .select()
          .single();

        if (createErr) {
          return NextResponse.json({ error: createErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, task: created });
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Approval API error:", error);
    const message = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
