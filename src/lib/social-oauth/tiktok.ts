import type { OAuthConfig, OAuthTokens, SocialAccountInfo } from "./types";
import { getAppUrl } from "./types";

export function getTiktokConfig(): OAuthConfig | null {
  const clientId = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    provider: "tiktok",
    clientId,
    clientSecret,
    redirectUri: `${getAppUrl()}/api/oauth/tiktok/callback`,
    scopes: ["user.info.basic", "video.publish", "video.upload", "user.info.profile", "user.info.stats"],
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
  };
}

export function buildTiktokAuthUrl(state: string): string | null {
  const cfg = getTiktokConfig();
  if (!cfg) return null;

  const params = new URLSearchParams({
    client_key: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(","),
    response_type: "code",
    state,
  });

  return `${cfg.authorizeUrl}/?${params.toString()}`;
}

export async function exchangeTiktokCode(code: string): Promise<OAuthTokens> {
  const cfg = getTiktokConfig();
  if (!cfg) throw new Error("TikTok OAuth 未配置");

  const body = new URLSearchParams({
    client_key: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: cfg.redirectUri,
  });

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`换取 TikTok token 失败: ${res.status}`);
  return await res.json();
}

export async function getTiktokAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
  const fields = "open_id,union_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count";
  const res = await fetch(
    `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("获取 TikTok 用户信息失败");
  const data = await res.json();
  const user = data.data?.user || {};

  return {
    account_id: user.open_id || user.union_id || "unknown",
    account_name: user.display_name || user.username || "TikTok",
    account_handle: user.username,
    avatar_url: user.avatar_url,
    followers: user.follower_count,
    metadata: {
      union_id: user.union_id,
      following_count: user.following_count,
      likes_count: user.likes_count,
      video_count: user.video_count,
    },
  };
}
