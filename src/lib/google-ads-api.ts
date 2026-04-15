/**
 * Google Ads API 封装
 * 基于 google-ads-mcp，移植核心功能
 *
 * 需要环境变量：
 * - GOOGLE_ADS_DEVELOPER_TOKEN
 * - GOOGLE_ADS_CLIENT_ID
 * - GOOGLE_ADS_CLIENT_SECRET
 * - GOOGLE_ADS_REFRESH_TOKEN
 * - GOOGLE_ADS_CUSTOMER_ID
 */

const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";

async function getAccessToken(): Promise<string | null> {
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  if (!refreshToken || !clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

function getHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    "login-customer-id": process.env.GOOGLE_ADS_CUSTOMER_ID || "",
  };
}

// ─── GAQL 查询（Google Ads Query Language）─────────────────

async function queryGoogleAds(query: string): Promise<Array<Record<string, unknown>>> {
  const token = await getAccessToken();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!token || !customerId) return [];

  const res = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      headers: getHeaders(token),
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data[0]?.results || []) as Array<Record<string, unknown>>;
}

// ─── Campaign 管理 ──────────────────────────────────────────

export async function getCampaigns(): Promise<Array<Record<string, unknown>>> {
  return queryGoogleAds(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           campaign_budget.amount_micros, metrics.impressions, metrics.clicks, metrics.cost_micros,
           metrics.conversions, metrics.average_cpc
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `);
}

export async function getCampaignPerformance(campaignId: string, days = 30): Promise<Array<Record<string, unknown>>> {
  return queryGoogleAds(`
    SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros,
           metrics.conversions, metrics.average_cpc, metrics.ctr
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date DURING LAST_${days}_DAYS
    ORDER BY segments.date DESC
  `);
}

// ─── Keyword Research ───────────────────────────────────────

export async function getKeywordIdeas(keywords: string[], url?: string): Promise<Array<Record<string, unknown>>> {
  const token = await getAccessToken();
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
  if (!token || !customerId) return [];

  const body: Record<string, unknown> = {
    keywordSeed: { keywords },
    language: "languageConstants/1000", // English
    geoTargetConstants: ["geoTargetConstants/2840"], // US
    keywordPlanNetwork: "GOOGLE_SEARCH",
  };
  if (url) body.urlSeed = { url };

  try {
    const res = await fetch(
      `${GOOGLE_ADS_API}/customers/${customerId}:generateKeywordIdeas`,
      {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 50).map((r: Record<string, unknown>) => ({
      keyword: (r.text as string) || "",
      avgMonthlySearches: (r.keywordIdeaMetrics as Record<string, unknown>)?.avgMonthlySearches || 0,
      competition: (r.keywordIdeaMetrics as Record<string, unknown>)?.competition || "UNKNOWN",
      lowBid: (r.keywordIdeaMetrics as Record<string, unknown>)?.lowTopOfPageBidMicros || 0,
      highBid: (r.keywordIdeaMetrics as Record<string, unknown>)?.highTopOfPageBidMicros || 0,
    }));
  } catch {
    return [];
  }
}

// ─── Search Terms Report ────────────────────────────────────

export async function getSearchTerms(campaignId?: string): Promise<Array<Record<string, unknown>>> {
  const where = campaignId ? `AND campaign.id = ${campaignId}` : "";
  return queryGoogleAds(`
    SELECT search_term_view.search_term, metrics.impressions, metrics.clicks,
           metrics.cost_micros, metrics.conversions, metrics.ctr
    FROM search_term_view
    WHERE segments.date DURING LAST_30_DAYS ${where}
    ORDER BY metrics.impressions DESC
    LIMIT 100
  `);
}

// ─── Ad Performance ─────────────────────────────────────────

export async function getAdPerformance(): Promise<Array<Record<string, unknown>>> {
  return queryGoogleAds(`
    SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
           ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.status,
           metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros,
           metrics.conversions, metrics.average_cpc
    FROM ad_group_ad
    WHERE ad_group_ad.status != 'REMOVED'
      AND segments.date DURING LAST_30_DAYS
    ORDER BY metrics.impressions DESC
    LIMIT 50
  `);
}
