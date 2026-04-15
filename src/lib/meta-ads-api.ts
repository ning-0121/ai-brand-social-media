/**
 * Meta Ads API 封装
 * 基于 meta-ads-mcp，移植为可调用函数
 * 管理 Facebook/Instagram 广告：创建广告、管理预算、数据分析
 */

import { supabase } from "./supabase";

const GRAPH_API = "https://graph.facebook.com/v18.0";

interface MetaAdsCredentials {
  accessToken: string;
  adAccountId: string;
  pageId: string;
}

async function getAdsCredentials(): Promise<MetaAdsCredentials | null> {
  const { data } = await supabase
    .from("integrations")
    .select("access_token, metadata")
    .or("platform.eq.facebook,platform.eq.instagram")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!data?.access_token) return null;
  const meta = data.metadata as Record<string, unknown> | null;
  return {
    accessToken: (meta?.page_access_token as string) || data.access_token,
    adAccountId: (meta?.ad_account_id as string) || "",
    pageId: (meta?.page_id as string) || "",
  };
}

// ─── Campaign Management ────────────────────────────────────

export async function getCampaigns(): Promise<Array<Record<string, unknown>>> {
  const creds = await getAdsCredentials();
  if (!creds || !creds.adAccountId) return [];

  const res = await fetch(
    `${GRAPH_API}/act_${creds.adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time&access_token=${creds.accessToken}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function createCampaign(params: {
  name: string;
  objective: "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_SALES" | "OUTCOME_LEADS";
  dailyBudget?: number; // in cents
  status?: "ACTIVE" | "PAUSED";
}): Promise<{ id: string } | null> {
  const creds = await getAdsCredentials();
  if (!creds || !creds.adAccountId) return null;

  const res = await fetch(`${GRAPH_API}/act_${creds.adAccountId}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      objective: params.objective,
      status: params.status || "PAUSED",
      special_ad_categories: [],
      access_token: creds.accessToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "PAUSED" | "DELETED"
): Promise<boolean> {
  const creds = await getAdsCredentials();
  if (!creds) return false;

  const res = await fetch(`${GRAPH_API}/${campaignId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, access_token: creds.accessToken }),
  });
  return res.ok;
}

// ─── Ad Set Management ──────────────────────────────────────

export async function createAdSet(params: {
  campaignId: string;
  name: string;
  dailyBudget: number; // in cents (e.g., 1000 = $10)
  targeting: {
    age_min?: number;
    age_max?: number;
    genders?: number[]; // 1=male, 2=female
    geo_locations?: { countries: string[] };
    interests?: Array<{ id: string; name: string }>;
  };
  billingEvent?: "IMPRESSIONS" | "LINK_CLICKS";
  optimizationGoal?: "LINK_CLICKS" | "IMPRESSIONS" | "REACH" | "CONVERSIONS";
}): Promise<{ id: string } | null> {
  const creds = await getAdsCredentials();
  if (!creds || !creds.adAccountId) return null;

  const res = await fetch(`${GRAPH_API}/act_${creds.adAccountId}/adsets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaign_id: params.campaignId,
      name: params.name,
      daily_budget: params.dailyBudget,
      billing_event: params.billingEvent || "IMPRESSIONS",
      optimization_goal: params.optimizationGoal || "LINK_CLICKS",
      targeting: params.targeting,
      status: "PAUSED",
      access_token: creds.accessToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Ad Creative ────────────────────────────────────────────

export async function createAdCreative(params: {
  name: string;
  pageId: string;
  imageUrl?: string;
  headline: string;
  body: string;
  link: string;
  callToAction?: "SHOP_NOW" | "LEARN_MORE" | "SIGN_UP" | "BUY_NOW";
}): Promise<{ id: string } | null> {
  const creds = await getAdsCredentials();
  if (!creds || !creds.adAccountId) return null;

  const objectStorySpec: Record<string, unknown> = {
    page_id: params.pageId || creds.pageId,
    link_data: {
      message: params.body,
      link: params.link,
      name: params.headline,
      call_to_action: { type: params.callToAction || "SHOP_NOW" },
      ...(params.imageUrl ? { image_url: params.imageUrl } : {}),
    },
  };

  const res = await fetch(`${GRAPH_API}/act_${creds.adAccountId}/adcreatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      object_story_spec: objectStorySpec,
      access_token: creds.accessToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createAd(params: {
  adSetId: string;
  creativeId: string;
  name: string;
}): Promise<{ id: string } | null> {
  const creds = await getAdsCredentials();
  if (!creds || !creds.adAccountId) return null;

  const res = await fetch(`${GRAPH_API}/act_${creds.adAccountId}/ads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: params.name,
      adset_id: params.adSetId,
      creative: { creative_id: params.creativeId },
      status: "PAUSED",
      access_token: creds.accessToken,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ─── Performance Analytics ──────────────────────────────────

export async function getAdInsights(params: {
  objectId: string; // campaign_id, adset_id, or ad_id
  datePreset?: "today" | "yesterday" | "last_7d" | "last_14d" | "last_30d";
  breakdowns?: string[]; // "age", "gender", "country", "placement"
}): Promise<Array<Record<string, unknown>>> {
  const creds = await getAdsCredentials();
  if (!creds) return [];

  const fields = "impressions,reach,clicks,spend,cpc,cpm,ctr,actions,cost_per_action_type,frequency";
  let url = `${GRAPH_API}/${params.objectId}/insights?fields=${fields}&date_preset=${params.datePreset || "last_7d"}&access_token=${creds.accessToken}`;

  if (params.breakdowns?.length) {
    url += `&breakdowns=${params.breakdowns.join(",")}`;
  }

  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

export async function getAccountInsights(
  datePreset: "last_7d" | "last_14d" | "last_30d" = "last_7d"
): Promise<Record<string, unknown> | null> {
  const creds = await getAdsCredentials();
  if (!creds || !creds.adAccountId) return null;

  const fields = "impressions,reach,clicks,spend,cpc,cpm,ctr,actions,frequency";
  const res = await fetch(
    `${GRAPH_API}/act_${creds.adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${creds.accessToken}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] || null;
}

// ─── Targeting Research ─────────────────────────────────────

export async function searchInterests(query: string): Promise<Array<{ id: string; name: string; audience_size: number }>> {
  const creds = await getAdsCredentials();
  if (!creds) return [];

  const res = await fetch(
    `${GRAPH_API}/search?type=adinterest&q=${encodeURIComponent(query)}&access_token=${creds.accessToken}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map((i: Record<string, unknown>) => ({
    id: i.id as string,
    name: i.name as string,
    audience_size: (i.audience_size as number) || 0,
  }));
}
