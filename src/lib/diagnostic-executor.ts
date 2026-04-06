import { supabase } from "./supabase";
import { createApprovalTask } from "./supabase-approval";
import { executeAgent } from "./agent-executor";
import type { DiagnosticFinding, AffectedEntity } from "./diagnostic-types";

// 获取用户的 Shopify integration_id
async function getIntegrationId(): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("id")
    .eq("platform", "shopify")
    .limit(1)
    .single();
  return data?.id || null;
}

// 根据 entity_id 获取商品的 shopify_product_id 和 shopify_variant_id
async function getProductShopifyIds(entityId: string) {
  const { data } = await supabase
    .from("products")
    .select("shopify_product_id, shopify_variant_id, name, body_html, meta_title, meta_description, tags")
    .eq("id", entityId)
    .single();
  return data;
}

export async function executeFinding(
  findingId: string
): Promise<{ type: "approval_task" | "workflow_instance"; id: string }> {
  const { data: finding, error } = await supabase
    .from("diagnostic_findings")
    .select("*")
    .eq("id", findingId)
    .single();

  if (error || !finding) {
    throw new Error(`找不到诊断发现: ${findingId}`);
  }

  const f = finding as DiagnosticFinding;
  const action = f.recommended_action;

  if (action.action_type === "info_only") {
    throw new Error("此发现仅供参考，无法自动执行");
  }

  const integrationId = await getIntegrationId();

  // 对于 SEO 类问题：先调用 Agent 生成优化方案，再创建带有具体 new_values 的审批任务
  if (action.action_type === "seo_update" && f.affected_entities.length > 0) {
    return await executeSeoFinding(f, integrationId);
  }

  // 对于内容类问题：创建审批任务，审批后调用内容生成
  if (action.action_type === "content_publish" || action.action_type === "workflow_launch") {
    return await executeContentFinding(f, integrationId);
  }

  // 其他类型：创建通用审批任务
  const firstEntity = f.affected_entities[0];
  const productInfo = firstEntity ? await getProductShopifyIds(firstEntity.entity_id) : null;

  const approval = await createApprovalTask({
    type: mapActionToApprovalType(action.action_type),
    entity_id: firstEntity?.entity_id,
    entity_type: "product",
    title: `[诊断] ${f.title}`,
    description: `${f.description}\n\n影响商品: ${f.affected_entities.map((e) => e.name).join(", ")}`,
    payload: {
      diagnostic_finding_id: f.id,
      action_type: action.action_type,
      integration_id: integrationId,
      shopify_product_id: productInfo?.shopify_product_id,
      shopify_variant_id: productInfo?.shopify_variant_id,
      affected_entities: f.affected_entities,
    },
  });

  await updateFindingStatus(findingId, "approval_task", approval.id);
  return { type: "approval_task", id: approval.id };
}

// SEO 修复：调用 Agent 生成优化文案 → 创建带 new_values 的审批任务
async function executeSeoFinding(
  f: DiagnosticFinding,
  integrationId: string | null
): Promise<{ type: "approval_task"; id: string }> {
  const entity = f.affected_entities[0];
  const productInfo = entity ? await getProductShopifyIds(entity.entity_id) : null;

  // 调用 store_optimizer agent 生成 SEO 优化方案
  let newValues: Record<string, unknown> = {};
  try {
    const agentResult = await executeAgent("store_optimizer", "seo_apply", {
      product_name: entity?.name || "",
      body_html: productInfo?.body_html || "",
    }, {});
    // agentResult 应该包含 title, body_html, meta_title, meta_description, tags
    newValues = agentResult;
  } catch (err) {
    console.error("Agent SEO 生成失败:", err);
    // 即使 agent 失败也创建审批任务，让用户手动处理
  }

  const approval = await createApprovalTask({
    type: "seo_update",
    entity_id: entity?.entity_id,
    entity_type: "product",
    title: `[诊断] ${f.title}`,
    description: `AI 已生成 SEO 优化方案，审批后将自动应用到 Shopify。\n\n影响商品: ${f.affected_entities.map((e) => e.name).join(", ")}`,
    payload: {
      diagnostic_finding_id: f.id,
      integration_id: integrationId,
      shopify_product_id: productInfo?.shopify_product_id,
      old_values: {
        title: productInfo?.name,
        body_html: productInfo?.body_html,
        meta_title: productInfo?.meta_title,
        meta_description: productInfo?.meta_description,
        tags: productInfo?.tags,
      },
      new_values: newValues,
    },
  });

  await updateFindingStatus(f.id, "approval_task", approval.id);
  return { type: "approval_task", id: approval.id };
}

// 内容修复：调用 content_producer 生成内容 → 创建审批任务
async function executeContentFinding(
  f: DiagnosticFinding,
  integrationId: string | null
): Promise<{ type: "approval_task"; id: string }> {
  const entityNames = f.affected_entities.map((e) => e.name).join(", ");

  // 调用 content_producer 生成内容
  let contentResult: Record<string, unknown> = {};
  try {
    contentResult = await executeAgent("content_producer", "content_package", {
      topic: `为以下商品创建营销内容: ${entityNames}`,
      platform: "shopify",
    }, {});
  } catch (err) {
    console.error("Agent 内容生成失败:", err);
  }

  const approval = await createApprovalTask({
    type: "content_publish",
    entity_id: f.affected_entities[0]?.entity_id,
    entity_type: "product",
    title: `[诊断] ${f.title}`,
    description: `AI 已生成内容方案。\n\n${contentResult.title || ""}\n${contentResult.body || ""}\n\n影响商品: ${entityNames}`,
    payload: {
      diagnostic_finding_id: f.id,
      integration_id: integrationId,
      content: contentResult,
      affected_entities: f.affected_entities,
    },
  });

  await updateFindingStatus(f.id, "approval_task", approval.id);
  return { type: "approval_task", id: approval.id };
}

async function updateFindingStatus(findingId: string, refType: string, refId: string) {
  await supabase
    .from("diagnostic_findings")
    .update({
      status: "in_progress",
      execution_ref: { type: refType, id: refId },
      updated_at: new Date().toISOString(),
    })
    .eq("id", findingId);
}

export async function dismissFinding(findingId: string): Promise<void> {
  await supabase
    .from("diagnostic_findings")
    .update({
      status: "dismissed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", findingId);
}

function mapActionToApprovalType(actionType: string): string {
  switch (actionType) {
    case "seo_update": return "seo_update";
    case "product_edit": return "product_edit";
    case "inventory_update": return "inventory_update";
    case "content_publish": return "content_publish";
    default: return "product_edit";
  }
}
