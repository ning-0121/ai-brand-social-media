import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const actorType = url.searchParams.get("actor_type");
  const actionType = url.searchParams.get("action_type");
  const status = url.searchParams.get("status");

  try {
    let query = supabase
      .from("audit_logs")
      .select("id, actor_type, actor_id, source_agent, action_type, target_type, target_id, status, error, duration_ms, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actorType) query = query.eq("actor_type", actorType);
    if (actionType) query = query.ilike("action_type", `%${actionType}%`);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ logs: data || [], count: data?.length || 0 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
