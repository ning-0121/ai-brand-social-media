import { supabase } from "./supabase";

export interface BrandProfile {
  id: string;
  brand_name: string;
  voice_style: string | null;
  visual_style: string | null;
  target_audience: string | null;
  key_categories: string[];
  preferred_platforms: string[];
  primary_colors: string[];
  secondary_colors: string[];
  typography_notes: string | null;
  banned_words: string[];
  core_value_props: string[];
  pricing_position: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory cache (60s TTL) to avoid N+1 queries during batch skill executions
let cachedProfile: BrandProfile | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export async function getBrandProfile(): Promise<BrandProfile | null> {
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[brand-profile] Fetch error:", error.message);
    return null;
  }
  return data as BrandProfile | null;
}

export async function getBrandProfileCached(): Promise<BrandProfile | null> {
  const now = Date.now();
  if (cachedProfile && now - cacheTimestamp < CACHE_TTL) {
    return cachedProfile;
  }
  cachedProfile = await getBrandProfile();
  cacheTimestamp = now;
  return cachedProfile;
}

export function invalidateBrandCache(): void {
  cachedProfile = null;
  cacheTimestamp = 0;
}

export async function upsertBrandProfile(
  data: Partial<Omit<BrandProfile, "id" | "created_at" | "updated_at">> & { id?: string }
): Promise<BrandProfile> {
  const existing = data.id ? data : await getBrandProfile();

  if (existing?.id) {
    const { data: updated, error } = await supabase
      .from("brand_profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", (existing as BrandProfile).id)
      .select()
      .single();
    if (error) throw error;
    invalidateBrandCache();
    return updated as BrandProfile;
  }

  const { data: created, error } = await supabase
    .from("brand_profiles")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  invalidateBrandCache();
  return created as BrandProfile;
}
