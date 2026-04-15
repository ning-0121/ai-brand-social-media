/**
 * Instagram Graph API 高级封装
 * 基于 instagram-mcp 的 23 个工具，移植为可直接调用的函数
 * 所有函数需要 access_token 和 ig_account_id（从 integrations 表获取）
 */

import { supabase } from "./supabase";

const GRAPH_API = "https://graph.facebook.com/v18.0";

interface IGCredentials {
  accessToken: string;
  igAccountId: string;
  pageAccessToken?: string;
  pageId?: string;
}

async function getIGCredentials(): Promise<IGCredentials | null> {
  const { data } = await supabase
    .from("integrations")
    .select("access_token, metadata")
    .eq("platform", "instagram")
    .eq("status", "active")
    .maybeSingle();

  if (!data?.access_token) return null;
  const meta = data.metadata as Record<string, unknown> | null;
  return {
    accessToken: data.access_token,
    igAccountId: (meta?.account_id as string) || "",
    pageAccessToken: (meta?.page_access_token as string) || data.access_token,
    pageId: (meta?.page_id as string) || "",
  };
}

// ─── Profile & Account ─────────────────────────────────────

export async function getProfileInfo(): Promise<Record<string, unknown> | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  const res = await fetch(
    `${GRAPH_API}/${creds.igAccountId}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getAccountInsights(
  period: "day" | "week" | "month" = "day",
  metrics: string[] = ["impressions", "reach", "profile_views", "website_clicks"]
): Promise<Record<string, unknown> | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  const res = await fetch(
    `${GRAPH_API}/${creds.igAccountId}/insights?metric=${metrics.join(",")}&period=${period}&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return null;
  return res.json();
}

// ─── Media & Publishing ─────────────────────────────────────

export async function getRecentPosts(limit = 20): Promise<Array<Record<string, unknown>>> {
  const creds = await getIGCredentials();
  if (!creds) return [];

  const res = await fetch(
    `${GRAPH_API}/${creds.igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function getMediaInsights(mediaId: string): Promise<Record<string, unknown> | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  const res = await fetch(
    `${GRAPH_API}/${mediaId}/insights?metric=impressions,reach,engagement,saved&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function publishPhoto(imageUrl: string, caption: string): Promise<{ id: string } | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  // Step 1: Create media container
  const createRes = await fetch(`${GRAPH_API}/${creds.igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: creds.pageAccessToken }),
  });
  if (!createRes.ok) return null;
  const container = await createRes.json();

  // Step 2: Publish
  const pubRes = await fetch(`${GRAPH_API}/${creds.igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: creds.pageAccessToken }),
  });
  if (!pubRes.ok) return null;
  return pubRes.json();
}

export async function publishCarousel(
  items: Array<{ image_url: string; caption?: string }>,
  caption: string
): Promise<{ id: string } | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  // Step 1: Create item containers
  const itemIds: string[] = [];
  for (const item of items) {
    const res = await fetch(`${GRAPH_API}/${creds.igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: item.image_url,
        is_carousel_item: true,
        access_token: creds.pageAccessToken,
      }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    if (data.id) itemIds.push(data.id);
  }

  if (itemIds.length < 2) return null; // Carousel needs at least 2 items

  // Step 2: Create carousel container
  const carouselRes = await fetch(`${GRAPH_API}/${creds.igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: itemIds,
      caption,
      access_token: creds.pageAccessToken,
    }),
  });
  if (!carouselRes.ok) return null;
  const carousel = await carouselRes.json();

  // Step 3: Publish
  const pubRes = await fetch(`${GRAPH_API}/${creds.igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carousel.id, access_token: creds.pageAccessToken }),
  });
  if (!pubRes.ok) return null;
  return pubRes.json();
}

export async function publishReel(videoUrl: string, caption: string): Promise<{ id: string } | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  // Step 1: Create reel container
  const createRes = await fetch(`${GRAPH_API}/${creds.igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: creds.pageAccessToken,
    }),
  });
  if (!createRes.ok) return null;
  const container = await createRes.json();

  // Step 2: Publish (may need polling for video processing)
  const pubRes = await fetch(`${GRAPH_API}/${creds.igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: container.id, access_token: creds.pageAccessToken }),
  });
  if (!pubRes.ok) return null;
  return pubRes.json();
}

// ─── Comments ───────────────────────────────────────────────

export async function getComments(mediaId: string): Promise<Array<Record<string, unknown>>> {
  const creds = await getIGCredentials();
  if (!creds) return [];

  const res = await fetch(
    `${GRAPH_API}/${mediaId}/comments?fields=id,text,username,timestamp,like_count,replies{id,text,username,timestamp}&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function replyToComment(commentId: string, message: string): Promise<{ id: string } | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  const res = await fetch(`${GRAPH_API}/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: creds.pageAccessToken }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Hashtag Research ───────────────────────────────────────

export async function searchHashtag(query: string): Promise<{ id: string; name: string } | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  const res = await fetch(
    `${GRAPH_API}/ig_hashtag_search?q=${encodeURIComponent(query)}&user_id=${creds.igAccountId}&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] || null;
}

export async function getHashtagTopMedia(hashtagId: string): Promise<Array<Record<string, unknown>>> {
  const creds = await getIGCredentials();
  if (!creds) return [];

  const res = await fetch(
    `${GRAPH_API}/${hashtagId}/top_media?user_id=${creds.igAccountId}&fields=id,caption,media_type,like_count,comments_count,permalink&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// ─── Business Discovery (竞品分析) ──────────────────────────

export async function discoverBusiness(username: string): Promise<Record<string, unknown> | null> {
  const creds = await getIGCredentials();
  if (!creds) return null;

  const res = await fetch(
    `${GRAPH_API}/${creds.igAccountId}?fields=business_discovery.fields(username,name,biography,followers_count,media_count,media.limit(12){id,caption,media_type,like_count,comments_count,timestamp,permalink})&business_discovery=${encodeURIComponent(username)}&access_token=${creds.pageAccessToken}`
  );
  if (!res.ok) return null;
  return res.json();
}
