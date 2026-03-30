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

// Dashboard aggregations
export async function getDashboardStats() {
  const [
    { count: totalProducts },
    { count: totalContents },
    { count: publishedContents },
    { count: pendingPosts },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("contents").select("*", { count: "exact", head: true }),
    supabase.from("contents").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("status", "queued"),
  ]);

  return {
    totalProducts: totalProducts || 0,
    totalContents: totalContents || 0,
    publishedContents: publishedContents || 0,
    pendingPosts: pendingPosts || 0,
  };
}
