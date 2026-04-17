import { supabase } from "./supabase";
import { refreshGoogleAccessToken } from "./social-oauth/google";

interface GA4Credentials {
  accessToken: string;
  refreshToken: string | null;
  propertyId: string;
  integrationId: string;
}

async function getCredentials(): Promise<GA4Credentials | null> {
  const { data } = await supabase
    .from("integrations")
    .select("id, access_token, api_secret, metadata")
    .eq("platform", "google_analytics")
    .eq("status", "active")
    .maybeSingle();

  if (!data?.access_token) return null;

  const propertyId =
    data.metadata?.selected_property?.replace("properties/", "") ||
    data.metadata?.account_id ||
    null;

  if (!propertyId) return null;

  return {
    accessToken: data.access_token,
    refreshToken: data.api_secret || null,
    propertyId,
    integrationId: data.id,
  };
}

async function fetchWithRefresh(
  creds: GA4Credentials,
  url: string,
  body: object
): Promise<Response> {
  let token = creds.accessToken;

  let res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Token expired — try refresh
  if (res.status === 401 && creds.refreshToken) {
    try {
      token = await refreshGoogleAccessToken(creds.refreshToken);
      await supabase
        .from("integrations")
        .update({ access_token: token, last_synced_at: new Date().toISOString() })
        .eq("id", creds.integrationId);

      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      // refresh failed, return original 401
    }
  }

  return res;
}

export interface GA4OverviewMetrics {
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversions: number;
  pageViews: number;
}

export async function getGA4Overview(days = 30): Promise<GA4OverviewMetrics | null> {
  const creds = await getCredentials();
  if (!creds) return null;

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`;

  const res = await fetchWithRefresh(creds, url, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "newUsers" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "conversions" },
      { name: "screenPageViews" },
    ],
  });

  if (!res.ok) return null;

  const data = await res.json();
  const row = data.rows?.[0]?.metricValues;
  if (!row) return null;

  return {
    sessions: parseInt(row[0]?.value || "0"),
    users: parseInt(row[1]?.value || "0"),
    newUsers: parseInt(row[2]?.value || "0"),
    bounceRate: parseFloat(row[3]?.value || "0") * 100,
    avgSessionDuration: parseFloat(row[4]?.value || "0"),
    conversions: parseInt(row[5]?.value || "0"),
    pageViews: parseInt(row[6]?.value || "0"),
  };
}

export interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
}

export async function getGA4TrafficSources(days = 30): Promise<GA4TrafficSource[]> {
  const creds = await getCredentials();
  if (!creds) return [];

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`;

  const res = await fetchWithRefresh(creds, url, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.rows || []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
    source: row.dimensionValues[0]?.value || "(direct)",
    medium: row.dimensionValues[1]?.value || "(none)",
    sessions: parseInt(row.metricValues[0]?.value || "0"),
  }));
}

export interface GA4TopPage {
  path: string;
  title: string;
  views: number;
  avgTime: number;
}

export async function getGA4TopPages(days = 30): Promise<GA4TopPage[]> {
  const creds = await getCredentials();
  if (!creds) return [];

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`;

  const res = await fetchWithRefresh(creds, url, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [{ name: "screenPageViews" }, { name: "averageSessionDuration" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 10,
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.rows || []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
    path: row.dimensionValues[0]?.value || "/",
    title: row.dimensionValues[1]?.value || "",
    views: parseInt(row.metricValues[0]?.value || "0"),
    avgTime: parseFloat(row.metricValues[1]?.value || "0"),
  }));
}

export interface GA4DailyPoint {
  date: string;
  sessions: number;
  users: number;
}

export async function getGA4DailyTrend(days = 30): Promise<GA4DailyPoint[]> {
  const creds = await getCredentials();
  if (!creds) return [];

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`;

  const res = await fetchWithRefresh(creds, url, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensions: [{ name: "date" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.rows || []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
    date: row.dimensionValues[0]?.value || "",
    sessions: parseInt(row.metricValues[0]?.value || "0"),
    users: parseInt(row.metricValues[1]?.value || "0"),
  }));
}
