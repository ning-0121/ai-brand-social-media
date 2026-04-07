import type { OAuthConfig, OAuthTokens, SocialAccountInfo } from "./types";
import { getAppUrl } from "./types";

export function getFacebookConfig(): OAuthConfig | null {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    provider: "facebook",
    clientId,
    clientSecret,
    redirectUri: `${getAppUrl()}/api/oauth/facebook/callback`,
    scopes: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_metadata",
    ],
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
  };
}

export function buildFacebookAuthUrl(state: string): string | null {
  const cfg = getFacebookConfig();
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

export async function exchangeFacebookCode(code: string): Promise<OAuthTokens> {
  const cfg = getFacebookConfig();
  if (!cfg) throw new Error("Facebook OAuth 未配置");

  const params = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    code,
  });

  const res = await fetch(`${cfg.tokenUrl}?${params.toString()}`);
  if (!res.ok) throw new Error(`换取 token 失败: ${res.status}`);
  return await res.json();
}

export async function getFacebookAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
  // 获取用户信息
  const meRes = await fetch(
    `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`
  );
  if (!meRes.ok) throw new Error("获取 Facebook 用户失败");
  const me = await meRes.json();

  // 获取第一个 page
  const pagesRes = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,fan_count&access_token=${encodeURIComponent(accessToken)}`
  );
  const pages = pagesRes.ok ? await pagesRes.json() : { data: [] };
  const firstPage = pages.data?.[0];

  return {
    account_id: firstPage?.id || me.id,
    account_name: firstPage?.name || me.name,
    followers: firstPage?.fan_count,
    metadata: {
      user_id: me.id,
      page_id: firstPage?.id,
      page_access_token: firstPage?.access_token,
    },
  };
}
