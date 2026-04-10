/**
 * Content Queue Processor
 *
 * Bridges content_queue → scheduled_posts → platform publish.
 * Called by hourly cron and manual API trigger.
 */

import { supabase } from "./supabase";

interface QueueItem {
  id: string;
  content_type: string;
  title: string;
  body: string;
  platform: string;
  product_id: string | null;
  product_name: string | null;
  approval_id: string | null;
  agent_task_id: string | null;
  status: string;
  metadata: Record<string, unknown>;
}

/**
 * Process queued content items → create scheduled_posts for publishing.
 * Returns count of items processed.
 */
export async function processContentQueue(limit = 10): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];

  // 1. Fetch queued items
  const { data: items, error } = await supabase
    .from("content_queue")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !items || items.length === 0) {
    return { processed: 0, errors: error ? [error.message] : [] };
  }

  let processed = 0;

  for (const item of items as QueueItem[]) {
    try {
      // 2. Find active social account for this platform
      const { data: account } = await supabase
        .from("social_accounts")
        .select("id")
        .eq("platform", item.platform)
        .eq("connected", true)
        .limit(1)
        .maybeSingle();

      // 3. Create scheduled_post for the publishing pipeline
      const { data: post, error: postError } = await supabase
        .from("scheduled_posts")
        .insert({
          account_id: account?.id || null,
          platform: item.platform,
          content_preview: item.body?.slice(0, 500),
          full_content: {
            title: item.title,
            body: item.body,
            hashtags: item.metadata?.hashtags || [],
            content_type: item.content_type,
            source_queue_id: item.id,
          },
          status: "queued",
          scheduled_at: new Date().toISOString(), // Publish ASAP
        })
        .select("id")
        .single();

      if (postError) {
        errors.push(`Queue item ${item.id}: ${postError.message}`);
        await supabase.from("content_queue").update({
          status: "failed",
          error_message: postError.message,
          publish_attempts: (item as unknown as { publish_attempts: number }).publish_attempts + 1,
        }).eq("id", item.id);
        continue;
      }

      // 4. Update queue item status
      await supabase.from("content_queue").update({
        status: "scheduled",
        metadata: {
          ...item.metadata,
          scheduled_post_id: post?.id,
          scheduled_at: new Date().toISOString(),
        },
      }).eq("id", item.id);

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Queue item ${item.id}: ${msg}`);
    }
  }

  return { processed, errors };
}

/**
 * Sync content_queue status from linked scheduled_posts.
 * Called after publishing to update queue items that have been published.
 */
export async function syncQueueStatus(): Promise<number> {
  // Find scheduled queue items that have linked published posts
  const { data: scheduledItems } = await supabase
    .from("content_queue")
    .select("id, metadata")
    .eq("status", "scheduled");

  if (!scheduledItems || scheduledItems.length === 0) return 0;

  let synced = 0;
  for (const item of scheduledItems) {
    const postId = (item.metadata as Record<string, unknown>)?.scheduled_post_id;
    if (!postId) continue;

    const { data: post } = await supabase
      .from("scheduled_posts")
      .select("status, published_at")
      .eq("id", postId)
      .single();

    if (!post) continue;

    if (post.status === "published") {
      await supabase.from("content_queue").update({
        status: "published",
        published_at: post.published_at || new Date().toISOString(),
      }).eq("id", item.id);
      synced++;
    } else if (post.status === "failed") {
      await supabase.from("content_queue").update({
        status: "failed",
        error_message: "Platform publishing failed",
      }).eq("id", item.id);
      synced++;
    }
  }

  return synced;
}
