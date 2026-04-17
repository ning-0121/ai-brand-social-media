import { getAppUrl } from "./types";
import type { OAuthTokens, SocialAccountInfo } from "./types";

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ANALYTICS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/analytics.manage.users.readonly",
].join(" ");

function getRedirectUri() {
  return `${getAppUrl()}/api/oauth/google_analytics/callback`;
}

export function buildGoogleAnalyticsAuthUrl(state: string): string | null {
  const config = getGoogleConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleAnalyticsCode(code: string): Promise<OAuthTokens> {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google Analytics OAuth 未配置");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description || "Google token 换取失败");
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const config = getGoogleConfig();
  if (!config) throw new Error("Google Analytics OAuth 未配置");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Google token 刷新失败");
  const data = await res.json();
  return data.access_token;
}

interface GA4Property {
  name: string; // e.g. "properties/123456789"
  displayName: string;
  websiteUri?: string;
}

export async function getGA4Properties(accessToken: string): Promise<GA4Property[]> {
  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  const properties: GA4Property[] = [];

  for (const account of data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      properties.push({
        name: prop.property,
        displayName: prop.displayName,
        websiteUri: prop.websiteUri,
      });
    }
  }

  return properties;
}

export async function getGoogleAnalyticsAccountInfo(accessToken: string): Promise<SocialAccountInfo> {
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let email = "Google Analytics";
  if (userRes.ok) {
    const u = await userRes.json();
    email = u.email || u.name || "Google Analytics";
  }

  const properties = await getGA4Properties(accessToken);
  const firstProperty = properties[0];

  return {
    account_id: firstProperty?.name?.replace("properties/", "") || "",
    account_name: email,
    account_handle: email,
    avatar_url: undefined,
    followers: 0,
    metadata: {
      properties,
      selected_property: firstProperty?.name || null,
      selected_property_name: firstProperty?.displayName || null,
    },
  };
}
