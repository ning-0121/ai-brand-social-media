import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let query = supabase.from("ad_campaigns").select("*").order("updated_at", { ascending: false });
    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    // KPIs
    const all = data || [];
    const active = all.filter((c) => c.status === "active");
    const totalSpend = all.reduce((s, c) => s + Number(c.spend || 0), 0);
    const totalRevenue = all.reduce((s, c) => s + Number(c.revenue || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    return NextResponse.json({
      campaigns: all,
      kpis: {
        total: all.length,
        active: active.length,
        total_spend: totalSpend,
        total_revenue: totalRevenue,
        avg_roas: Math.round(avgRoas * 100) / 100,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "create") {
      const { data: created, error } = await supabase.from("ad_campaigns").insert(data).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, campaign: created });
    }

    if (action === "update") {
      await supabase.from("ad_campaigns").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      await supabase.from("ad_campaigns").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
