import { supabase } from "./supabase";
import { createApprovalTask } from "./supabase-approval";
import { executeAgent } from "./agent-executor";
import type { DiagnosticFinding } from "./diagnostic-types";

export interface ExecutionResult {
  type: "approval_task" | "workflow_instance";
  id: string;
  generated_content?: Record<string, unknown>;
}

async function getIntegrationId(): Promise<string | null> {
  const { data } = await supabase
    .from("integrations")
    .select("id")
    .eq("platform", "shopify")
    .limit(1)
    .single();
  return data?.id || null;
}

async function getProductInfo(entityId: string) {
  const { data } = await supabase
    .from("products")
    .select("shopify_product_id, shopify_variant_id, name, body_html, meta_title, meta_description, tags")
    .eq("id", entityId)
    .single();
  return data;
}

export async function executeFinding(findingId: string): Promise<ExecutionResult> {
  const { data: finding, error } = await supabase
    .from("diagnostic_findings")
    .select("*")
    .eq("id", findingId)
    .single();

  if (error || !finding) throw new Error(`找不到诊断发现: ${findingId}`);

  const f = finding as DiagnosticFinding;
  const action = f.recommended_action;

  if (action.action_type === "info_only") {
    throw new Error("此发现仅供参考，无法自动执行");
  }

  const integrationId = await getIntegrationId();

  if (action.action_type === "seo_update" && f.affected_entities.length > 0) {
    return await executeSeoFinding(f, integrationId);
  }

  if (action.action_type === "content_publish" || action.action_type === "workflow_launch") {
    return await executeContentFinding(f, integrationId);
  }

  // 其他类型 → 生成通用行动方案
  return await executeGenericFinding(f, integrationId);
}

// SEO 修复 — 处理 finding 中第一个有效商品（避免 Vercel 10s 超时）
// 后续商品由 ops-director 的 dailyTasks 逐日处理
async function executeSeoFinding(f: DiagnosticFinding, integrationId: string | null): Promise<ExecutionResult> {
  if (!integrationId) {
    throw new Error("未连接 Shopify 店铺，无法执行 SEO 优化");
  }
  if (!f.affected_entities || f.affected_entities.length === 0) {
    throw new Error("此 finding 没有关联的商品，无法执行");
  }

  // Pick the first valid product to stay within timeout
  let productInfo = null;
  let entity = null;
  for (const e of f.affected_entities) {
    const info = await getProductInfo(e.entity_id);
    if (info?.shopify_product_id) {
      productInfo = info;
      entity = e;
      break;
    }
  }

  if (!productInfo || !entity) {
    throw new Error("未找到有效的 Shopify 商品");
  }

  // Dedup: skip if this product already has a recent SEO task (within 24h)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingTask } = await supabase
    .from("approval_tasks")
    .select("id, status")
    .eq("type", "seo_update")
    .eq("entity_id", entity.entity_id)
    .gte("created_at", oneDayAgo)
    .in("status", ["pending", "approved", "executed"])
    .limit(1)
    .single();

  if (existingTask) {
    return {
      type: "approval_task",
      id: existingTask.id,
      generated_content: { skipped: true, reason: "该商品 24h 内已有 SEO 优化任务" },
    };
  }

  const missingFields: string[] = [];
  if (!productInfo.meta_title) missingFields.push("meta_title");
  if (!productInfo.meta_description) missingFields.push("meta_description");
  if (!productInfo.body_html || productInfo.body_html.length < 50) missingFields.push("body_html");
  if (!productInfo.tags) missingFields.push("tags");

  const generated = await executeAgent(
    "store_optimizer",
    "seo_apply",
    {
      product_name: productInfo.name || entity.name,
      body_html: productInfo.body_html || "",
      missing_fields: missingFields.join(", ") || "全部 SEO 字段",
      finding_context: f.title + " - " + (f.description || ""),
    },
    {}
  );

  const newValues: Record<string, unknown> = {};
  if (generated.title) newValues.title = generated.title;
  if (generated.body_html) newValues.body_html = generated.body_html;
  if (generated.meta_title) newValues.meta_title = generated.meta_title;
  if (generated.meta_description) newValues.meta_description = generated.meta_description;
  if (generated.tags) newValues.tags = generated.tags;

  if (Object.keys(newValues).length === 0) {
    throw new Error("AI 未能生成有效的 SEO 方案");
  }

  const approval = await createApprovalTask({
    type: "seo_update",
    entity_id: entity.entity_id,
    entity_type: "products",
    title: `[SEO] ${productInfo.name}`,
    description: `${f.title}\n\n${formatGeneratedContent("SEO 优化方案", generated, f)}\n\n(共 ${f.affected_entities.length} 个商品需优化，本次先处理 1 个，其余由 AI 自动运营引擎逐日处理)`,
    payload: {
      diagnostic_finding_id: f.id,
      integration_id: integrationId,
      shopify_product_id: productInfo.shopify_product_id,
      old_values: {
        title: productInfo.name,
        body_html: productInfo.body_html,
        meta_title: productInfo.meta_title,
        meta_description: productInfo.meta_description,
        tags: productInfo.tags,
      },
      new_values: newValues,
      remaining_products: f.affected_entities.length - 1,
    },
  });

  const summaryPayload = {
    products_processed: 1,
    total_affected: f.affected_entities.length,
    product: productInfo.name,
    generated: newValues,
  } as Record<string, unknown>;
  await updateFindingStatus(f.id, approval.id, summaryPayload);

  return {
    type: "approval_task",
    id: approval.id,
    generated_content: summaryPayload,
  };
}

