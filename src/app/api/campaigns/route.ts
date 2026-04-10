import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = supabase.from("campaigns").select("*").order("start_date", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ campaigns: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "create") {
      const { data: created, error } = await supabase.from("campaigns").insert(data).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, campaign: created });
    }

    if (action === "update") {
      await supabase.from("campaigns").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      await supabase.from("campaigns").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
