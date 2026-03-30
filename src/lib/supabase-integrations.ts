import { supabase } from "./supabase";

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

export async function getIntegrations() {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
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
    .select("*")
    .eq("platform", platform)
    .eq("status", "active")
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data as Integration | null;
}
