/**
 * YouTube API 封装
 * Shorts 管理、视频分析、频道数据
 * YouTube Shorts 是 DTC 品牌免费流量的重要来源
 *
 * 需要环境变量：
 * - YOUTUBE_API_KEY (只读分析)
 * - YOUTUBE_ACCESS_TOKEN (发布需要 OAuth)
 * - YOUTUBE_CHANNEL_ID
 */

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

// ─── 频道分析 ───────────────────────────────────────────────

export async function getChannelStats(): Promise<{
  subscribers: number;
  total_views: number;
  video_count: number;
} | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return null;

  try {
    const res = await fetch(
      `${YOUTUBE_API}/channels?part=statistics&id=${channelId}&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const stats = data.items?.[0]?.statistics;
    if (!stats) return null;
    return {
      subscribers: parseInt(stats.subscriberCount) || 0,
      total_views: parseInt(stats.viewCount) || 0,
      video_count: parseInt(stats.videoCount) || 0,
    };
  } catch { return null; }
}

export async function getRecentVideos(maxResults = 10): Promise<Array<{
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
}>> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) return [];

  try {
    // Get recent video IDs
    const searchRes = await fetch(
      `${YOUTUBE_API}/search?part=id&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const videoIds = (searchData.items || []).map((i: Record<string, unknown>) => (i.id as Record<string, unknown>).videoId).join(",");

    if (!videoIds) return [];

    // Get video stats
    const statsRes = await fetch(
      `${YOUTUBE_API}/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
    );
    if (!statsRes.ok) return [];
    const statsData = await statsRes.json();

    return (statsData.items || []).map((v: Record<string, unknown>) => ({
      id: v.id as string,
      title: (v.snippet as Record<string, unknown>)?.title as string || "",
      views: parseInt((v.statistics as Record<string, unknown>)?.viewCount as string || "0"),
      likes: parseInt((v.statistics as Record<string, unknown>)?.likeCount as string || "0"),
      comments: parseInt((v.statistics as Record<string, unknown>)?.commentCount as string || "0"),
      published_at: (v.snippet as Record<string, unknown>)?.publishedAt as string || "",
    }));
  } catch { return []; }
}

// ─── 竞品频道分析 ───────────────────────────────────────────

export async function analyzeCompetitorChannel(channelName: string): Promise<{
  channel_id: string;
  subscribers: number;
  total_views: number;
  recent_videos: Array<{ title: string; views: number }>;
} | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    // Search for channel
    const searchRes = await fetch(
      `${YOUTUBE_API}/search?part=snippet&q=${encodeURIComponent(channelName)}&type=channel&maxResults=1&key=${apiKey}`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const channelId = searchData.items?.[0]?.id?.channelId;
    if (!channelId) return null;

    // Get channel stats
    const channelRes = await fetch(
      `${YOUTUBE_API}/channels?part=statistics&id=${channelId}&key=${apiKey}`
    );
    if (!channelRes.ok) return null;
    const channelData = await channelRes.json();
    const stats = channelData.items?.[0]?.statistics;

    // Get recent videos
    const videosRes = await fetch(
      `${YOUTUBE_API}/search?part=id&channelId=${channelId}&order=date&type=video&maxResults=5&key=${apiKey}`
    );
    const videosData = await videosRes.json();
    const videoIds = (videosData.items || []).map((i: Record<string, unknown>) => (i.id as Record<string, unknown>).videoId).join(",");

    let recentVideos: Array<{ title: string; views: number }> = [];
    if (videoIds) {
      const statsRes = await fetch(
        `${YOUTUBE_API}/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
      );
      const statsData = await statsRes.json();
      recentVideos = (statsData.items || []).map((v: Record<string, unknown>) => ({
        title: (v.snippet as Record<string, unknown>)?.title as string || "",
        views: parseInt((v.statistics as Record<string, unknown>)?.viewCount as string || "0"),
      }));
    }

    return {
      channel_id: channelId,
      subscribers: parseInt(stats?.subscriberCount || "0"),
      total_views: parseInt(stats?.viewCount || "0"),
      recent_videos: recentVideos,
    };
  } catch { return null; }
}
