import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const stage = url.searchParams.get("stage");
    const country = url.searchParams.get("country");

    if (id) {
      const { data, error } = await supabase
        .from("buyers")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return NextResponse.json({ buyer: data });
    }

    let query = supabase.from("buyers").select("*").order("updated_at", { ascending: false });
    if (stage) query = query.eq("relationship_stage", stage);
    if (country) query = query.eq("country", country);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ buyers: data || [] });
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

    if (action === "create") {
      const { data: created, error } = await supabase
        .from("buyers")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, buyer: created });
    }

    if (action === "update") {
      await supabase
        .from("buyers")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 500 }
    );
  }
}
