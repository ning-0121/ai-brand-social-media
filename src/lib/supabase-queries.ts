import { createClient } from "@supabase/supabase-js";

// Use anon key — this file runs in browser where service role key is unavailable.
// RLS requires auth.uid() IS NOT NULL, which the browser session provides via cookies.
// Note: createClient with anon key works when Supabase JS detects existing session cookies.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Hot Products
export async function getHotProducts() {
  const { data, error } = await supabase
    .from("hot_products")
    .select("id, name, platform, category, sales_volume, trend, growth_rate, price_range, rating, insight")
    .order("sales_volume", { ascending: false });
  if (error) throw error;
  return data;
}

// Competitors
export async function getCompetitors() {
  const { data, error } = await supabase
    .from("competitors")
    .select("id, name, platform, top_category, followers, avg_engagement, trend, growth_rate, recent_campaigns, monthly_sales")
    .order("monthly_sales", { ascending: false });
  if (error) throw error;
  return data;
}

// Contents
export async function getContents() {
  const { data, error } = await supabase
    .from("contents")
    .select("id, title, status, platform, content_type, views, likes, comments, shares, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Content Templates
export async function getContentTemplates() {
  const { data, error } = await supabase
    .from("content_templates")
    .select("id, title, description, category, platform, usage_count")
    .order("usage_count", { ascending: false });
  if (error) throw error;
  return data;
}

// Products
export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Social Accounts
export async function getSocialAccounts() {
  const { data, error } = await supabase
    .from("social_accounts")
    .select("id, platform, handle, display_name, followers, connected")
    .order("followers", { ascending: false });
  if (error) throw error;
  return data;
}

// Scheduled Posts
export async function getScheduledPosts() {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("id, title, content_preview, body, platform, scheduled_at, status, image_url, hashtags, published_at, error_message")
    .order("scheduled_at", { ascending: true });
  if (error) throw error;
  return data;
}

// Skill Packs
export async function getSkillPacks() {
  const { data, error } = await supabase
    .from("skill_packs")
    .select("*")
    .order("usage_count", { ascending: false });
  if (error) throw error;
  return data;
}

// Influencers
export async function getInfluencers() {
  const { data, error } = await supabase
    .from("influencers")
    .select("id, name, platform, followers, category, engagement_rate, price_min, price_max, ai_score, ai_analysis, status, collaboration_count, total_revenue, avg_roi, contacted_at")
    .order("ai_score", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []) as any[];
}

// ============ KPI Aggregations ============

// Content KPIs
export async function getContentKPIs() {
  const [
    { count: total },
    { count: published },
    { count: pending },
    { data: publishedItems },
  ] = await Promise.all([
    supabase.from("contents").select("id", { count: "exact", head: true }),
    supabase.from("contents").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("contents").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("contents").select("views, likes, comments, shares").eq("status", "published"),
  ]);
  const totalViews = publishedItems?.reduce((sum, i) => sum + (i.views || 0), 0) || 0;
  const totalLikes = publishedItems?.reduce((sum, i) => sum + (i.likes || 0), 0) || 0;
  const avgEngagement = totalViews > 0 ? ((totalLikes / totalViews) * 100) : 0;
  return {
    total: total || 0,
    published: published || 0,
    pending: pending || 0,
    avgEngagement: Math.round(avgEngagement * 10) / 10,
  };
}

// Store KPIs
export async function getStoreKPIs() {
  const { data: products } = await supabase.from("products").select("seo_score, stock, status");
  if (!products?.length) return { healthScore: 0, avgSEO: 0, totalProducts: 0, outOfStock: 0 };
  const avgSEO = Math.round(products.reduce((s, p) => s + (p.seo_score || 0), 0) / products.length);
  const outOfStock = products.filter(p => p.status === "out_of_stock").length;
  return {
    healthScore: Math.min(100, avgSEO + 10),
    avgSEO,
    totalProducts: products.length,
    outOfStock,
  };
}

// Social KPIs
export async function getSocialKPIs() {
  const [
    { count: totalAccounts },
    { count: connectedAccounts },
    { count: queuedPosts },
    { count: publishedPosts },
  ] = await Promise.all([
    supabase.from("social_accounts").select("id", { count: "exact", head: true }),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("connected", true),
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "queued"),
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);
  return {
    totalAccounts: totalAccounts || 0,
    connectedAccounts: connectedAccounts || 0,
    queuedPosts: queuedPosts || 0,
    publishedPosts: publishedPosts || 0,
  };
}

// Trends KPIs
export async function getTrendsKPIs() {
  const { data: products } = await supabase.from("hot_products").select("category, trend, growth_rate");
  const { count: competitorCount } = await supabase.from("competitors").select("id", { count: "exact", head: true });
  const categories = new Set(products?.map(p => p.category));
  const trending = products?.filter(p => p.trend === "up") || [];
  const avgGrowth = trending.length > 0
    ? Math.round(trending.reduce((s, p) => s + (p.growth_rate || 0), 0) / trending.length * 10) / 10
    : 0;
  return {
    categories: categories.size,
    trending: trending.length,
    avgGrowth,
    competitors: competitorCount || 0,
  };
}

// Influencer KPIs
export async function getInfluencerKPIs() {
  const { data: influencers } = await supabase.from("influencers").select("status, avg_roi, total_revenue");
  if (!influencers?.length) return { total: 0, active: 0, pending: 0, avgROI: 0 };
  const active = influencers.filter(i => i.status === "active").length;
  const pending = influencers.filter(i => i.status === "pending").length;
  const withROI = influencers.filter(i => i.avg_roi > 0);
  const avgROI = withROI.length > 0
    ? Math.round(withROI.reduce((s, i) => s + Number(i.avg_roi), 0) / withROI.length * 10) / 10
    : 0;
  return { total: influencers.length, active, pending, avgROI };
}

// Skills KPIs
export async function getSkillsKPIs() {
  const { data: skills } = await supabase.from("skill_packs").select("usage_count, title");
  if (!skills?.length) return { total: 0, topSkill: "-", totalUsage: 0 };
  const sorted = [...skills].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
  return {
    total: skills.length,
    topSkill: sorted[0]?.title || "-",
    totalUsage: skills.reduce((s, sk) => s + (sk.usage_count || 0), 0),
  };
}

// ============ Dashboard (Real Shopify Data) ============

export interface DashboardKPIs {
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  totalCustomers: number;
  revenueTrend: number;
  ordersTrend: number;
  customersTrend: number;
  currency: string;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs | null> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const [currentOrders, prevOrders, customers] = await Promise.all([
    supabase
      .from("shopify_orders")
      .select("total_price, currency")
      .gte("order_date", thirtyDaysAgo),
    supabase
      .from("shopify_orders")
      .select("total_price")
      .gte("order_date", sixtyDaysAgo)
      .lt("order_date", thirtyDaysAgo),
    supabase
      .from("shopify_customers")
      .select("id", { count: "exact", head: true }),
  ]);

  const current = currentOrders.data || [];
  const prev = prevOrders.data || [];

  if (current.length === 0 && prev.length === 0 && (customers.count || 0) === 0) {
    return null;
  }

  const totalRevenue = current.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const prevRevenue = prev.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalOrders = current.length;
  const prevOrderCount = prev.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalCustomers = customers.count || 0;

  const revenueTrend = prevRevenue > 0
    ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
    : totalRevenue > 0 ? 100 : 0;
  const ordersTrend = prevOrderCount > 0
    ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100
    : totalOrders > 0 ? 100 : 0;

  const currency = current[0]?.currency || "USD";

  return {
    totalRevenue,
    totalOrders,
    aov: Math.round(aov * 100) / 100,
    totalCustomers,
    revenueTrend: Math.round(revenueTrend * 10) / 10,
    ordersTrend: Math.round(ordersTrend * 10) / 10,
    customersTrend: 0,
    currency,
  };
}

export interface RevenueTimePoint {
  date: string;
  revenue: number;
  orders: number;
}

export async function getRevenueTimeSeries(days: number = 30): Promise<RevenueTimePoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("total_price, order_date")
    .gte("order_date", since)
    .order("order_date", { ascending: true });

  if (!orders?.length) return [];

  // Group by date
  const byDate = new Map<string, { revenue: number; orders: number }>();

  // Pre-fill all dates in range
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    byDate.set(key, { revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    const d = new Date(order.order_date);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const existing = byDate.get(key) || { revenue: 0, orders: 0 };
    existing.revenue += Number(order.total_price || 0);
    existing.orders += 1;
    byDate.set(key, existing);
  }

  return Array.from(byDate.entries()).map(([date, data]) => ({
    date,
    revenue: Math.round(data.revenue * 100) / 100,
    orders: data.orders,
  }));
}

export interface RecentOrder {
  id: string;
  order_number: string;
  total_price: number;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  order_date: string;
  email: string | null;
}

export async function getRecentOrders(limit: number = 6): Promise<RecentOrder[]> {
  const { data, error } = await supabase
    .from("shopify_orders")
    .select("id, order_number, total_price, currency, financial_status, fulfillment_status, order_date, email")
    .order("order_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as RecentOrder[];
}

export interface TopProduct {
  title: string;
  total_quantity: number;
  total_revenue: number;
}

export async function getTopProducts(limit: number = 5): Promise<TopProduct[]> {
  const { data: items } = await supabase
    .from("shopify_order_items")
    .select("title, quantity, price");

  if (!items?.length) return [];

  const byProduct = new Map<string, { quantity: number; revenue: number }>();
  for (const item of items) {
    const existing = byProduct.get(item.title) || { quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue += item.quantity * Number(item.price);
    byProduct.set(item.title, existing);
  }

  return Array.from(byProduct.entries())
    .map(([title, data]) => ({
      title,
      total_quantity: data.quantity,
      total_revenue: Math.round(data.revenue * 100) / 100,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);
}

export async function getTodayStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayOrders } = await supabase
    .from("shopify_orders")
    .select("total_price")
    .gte("order_date", todayStart.toISOString());

  const orders = todayOrders || [];
  return {
    todayRevenue: orders.reduce((sum, o) => sum + Number(o.total_price || 0), 0),
    todayOrders: orders.length,
  };
}