// 内容推广 — 生成社媒内容 + 产品描述充实，审批后进入发布队列
async function executeContentFinding(f: DiagnosticFinding, integrationId: string | null): Promise<ExecutionResult> {
  // Pick the first product to generate content for (avoid timeout)
  const entity = f.affected_entities[0];
  if (!entity) {
    throw new Error("此 finding 没有关联的商品");
  }

  const productInfo = await getProductInfo(entity.entity_id);
  const productName = productInfo?.name || entity.name;
  const productImage = productInfo ? (productInfo as Record<string, unknown>).image_url as string | null : null;

  // 1. Generate social media content (Instagram-focused, works with existing publisher)
  let generated: Record<string, unknown> = {};
  try {
    generated = await executeAgent("content_producer", "content_package", {
      topic: `为热销商品「${productName}」创建 Instagram 推广内容。要求：吸引人的文案、产品卖点突出、包含行动号召和话题标签。`,
      platform: "instagram",
    }, {});
  } catch (err) {
    console.error("Agent 内容生成失败:", err);
  }

  // 2. Build content items in the format expected by publishContentToQueue
  const contentItems: Array<{
    content_type: string;
    platform: string;
    title: string;
    body: string;
    hashtags?: string[];
    skill_used: string;
    image_url?: string;
  }> = [];

  // Instagram post
  const igTitle = (generated.title as string) || `${productName} 新品推荐`;
  const igBody = (generated.body as string) || "";
  const igHashtags = (generated.hashtags as string[]) || [];

  if (igBody) {
    contentItems.push({
      content_type: "instagram_caption",
      platform: "instagram",
      title: igTitle,
      body: igBody,
      hashtags: igHashtags,
      skill_used: "content_package",
      image_url: productImage || undefined,
    });
  }

  // Facebook post (reuse IG content, works with existing publisher)
  if (igBody) {
    contentItems.push({
      content_type: "facebook_post",
      platform: "facebook",
      title: igTitle,
      body: igBody,
      hashtags: igHashtags,
      skill_used: "content_package",
      image_url: productImage || undefined,
    });
  }

  // 3. Also generate product page enrichment if body_html is thin
  let seoEnrichment: Record<string, unknown> | null = null;
  if (integrationId && productInfo?.shopify_product_id && (!productInfo.body_html || productInfo.body_html.length < 200)) {
    try {
      seoEnrichment = await executeAgent("store_optimizer", "seo_apply", {
        product_name: productName,
        body_html: productInfo.body_html || "",
        missing_fields: "body_html",
        finding_context: `热销商品描述过短，需要充实内容以提升转化率`,
      }, {});
    } catch (err) {
      console.error("SEO 充实内容生成失败:", err);
    }
  }

  const description = [
    `AI 为「${productName}」生成了 ${contentItems.length} 条社媒推广内容`,
    contentItems.map(i => `- ${i.platform}: ${i.title}`).join("\n"),
    seoEnrichment ? "\n同时生成了产品页描述优化方案" : "",
    `\n\n审批后：社媒内容将进入发布队列${seoEnrichment ? "，产品描述将更新到 Shopify" : ""}`,
    `\n\n(共 ${f.affected_entities.length} 个商品需推广，本次处理「${productName}」)`,
  ].filter(Boolean).join("\n");

  const approval = await createApprovalTask({
    type: "content_publish",
    entity_id: entity.entity_id,
    entity_type: "products",
    title: `[诊断] ${f.title} — ${productName}`,
    description,
    payload: {
      diagnostic_finding_id: f.id,
      // This flag tells the approval handler to route to publishContentToQueue
      workflow: "content_publish_workflow",
      product_id: entity.entity_id,
      product_name: productName,
      integration_id: integrationId,
      content_items: contentItems,
      seo_enrichment: seoEnrichment ? {
        shopify_product_id: productInfo?.shopify_product_id,
        new_values: {
          body_html: seoEnrichment.body_html,
          meta_title: seoEnrichment.meta_title,
          meta_description: seoEnrichment.meta_description,
          tags: seoEnrichment.tags,
        },
      } : null,
      affected_entities: f.affected_entities,
      remaining_products: f.affected_entities.length - 1,
    },
  });

  const summaryPayload = {
    product: productName,
    content_items_count: contentItems.length,
    platforms: contentItems.map(i => i.platform),
    has_seo_enrichment: !!seoEnrichment,
  } as Record<string, unknown>;

  await updateFindingStatus(f.id, approval.id, summaryPayload);
  return { type: "approval_task", id: approval.id, generated_content: summaryPayload };
}

