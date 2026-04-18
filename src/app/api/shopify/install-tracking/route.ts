import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { installTrackingSnippet } from "@/lib/shopify-operations";

export const maxDuration = 30;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { variant_id } = await request.json();
    if (!variant_id) return NextResponse.json({ error: "缺少 variant_id" }, { status: 400 });

    const { data: shopify } = await supabase.from("integrations")
      .select("id").eq("platform", "shopify").eq("status", "active").maybeSingle();
    if (!shopify) return NextResponse.json({ error: "未连接 Shopify" }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://brandmind-ai-eight.vercel.app";
    const result = await installTrackingSnippet(shopify.id, variant_id, appUrl);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "install failed" },
      { status: 500 }
    );
  }
}
