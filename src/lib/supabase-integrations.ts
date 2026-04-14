import { createClient } from "./supabase-browser";

// Use browser client — this file is imported by client-side pages (settings).
// Browser client carries user session cookies so auth.uid() works with RLS.
const supabase = createClient();

export interface Integration {
  id: string;
  user_id?: string;
  platform: string;
  store_name: string;
  store_url?: string;
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  status: "active" | "inactive" | "error";
  last_synced_at?: string;
  sync_enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Safe columns to return (excludes api_key, api_secret, access_token)
const SAFE_COLUMNS = "id,user_id,platform,store_name,store_url,status,last_synced_at,sync_enabled,metadata,created_at,updated_at";

export async function getIntegrations() {
  const { data, error } = await supabase
    .from("integrations")
    .select(SAFE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Integration[];
}

export async function createIntegration(data: {
  platform: string;
  store_name: string;
  store_url?: string;
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  user_id?: string;
}) {
  const { data: result, error } = await supabase
    .from("integrations")
    .insert({ status: "active", sync_enabled: true, metadata: {}, ...data })
    .select()
    .single();
  if (error) throw error;
  return result as Integration;
}

export async function updateIntegration(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabase
    .from("integrations")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as Integration;
}

export async function deleteIntegration(id: string) {
  const { error } = await supabase.from("integrations").delete().eq("id", id);
  if (error) throw error;
}

export async function getIntegrationByPlatform(platform: string) {
  const { data, error } = await supabase
    .from("integrations")
    .select(SAFE_COLUMNS)
    .eq("platform", platform)
    .eq("status", "active")
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as Integration | null;
}

/**
 * Get integration with credentials — use only in server-side code
 * that needs the actual API keys (e.g., Shopify sync, OAuth).
 */
export async function getIntegrationWithCredentials(id: string) {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Integration;
}