// 通用行动方案
async function executeGenericFinding(f: DiagnosticFinding, integrationId: string | null): Promise<ExecutionResult> {
  // 调用 data_analyst 生成行动方案
  let generated: Record<string, unknown> = {};
  try {
    generated = await executeAgent("data_analyst", "daily_insight", {}, {});
  } catch (err) {
    console.error("Agent 方案生成失败:", err);
  }

  const approval = await createApprovalTask({
    type: "product_edit",
    entity_id: f.affected_entities[0]?.entity_id,
    entity_type: "products",
    title: `[诊断] ${f.title}`,
    description: formatGeneratedContent("行动方案", generated, f),
    payload: {
      diagnostic_finding_id: f.id,
      integration_id: integrationId,
      action_plan: generated,
      affected_entities: f.affected_entities,
    },
  });

  await updateFindingStatus(f.id, approval.id, generated);
  return { type: "approval_task", id: approval.id, generated_content: generated };
}

function formatGeneratedContent(label: string, content: Record<string, unknown>, f: DiagnosticFinding): string {
  const entityNames = f.affected_entities.map((e) => e.name).join(", ");
  let desc = `AI 已生成${label}。\n\n`;

  // 展示 AI 生成的主要内容
  if (content.title) desc += `标题: ${content.title}\n`;
  if (content.meta_title) desc += `Meta 标题: ${content.meta_title}\n`;
  if (content.meta_description) desc += `Meta 描述: ${content.meta_description}\n`;
  if (content.body) desc += `\n正文:\n${String(content.body).slice(0, 300)}...\n`;
  if (content.body_html) desc += `\n描述:\n${String(content.body_html).slice(0, 300)}...\n`;
  if (content.tags) desc += `标签: ${content.tags}\n`;
  if (content.hashtags && Array.isArray(content.hashtags)) desc += `话题标签: ${content.hashtags.join(" ")}\n`;
  if (content.cta) desc += `CTA: ${content.cta}\n`;

  // priority_actions (from daily_insight)
  if (content.priority_actions && Array.isArray(content.priority_actions)) {
    desc += "\n行动建议:\n";
    for (const a of content.priority_actions as { title: string; description: string }[]) {
      desc += `- ${a.title}: ${a.description}\n`;
    }
  }
  if (content.insight) desc += `\n洞察: ${content.insight}\n`;

  if (entityNames) desc += `\n影响商品: ${entityNames}`;
  return desc;
}

async function updateFindingStatus(findingId: string, approvalId: string, generated: Record<string, unknown>) {
  await supabase
    .from("diagnostic_findings")
    .update({
      status: "in_progress",
      execution_ref: { type: "approval_task", id: approvalId, generated_content: generated },
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
