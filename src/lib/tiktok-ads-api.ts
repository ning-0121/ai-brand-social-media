/**
 * TikTok Ads API 封装
 * 基于 tiktok-ads-mcp，管理 TikTok 广告投放
 *
 * 需要环境变量：
 * - TIKTOK_ADS_ACCESS_TOKEN
 * - TIKTOK_ADS_ADVERTISER_ID
 */

const TIKTOK_ADS_API = "https://business-api.tiktok.com/open_api/v1.3";

function getHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Access-Token": process.env.TIKTOK_ADS_ACCESS_TOKEN || "",
  };
}

const advertiserId = () => process.env.TIKTOK_ADS_ADVERTISER_ID || "";

// ─── Campaign Management ────────────────────────────────────

export async function getCampaigns(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${TIKTOK_ADS_API}/campaign/get/?advertiser_id=${advertiserId()}&page_size=50`, {
    headers: getHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.list || [];
}

export async function createCampaign(params: {
  name: string;
  objective: "TRAFFIC" | "CONVERSIONS" | "REACH" | "VIDEO_VIEWS" | "PRODUCT_SALES";
  budgetMode: "BUDGET_MODE_DAY" | "BUDGET_MODE_TOTAL";
  budget: number;
}): Promise<{ campaign_id: string } | null> {
  const res = await fetch(`${TIKTOK_ADS_API}/campaign/create/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      advertiser_id: advertiserId(),
      campaign_name: params.name,
      objective_type: params.objective,
      budget_mode: params.budgetMode,
      budget: params.budget,
      operation_status: "DISABLE", // 先暂停，审核后开启
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data ? { campaign_id: data.data.campaign_id } : null;
}

// ─── Ad Group ───────────────────────────────────────────────

export async function createAdGroup(params: {
  campaignId: string;
  name: string;
  budget: number;
  targeting: {
    age?: string[]; // ["AGE_18_24", "AGE_25_34"]
    gender?: "GENDER_FEMALE" | "GENDER_MALE" | "GENDER_UNLIMITED";
    locations?: string[]; // country codes
    interests?: string[];
  };
  placementType?: "PLACEMENT_TYPE_AUTOMATIC" | "PLACEMENT_TYPE_NORMAL";
}): Promise<{ adgroup_id: string } | null> {
  const res = await fetch(`${TIKTOK_ADS_API}/adgroup/create/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      advertiser_id: advertiserId(),
      campaign_id: params.campaignId,
      adgroup_name: params.name,
      budget: params.budget,
      budget_mode: "BUDGET_MODE_DAY",
      placement_type: params.placementType || "PLACEMENT_TYPE_AUTOMATIC",
      billing_event: "CPC",
      bid_type: "BID_TYPE_NO_BID",
      optimization_goal: "CLICK",
      targeting: {
        age: params.targeting.age || ["AGE_18_24", "AGE_25_34", "AGE_35_44"],
        gender: params.targeting.gender || "GENDER_FEMALE",
        location: params.targeting.locations || ["US"],
      },
      operation_status: "DISABLE",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data ? { adgroup_id: data.data.adgroup_id } : null;
}

// ─── Performance Reports ────────────────────────────────────

export async function getAdReport(params: {
  level: "AUCTION_CAMPAIGN" | "AUCTION_ADGROUP" | "AUCTION_AD";
  startDate: string; // YYYY-MM-DD
  endDate: string;
}): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${TIKTOK_ADS_API}/report/integrated/get/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      advertiser_id: advertiserId(),
      report_type: "BASIC",
      data_level: params.level,
      dimensions: ["campaign_id", "stat_time_day"],
      metrics: ["spend", "impressions", "clicks", "cpc", "ctr", "reach", "frequency", "conversion", "cost_per_conversion"],
      start_date: params.startDate,
      end_date: params.endDate,
      page_size: 100,
    }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.list || [];
}

// ─── 兴趣/受众研究 ──────────────────────────────────────────

export async function getInterestCategories(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(
    `${TIKTOK_ADS_API}/tools/interest_category/?advertiser_id=${advertiserId()}&language=en`,
    { headers: getHeaders() }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.list || []).map((i: Record<string, unknown>) => ({
    id: i.interest_category_id as string,
    name: i.interest_category_name as string,
  }));
}
