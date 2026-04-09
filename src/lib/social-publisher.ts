import { supabase } from "./supabase";

interface PublishResult {
  success: boolean;
  post_id?: string;
  error?: string;
}

/**
 * Publish a scheduled post to its platform via API.
 * Returns success/failure. Caller should update DB status.
 */
export async function publishPost(post: {
  id: string;
  platform: string;
  account_id: string | null;
  title?: string;
  body?: string;
  content_preview?: string;
  image_url?: string;
  hashtags?: string[];
}): Promise<PublishResult> {
  // Get the integration for this platform
  const { data: integration } = await supabase
    .from("integrations")
    .select("access_token, metadata")
    .eq("platform", post.platform)
    .eq("status", "active")
    .maybeSingle();

  if (!integration?.access_token) {
    return { success: false, error: `${post.platform} 未连接或 token 无效` };
  }

  const text = buildPostText(post);

  try {
    switch (post.platform) {
      case "instagram":
        return await publishToInstagram(integration, text, post.image_url);
      case "facebook":
        return await publishToFacebook(integration, text, post.image_url);
      case "tiktok":
        return await publishToTiktok(integration, text);
      default:
        return { success: false, error: `平台 ${post.platform} 暂不支持自动发布` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "发布失败" };
  }
}

function buildPostText(post: {
  title?: string;
  body?: string;
  content_preview?: string;
  hashtags?: string[];
}): string {
  let text = post.body || post.content_preview || post.title || "";
  if (post.hashtags && post.hashtags.length > 0) {
    text += "\n\n" + post.hashtags.join(" ");
  }
  return text;
}

// ============ Instagram (via Meta Graph API) ============
async function publishToInstagram(
  integration: { access_token: string; metadata: Record<string, unknown> | null },
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  const igAccountId = integration.metadata?.account_id;
  const pageAccessToken = (integration.metadata?.page_access_token as string) || integration.access_token;

  if (!igAccountId) return { success: false, error: "缺少 Instagram Business Account ID" };

  if (imageUrl) {
    // Step 1: Create media container
    const createRes = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: text,
          access_token: pageAccessToken,
        }),
      }
    );
    const createData = await createRes.json();
    if (!createRes.ok) return { success: false, error: createData?.error?.message || "创建媒体失败" };

    // Step 2: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: createData.id,
          access_token: pageAccessToken,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (!publishRes.ok) return { success: false, error: publishData?.error?.message || "发布失败" };

    return { success: true, post_id: publishData.id };
  }

  // Text-only not supported on Instagram (requires image)
  return { success: false, error: "Instagram 发帖必须包含图片" };
}

// ============ Facebook (Page Post) ============
async function publishToFacebook(
  integration: { access_token: string; metadata: Record<string, unknown> | null },
  text: string,
  imageUrl?: string
): Promise<PublishResult> {
  const pageId = integration.metadata?.page_id;
  const pageAccessToken = (integration.metadata?.page_access_token as string) || integration.access_token;

  if (!pageId) return { success: false, error: "缺少 Facebook Page ID" };

  const body: Record<string, string> = {
    message: text,
    access_token: pageAccessToken,
  };
  if (imageUrl) body.link = imageUrl;

  const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data?.error?.message || "发布失败" };

  return { success: true, post_id: data.id };
}

// ============ TikTok (Video Only — placeholder) ============
async function publishToTiktok(
  integration: { access_token: string; metadata: Record<string, unknown> | null },
  text: string
): Promise<PublishResult> {
  // TikTok Content Posting API requires video upload, not just text/image
  // This is a placeholder — real implementation needs:
  // 1. POST /v2/post/publish/video/init/ to get upload URL
  // 2. Upload video to the URL
  // 3. POST /v2/post/publish/ to finalize
  void integration;
  void text;
  return { success: false, error: "TikTok 自动发布需要视频上传，暂未实现。请手动发布。" };
}

// ============ Auto-publish due posts ============
export async function autoPublishDuePosts(): Promise<{
  published: number;
  failed: number;
  errors: string[];
}> {
  const now = new Date().toISOString();

  const { data: duePosts } = await supabase
    .from("scheduled_posts")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_at", now);

  if (!duePosts || duePosts.length === 0) {
    return { published: 0, failed: 0, errors: [] };
  }

  let published = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const post of duePosts) {
    const result = await publishPost(post);
    if (result.success) {
      await supabase
        .from("scheduled_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", post.id);
      published++;
    } else {
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_message: result.error,
        })
        .eq("id", post.id);
      failed++;
      errors.push(`${post.platform}: ${result.error}`);
    }
  }

  return { published, failed, errors };
}
