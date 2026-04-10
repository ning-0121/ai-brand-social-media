import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");

    let query = supabase
      .from("inquiries")
      .select("*, buyer:buyers(*)")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("ai_priority", priority);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ inquiries: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "update_status") {
      await supabase
        .from("inquiries")
        .update({ status: data.status, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "create") {
      const { data: created, error } = await supabase
        .from("inquiries")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, inquiry: created });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 500 }
    );
  }
}
