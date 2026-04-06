import { supabase } from "./supabase";

// ============ Contents ============
export async function createContent(data: {
  title: string;
  body?: string;
  platform: string;
  content_type: string;
  status?: string;
  tags?: string[];
  scheduled_at?: string;
  thumbnail_url?: string;
}) {
  const { data: result, error } = await supabase
    .from("contents")
    .insert({ status: "draft", ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateContent(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from("contents")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteContent(id: string) {
  const { error } = await supabase.from("contents").delete().eq("id", id);
  if (error) throw error;
}

// ============ Products ============
export async function createProduct(data: {
  name: string;
  sku: string;
  price: number;
  stock?: number;
  status?: string;
  category?: string;
  platform: string;
  seo_score?: number;
}) {
  const { data: result, error } = await supabase
    .from("products")
    .insert({ status: "active", stock: 0, seo_score: 0, ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from("products")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ============ Social Accounts ============
export async function createSocialAccount(data: {
  platform: string;
  handle: string;
  display_name?: string;
  followers?: number;
}) {
  const { data: result, error } = await supabase
    .from("social_accounts")
    .insert({ connected: true, followers: 0, ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteSocialAccount(id: string) {
  const { error } = await supabase.from("social_accounts").delete().eq("id", id);
  if (error) throw error;
}

// ============ Scheduled Posts ============
export async function createScheduledPost(data: {
  content_preview: string;
  platform: string;
  scheduled_at: string;
  status?: string;
}) {
  const { data: result, error } = await supabase
    .from("scheduled_posts")
    .insert({ status: "queued", ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateScheduledPost(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from("scheduled_posts")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteScheduledPost(id: string) {
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) throw error;
}

// ============ Competitors ============
export async function createCompetitor(data: {
  name: string;
  platform: string;
  top_category?: string;
  followers?: number;
  avg_engagement?: number;
  growth_rate?: number;
  trend?: string;
  recent_campaigns?: number;
  url?: string;
}) {
  const { data: result, error } = await supabase
    .from("competitors")
    .insert({ trend: "flat", followers: 0, avg_engagement: 0, growth_rate: 0, recent_campaigns: 0, ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteCompetitor(id: string) {
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) throw error;
}

// ============ Influencers ============
export async function createInfluencer(data: {
  name: string;
  platform: string;
  handle?: string;
  followers?: number;
  engagement_rate?: number;
  category?: string;
  price_min?: number;
  price_max?: number;
  bio?: string;
  profile_url?: string;
}) {
  const { data: result, error } = await supabase
    .from("influencers")
    .insert({ status: "pending", ai_score: 0, collaboration_count: 0, ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateInfluencer(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from("influencers")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteInfluencer(id: string) {
  const { error } = await supabase.from("influencers").delete().eq("id", id);
  if (error) throw error;
}

// ============ Hot Products ============
export async function createHotProduct(data: {
  name: string;
  platform: string;
  category: string;
  sales_volume?: number;
  growth_rate?: number;
  trend?: string;
  price_range?: string;
  rating?: number;
}) {
  const { data: result, error } = await supabase
    .from("hot_products")
    .insert({ trend: "flat", sales_volume: 0, growth_rate: 0, ...data })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function deleteHotProduct(id: string) {
  const { error } = await supabase.from("hot_products").delete().eq("id", id);
  if (error) throw error;
}
