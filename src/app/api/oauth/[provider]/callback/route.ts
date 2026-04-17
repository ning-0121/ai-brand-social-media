import { NextResponse } from "next/server";
import { exchangeInstagramCode, getInstagramAccountInfo } from "@/lib/social-oauth/instagram";
import { exchangeFacebookCode, getFacebookAccountInfo } from "@/lib/social-oauth/facebook";
import { exchangeTiktokCode, getTiktokAccountInfo } from "@/lib/social-oauth/tiktok";
import { exchangeGoogleAnalyticsCode, getGoogleAnalyticsAccountInfo } from "@/lib/social-oauth/google";
import { supabase } from "@/lib/supabase";
import { getAppUrl } from "@/lib/social-oauth/types";
import type { OAuthTokens, SocialAccountInfo } from "@/lib/social-oauth/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDesc = url.searchParams.get("error_description");

  if (error || !code) {
    return redirectToSettings(`oauth_error=${encodeURIComponent(errorDesc || error || "授权被拒绝")}`);
  }

  // Validate CSRF state parameter
  const cookieName = `oauth_state_${provider}`;
  const savedState = request.headers.get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`))
    ?.split("=")[1];

  if (!savedState || !returnedState || savedState !== returnedState) {
    return redirectToSettings(`oauth_error=${encodeURIComponent("CSRF 验证失败，请重新授权")}`);
  }

  try {
    // 换取 token
    let tokens: OAuthTokens;
    let info: SocialAccountInfo;

    switch (provider) {
      case "instagram":
        tokens = await exchangeInstagramCode(code);
        info = await getInstagramAccountInfo(tokens.access_token);
        break;
      case "facebook":
        tokens = await exchangeFacebookCode(code);
        info = await getFacebookAccountInfo(tokens.access_token);
        break;
      case "tiktok":
        tokens = await exchangeTiktokCode(code);
        info = await getTiktokAccountInfo(tokens.access_token);
        break;
      case "google_analytics":
        tokens = await exchangeGoogleAnalyticsCode(code);
        info = await getGoogleAnalyticsAccountInfo(tokens.access_token);
        break;
      default:
        return redirectToSettings(`oauth_error=不支持的 provider`);
    }

    // 写入 integrations 表
    const integrationData = {
      platform: provider,
      store_name: info.account_name,
      access_token: tokens.access_token,
      api_secret: tokens.refresh_token || null,
      status: "active",
      last_synced_at: new Date().toISOString(),
      metadata: {
        account_id: info.account_id,
        account_handle: info.account_handle,
        avatar_url: info.avatar_url,
        followers: info.followers,
        token_expires_in: tokens.expires_in,
        ...info.metadata,
      },
    };

    // 检查是否已存在
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("platform", provider)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase.from("integrations").update(integrationData).eq("id", existing.id);
      if (updateErr) throw new Error(`保存集成失败: ${updateErr.message}`);
    } else {
      const { error: insertErr } = await supabase.from("integrations").insert(integrationData);
      if (insertErr) throw new Error(`保存集成失败: ${insertErr.message}`);
    }

    // 同时写入 social_accounts
    const { data: existingAccount } = await supabase
      .from("social_accounts")
      .select("id")
      .eq("platform", provider)
      .eq("handle", info.account_handle || info.account_name)
      .maybeSingle();

    const socialData = {
      platform: provider,
      handle: info.account_handle || info.account_name,
      display_name: info.account_name,
      avatar_url: info.avatar_url,
      followers: info.followers || 0,
      connected: true,
      last_synced_at: new Date().toISOString(),
    };

    if (existingAccount) {
      await supabase.from("social_accounts").update(socialData).eq("id", existingAccount.id);
    } else {
      await supabase.from("social_accounts").insert(socialData);
    }

    return redirectToSettings(`oauth_success=${provider}`);
  } catch (err) {
    console.error(`OAuth ${provider} callback error:`, err);
    const msg = err instanceof Error ? err.message : "授权失败";
    return redirectToSettings(`oauth_error=${encodeURIComponent(msg)}`);
  }
}

function redirectToSettings(query: string): NextResponse {
  return NextResponse.redirect(`${getAppUrl()}/settings?${query}`);
}
