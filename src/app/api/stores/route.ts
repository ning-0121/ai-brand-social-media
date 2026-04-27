import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 10;

// GET /api/stores — list all stores
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { data: stores, error } = await supabase
    .from("stores")
    .select("id, name, platform, status, currency, logo_url, integration_id, metadata")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stores: stores || [] });
}

// POST /api/stores — create a new store
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, platform, currency = "USD", integration_id, logo_url, metadata } = body;

  if (!name || !platform) {
    return NextResponse.json({ error: "name and platform are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("stores")
    .insert({
      name,
      platform,
      currency,
      integration_id: integration_id || null,
      logo_url: logo_url || null,
      metadata: metadata || {},
      owner_user_id: auth.userId || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ store: data });
}

// PATCH /api/stores — update a store
export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["name", "status", "currency", "logo_url", "metadata", "integration_id"];
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await supabase
    .from("stores")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store: data });
}
