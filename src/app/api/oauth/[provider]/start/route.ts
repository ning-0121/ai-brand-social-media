import { NextResponse } from "next/server";
import { buildInstagramAuthUrl } from "@/lib/social-oauth/instagram";
import { buildFacebookAuthUrl } from "@/lib/social-oauth/facebook";
import { buildTiktokAuthUrl } from "@/lib/social-oauth/tiktok";
import { buildGoogleAnalyticsAuthUrl } from "@/lib/social-oauth/google";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const stateBytes = new Uint8Array(24);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  let authUrl: string | null = null;

  switch (provider) {
    case "instagram":
      authUrl = buildInstagramAuthUrl(state);
      break;
    case "facebook":
      authUrl = buildFacebookAuthUrl(state);
      break;
    case "tiktok":
      authUrl = buildTiktokAuthUrl(state);
      break;
    case "google_analytics":
      authUrl = buildGoogleAnalyticsAuthUrl(state);
      break;
    default:
      return NextResponse.json({ error: `不支持的 provider: ${provider}` }, { status: 400 });
  }

  if (!authUrl) {
    const envVars: Record<string, string> = {
      instagram: "INSTAGRAM_CLIENT_ID + INSTAGRAM_CLIENT_SECRET (或 FACEBOOK_*)",
      facebook: "FACEBOOK_CLIENT_ID + FACEBOOK_CLIENT_SECRET",
      tiktok: "TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET",
      google_analytics: "GOOGLE_ANALYTICS_CLIENT_ID + GOOGLE_ANALYTICS_CLIENT_SECRET",
    };
    return NextResponse.json(
      {
        error: `${provider} OAuth 未配置`,
        hint: `请在 Vercel 环境变量中设置: ${envVars[provider]}`,
      },
      { status: 503 }
    );
  }

  // 用 cookie 存 state 用于回调时验证
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 分钟
    path: "/",
  });

  // 触发 url use 标记 (避免 unused 警告)
  void request;
  return response;
}
