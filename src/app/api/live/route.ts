import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { data } = await supabase
      .from("live_sessions")
      .select("*")
      .order("scheduled_start", { ascending: false });
    return NextResponse.json({ sessions: data || [] });
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
      const { data: session, error } = await supabase
        .from("live_sessions").insert(data).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, session });
    }

    if (action === "update") {
      await supabase.from("live_sessions")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "update_metrics") {
      await supabase.from("live_sessions")
        .update({ metrics: data.metrics, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
