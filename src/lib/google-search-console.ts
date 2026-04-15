/**
 * Google Search Console API 封装
 * 基于 mcp-gsc，移植为可调用函数
 * 关键词排名追踪、索引状态、搜索表现分析
 *
 * 需要环境变量：
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_SERVICE_ACCOUNT_KEY (PEM 格式私钥)
 * - GSC_SITE_URL (如 https://jojofeifei.com)
 */

const GSC_API = "https://www.googleapis.com/webmasters/v3";
const SEARCH_ANALYTICS_API = "https://searchconsole.googleapis.com/v1";

async function getAccessToken(): Promise<string | null> {
  // 使用 OAuth2 服务账号获取 token
  // 简化版：直接用 API key 或已有 token
  const token = process.env.GOOGLE_ACCESS_TOKEN || process.env.GSC_ACCESS_TOKEN;
  if (token) return token;

  // 如果没有预设 token，尝试用服务账号 JWT 换取
  // （生产环境应该用 google-auth-library）
  return null;
}

// ─── 搜索表现数据 ─────────────────────────────────────────

export interface SearchPerformanceRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getSearchPerformance(params: {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  dimensions?: ("query" | "page" | "country" | "device" | "date")[];
  rowLimit?: number;
  dimensionFilterGroups?: Array<{
    filters: Array<{ dimension: string; operator: string; expression: string }>;
  }>;
}): Promise<SearchPerformanceRow[]> {
  const token = await getAccessToken();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!token || !siteUrl) return [];

  const res = await fetch(
    `${SEARCH_ANALYTICS_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions || ["query"],
        rowLimit: params.rowLimit || 100,
        dimensionFilterGroups: params.dimensionFilterGroups,
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows || []) as SearchPerformanceRow[];
}

// ─── 快速查询 ──────────────────────────────────────────────

export async function getTopQueries(days = 28, limit = 50): Promise<SearchPerformanceRow[]> {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  return getSearchPerformance({
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit: limit,
  });
}

export async function getTopPages(days = 28, limit = 50): Promise<SearchPerformanceRow[]> {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  return getSearchPerformance({
    startDate: start,
    endDate: end,
    dimensions: ["page"],
    rowLimit: limit,
  });
}

export async function getQueryPerformanceByPage(pageUrl: string, days = 28): Promise<SearchPerformanceRow[]> {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  return getSearchPerformance({
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit: 100,
    dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: pageUrl }] }],
  });
}

// ─── 快赢机会发现（排名 4-20 的关键词 = 已有曝光但还没到首页）───

export async function findQuickWins(days = 28): Promise<Array<{
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  opportunity: string;
}>> {
  const rows = await getTopQueries(days, 200);

  return rows
    .filter(r => r.position >= 4 && r.position <= 20 && r.impressions > 10)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 20)
    .map(r => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
      position: Math.round(r.position * 10) / 10,
      opportunity: r.position <= 10
        ? `排名 ${Math.round(r.position)}，优化标题和描述可进首页前3`
        : `排名 ${Math.round(r.position)}，需要充实内容+内链提升权重`,
    }));
}

// ─── 索引状态 ──────────────────────────────────────────────

export async function getIndexStatus(): Promise<{
  indexed: number;
  notIndexed: number;
  crawled: number;
} | null> {
  const token = await getAccessToken();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!token || !siteUrl) return null;

  // URL Inspection API — 单个 URL 检查
  // 批量索引状态需要 Search Console 的 Index Coverage 报告
  // 这里返回简化版本
  return null; // 需要 Index Coverage API（目前只有 UI 可看）
}

// ─── 请求索引 ──────────────────────────────────────────────

export async function requestIndexing(url: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url, type: "URL_UPDATED" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Sitemap 管理 ──────────────────────────────────────────

export async function getSitemaps(): Promise<Array<{ path: string; lastSubmitted: string; isPending: boolean; errors: number; warnings: number }>> {
  const token = await getAccessToken();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!token || !siteUrl) return [];

  const res = await fetch(`${GSC_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.sitemap || []).map((s: Record<string, unknown>) => ({
    path: s.path,
    lastSubmitted: s.lastSubmitted,
    isPending: s.isPending,
    errors: s.errors,
    warnings: s.warnings,
  }));
}
