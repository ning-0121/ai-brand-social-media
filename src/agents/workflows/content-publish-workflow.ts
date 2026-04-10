/**
 * Workflow B: 内容生成 → 审批 → 发布队列
 *
 * 1. 根据产品生成多平台内容（TikTok/IG/Pinterest/Email）
 * 2. QA 审核
 * 3. 创建审批任务
 * 4. 审批后写入 content_queue
 * 5. 可从社媒规划页查看和发布
 */

import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import { reviewContent } from "@/lib/content-qa";
import { createApprovalTask } from "@/lib/supabase-approval";

interface ContentItem {
  content_type: string;
  platform: string;
  title: string;
  body: string;
  hashtags?: string[];
  skill_used: string;
}

export async function runContentPublishWorkflow(productId: string): Promise<{
  success: boolean;
  items_generated: number;
  approval_id?: string;
}> {
  const { data: product } = await supabase
    .from("products").select("*").eq("id", productId).single();

  if (!product) return { success: false, items_generated: 0 };

  const contentItems: ContentItem[] = [];

  // Generate 1 content item per call to stay within Vercel 60s timeout.
  // Multiple calls can be chained via cron for full multi-platform coverage.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { result } = await executeSkill("social_post_pack", { product, platform: "instagram" } as any, { sourceModule: "workflow-b" });
  const posts = ((result.output as Record<string, unknown>).posts as Array<Record<string, unknown>>) || [];

  for (const post of posts.slice(0, 3)) {
    contentItems.push({
      content_type: "instagram_caption",
      platform: "instagram",
      title: post.title as string || `${product.name} IG Post`,
      body: post.body as string || "",
      hashtags: post.hashtags as string[],
      skill_used: "social_post_pack",
    });
  }

  if (contentItems.length === 0) {
    return { success: false, items_generated: 0 };
  }

  // 4. QA review (sample the first item)
  const qa = await reviewContent("social_post", {
    body: contentItems[0].body,
    platform: contentItems[0].platform,
  }, { name: product.name });

  // 5. Create approval task
  const approval = await createApprovalTask({
    type: "content_publish",
    entity_id: product.id,
    entity_type: "contents",
    title: `[内容包] ${product.name} (${contentItems.length} 条)`,
    description: `AI 生成了 ${contentItems.length} 条多平台内容（QA ${qa.score}分）:\n${contentItems.map(i => `- ${i.platform}: ${i.title}`).join("\n")}\n\n审批后将加入发布队列。`,
    payload: {
      workflow: "content_publish_workflow",
      product_id: product.id,
      product_name: product.name,
      qa_score: qa.score,
      content_items: contentItems,
    },
  });

  // 6. Create agent task
  await supabase.from("agent_tasks_v2").insert({
    agent_id: "content",
    task_type: "multi_platform_content",
    title: `${product.name} 多平台内容包`,
    status: "approved",
    priority: "medium",
    input: { product_id: productId },
    output: { items: contentItems },
    qa_score: qa.score,
    approval_id: approval.id,
    source_module: "workflow-b",
    requires_approval: true,
  });

  return { success: true, items_generated: contentItems.length, approval_id: approval.id };
}

/**
 * After approval: move content items to content_queue.
 */
export async function publishContentToQueue(
  contentItems: ContentItem[],
  productId: string,
  productName: string,
  approvalId: string
): Promise<{ queued: number }> {
  let queued = 0;

  for (const item of contentItems) {
    await supabase.from("content_queue").insert({
      content_type: item.content_type,
      title: item.title,
      body: item.body,
      platform: item.platform,
      product_id: productId,
      product_name: productName,
      approval_id: approvalId,
      status: "queued",
      metadata: { hashtags: item.hashtags, skill_used: item.skill_used },
    });
    queued++;
  }

  return { queued };
}
