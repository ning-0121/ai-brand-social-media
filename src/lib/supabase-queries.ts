import { supabase } from "./supabase";

// Hot Products
export async function getHotProducts() {
  const { data, error } = await supabase
    .from("hot_products")
    .select("*")
    .order("sales_volume", { ascending: false });
  if (error) throw error;
  return data;
}

// Competitors
export async function getCompetitors() {
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .order("monthly_sales", { ascending: false });
  if (error) throw error;
  return data;
}

// Contents
export async function getContents() {
  const { data, error } = await supabase
    .from("contents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Content Templates
export async function getContentTemplates() {
  const { data, error } = await supabase
    .from("content_templates")
    .select("*")
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
    .select("*")
    .order("followers", { ascending: false });
  if (error) throw error;
  return data;
}

// Scheduled Posts
export async function getScheduledPosts() {
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*")
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
    .select("*")
    .order("ai_score", { ascending: false });
  if (error) throw error;
  return data;
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
    supabase.from("contents").select("*", { count: "exact", head: true }),
    supabase.from("contents").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("contents").select("*", { count: "exact", head: true }).eq("status", "pending"),
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
    supabase.from("social_accounts").select("*", { count: "exact", head: true }),
    supabase.from("social_accounts").select("*", { count: "exact", head: true }).eq("connected", true),
    supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "queued"),
    supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "published"),
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
  const { count: competitorCount } = await supabase.from("competitors").select("*", { count: "exact", head: true });
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
