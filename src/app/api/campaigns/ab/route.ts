import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { composeAB, declareWinner } from "@/lib/campaign-ab";
import { supabase } from "@/lib/supabase";
import type { CampaignSpec } from "@/lib/campaign-composer";

export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data } = await supabase.from("campaign_variants").select("*").eq("id", id).single();
    return NextResponse.json({ variant: data });
  }

  const { data } = await supabase.from("campaign_variants")
    .select("id, campaign_name, winner, views_a, views_b, conversions_a, conversions_b, created_at")
    .order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ variants: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    if (body.action === "declare") {
      const r = await declareWinner(body.id);
      return NextResponse.json({ success: true, ...r });
    }
    const spec = body as CampaignSpec;
    if (!spec.name || !spec.goal) {
      return NextResponse.json({ error: "缺少 name 或 goal" }, { status: 400 });
    }
    const result = await composeAB(spec);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "A/B compose failed" },
      { status: 500 }
    );
  }
}
