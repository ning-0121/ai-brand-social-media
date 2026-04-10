/**
 * Workflow A: Shopify 产品详情页自动生成
 *
 * 完整闭环：
 * 1. 从 Shopify 拉产品真实数据
 * 2. AI 分析标题、卖点、FAQ、SEO、图片数
 * 3. 生成完整页面（title + subtitle + highlights + specs + FAQ + SEO）
 * 4. Gemini 生成配图
 * 5. 组装完整 HTML
 * 6. QA 审核（score >= 70 才通过）
 * 7. 创建审批任务（包含完整 payload）
 * 8. 审批通过 → 推送 Shopify body_html + SEO metafields
 * 9. 创建 creative_project 记录
 */

import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { generateImage } from "@/lib/image-service";
import { assembleDetailPage } from "@/lib/content-assembler";
import { reviewContent } from "@/lib/content-qa";
import { updateProductSEO, updateProductBodyHtml } from "@/lib/shopify-operations";
import { createApprovalTask } from "@/lib/supabase-approval";

export interface WorkflowResult {
  success: boolean;
  action: string;
  product_name: string;
  details: Record<string, unknown>;
}

export async function runProductPageWorkflow(productId: string): Promise<WorkflowResult> {
  // 1. Load real product data
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (!product?.shopify_product_id) {
    return { success: false, action: "skipped", product_name: "", details: { reason: "not a Shopify product" } };
  }

  const { data: integration } = await supabase
    .from("integrations")
    .select("id")
    .eq("platform", "shopify")
    .eq("status", "active")
    .maybeSingle();

  if (!integration) {
    return { success: false, action: "skipped", product_name: product.name, details: { reason: "no Shopify integration" } };
  }

  // 2. Analyze current state
  const issues: string[] = [];
  if (!product.meta_title) issues.push("missing meta_title");
  if (!product.meta_description) issues.push("missing meta_description");
  if (!product.body_html || product.body_html.length < 200) issues.push("body_html too short");
  if (!product.tags) issues.push("no tags");

  // 3. Generate detail page copy
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { result: detailResult } = await executeSkill("product_detail_page", { product } as any, { sourceModule: "workflow-a" });
  const copy = detailResult.output as Record<string, unknown>;

  // 4. Generate SEO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { result: seoResult } = await executeSkill("product_seo_optimize", { product } as any, { sourceModule: "workflow-a" });
  const seo = seoResult.output as Record<string, unknown>;

  // 5. Generate lifestyle image (optional — skip if Gemini quota issues)
  let lifestyleUrl: string | null = null;
  try {
    lifestyleUrl = await generateImage(
      `Professional lifestyle photo of ${product.name}, activewear product, model wearing, natural warm lighting`,
      { style: "lifestyle", size: "16:9" }
    );
  } catch {
    // Image generation is optional — don't block the workflow
  }

  // Filter out data URLs — they're too large and break HTML
  if (lifestyleUrl && lifestyleUrl.startsWith("data:")) {
    lifestyleUrl = null;
  }

  // 6. Assemble complete HTML
  const bodyHtml = assembleDetailPage(
    {
      title: (copy.title as string) || product.name,
      subtitle: copy.subtitle as string,
      highlights: copy.highlights as string[],
      description: copy.description as string,
      specs: copy.specs as Array<{ name: string; value: string }>,
      cta_primary: copy.cta_primary as string,
    },
    product.image_url,
    lifestyleUrl ? [{ label: "lifestyle", url: lifestyleUrl }] : []
  );

  // 7. QA review
  const qa = await reviewContent("detail_page", { body_html: bodyHtml, ...copy }, { name: product.name, category: product.category });

  if (!qa.passed) {
    // Log failed QA but still create the task for manual review
    await supabase.from("agent_tasks_v2").insert({
      agent_id: "page",
      task_type: "generate_detail_page",
      title: `[QA 未通过] ${product.name} 详情页`,
      status: "qa_rejected",
      priority: "medium",
      input: { product_id: productId },
      output: { copy, seo, body_html: bodyHtml },
      qa_score: qa.score,
      error: qa.improvements.join("; "),
      source_module: "workflow-a",
    });

    return {
      success: false,
      action: "qa_rejected",
      product_name: product.name,
      details: { score: qa.score, improvements: qa.improvements },
    };
  }

  // 8. Create approval task with complete payload
  const approval = await createApprovalTask({
    type: "product_edit",
    entity_id: product.id,
    entity_type: "products",
    title: `[详情页] ${product.name}`,
    description: `AI 生成了完整的详情页（QA ${qa.score}分），包含：标题、卖点、规格、CTA、SEO。审批后将自动推送到 Shopify。`,
    payload: {
      workflow: "product_page_workflow",
      product_id: product.id,
      product_name: product.name,
      shopify_product_id: product.shopify_product_id,
      integration_id: integration.id,
      qa_score: qa.score,
      issues_found: issues,
      // What will be deployed
      new_values: {
        body_html: bodyHtml,
        meta_title: seo.meta_title,
        meta_description: seo.meta_description,
        tags: seo.tags,
      },
      old_values: {
        body_html: product.body_html?.slice(0, 200),
        meta_title: product.meta_title,
        meta_description: product.meta_description,
        tags: product.tags,
      },
      // Preview data
      copy_preview: {
        title: copy.title,
        subtitle: copy.subtitle,
        highlights: copy.highlights,
        cta: copy.cta_primary,
      },
      lifestyle_image: lifestyleUrl,
    },
  });

  // 9. Create agent task record
  await supabase.from("agent_tasks_v2").insert({
    agent_id: "page",
    task_type: "generate_detail_page",
    title: `${product.name} 详情页`,
    status: "approved", // waiting for human approval
    priority: "high",
    input: { product_id: productId },
    output: { copy, seo },
    qa_score: qa.score,
    approval_id: approval.id,
    source_module: "workflow-a",
    requires_approval: true,
  });

  // 10. Create creative project
  await supabase.from("creative_projects").insert({
    project_type: "page",
    title: `详情页: ${product.name}`,
    status: "review",
    product_id: product.id,
    product_name: product.name,
    generated_output: { copy, seo, body_html: bodyHtml },
    seo: { meta_title: seo.meta_title, meta_description: seo.meta_description, tags: seo.tags },
    approval_id: approval.id,
  });

  return {
    success: true,
    action: "submitted_for_approval",
    product_name: product.name,
    details: {
      qa_score: qa.score,
      issues_found: issues.length,
      has_lifestyle_image: !!lifestyleUrl,
      approval_id: approval.id,
      body_html_length: bodyHtml.length,
    },
  };
}

/**
 * Execute the deployment after approval.
 * Called by the approval handler when the task is approved.
 */
export async function deployProductPage(
  integrationId: string,
  shopifyProductId: number,
  localProductId: string,
  newValues: {
    body_html: string;
    meta_title?: string;
    meta_description?: string;
    tags?: string;
  }
): Promise<{ success: boolean }> {
  // Deploy body_html
  if (newValues.body_html) {
    await updateProductBodyHtml(integrationId, shopifyProductId, localProductId, newValues.body_html);
  }

  // Deploy SEO
  if (newValues.meta_title || newValues.meta_description || newValues.tags) {
    await updateProductSEO(integrationId, shopifyProductId, localProductId, {
      meta_title: newValues.meta_title,
      meta_description: newValues.meta_description,
      tags: newValues.tags,
    });
  }

  return { success: true };
}
