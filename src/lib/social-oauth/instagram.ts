import type { OAuthConfig, OAuthTokens, SocialAccountInfo } from "./types";
import { getAppUrl } from "./types";

export function getInstagramConfig(): OAuthConfig | null {
  const clientId = process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    provider: "instagram",
    clientId,
    clientSecret,
    redirectUri: `${getAppUrl()}/api/oauth/instagram/callback`,
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ],
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
  };
}

export function buildInstagramAuthUrl(state: string): string | null {
  const cfg = getInstagramConfig();
  if (!cfg) return null;

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(","),
    response_type: "code",
    state,
  });

  return `${cfg.authorizeUrl}?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string): Promise<OAuthTokens> {
  const cfg = getInstagramConfig();
  if (!cfg) throw new Error("Instagram OAuth 未配置");

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    code,
  });

  const res = await fetch(`${cfg.tokenUrl}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`换取 token 失败: ${res.status} ${await res.text()}`);
  }
  return await res.json();
}

export async function getInstagramAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
  // 1) Get Facebook Pages owned by user
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!pagesRes.ok) throw new Error("获取 Facebook Pages 失败");
  const pagesData = await pagesRes.json();
  const firstPage = pagesData.data?.[0];
  if (!firstPage) throw new Error("未找到关联的 Facebook Page");

  // 2) Get IG business account from page
  const igRes = await fetch(
    `https://graph.facebook.com/v18.0/${firstPage.id}?fields=instagram_business_account&access_token=${encodeURIComponent(firstPage.access_token)}`
  );
  if (!igRes.ok) throw new Error("获取 IG 商业账号失败");
  const igData = await igRes.json();
  const igAccountId = igData.instagram_business_account?.id;
  if (!igAccountId) throw new Error("Facebook Page 未关联 Instagram 商业账号");

  // 3) Get IG account profile
  const profileRes = await fetch(
    `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,name,profile_picture_url,followers_count&access_token=${encodeURIComponent(firstPage.access_token)}`
  );
  const profile = profileRes.ok ? await profileRes.json() : {};

  return {
    account_id: igAccountId,
    account_name: profile.name || profile.username || "Instagram",
    account_handle: profile.username,
    avatar_url: profile.profile_picture_url,
    followers: profile.followers_count,
    metadata: {
      page_id: firstPage.id,
      page_access_token: firstPage.access_token,
    },
  };
}
