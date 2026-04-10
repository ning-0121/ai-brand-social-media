import { NextResponse } from "next/server";
import { runRadarScan, getRadarSignals } from "@/lib/radar-engine";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const signals = await getRadarSignals(20);
    return NextResponse.json({ signals });
  } catch (error: unknown) {
    console.error("Radar GET error:", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "scan") {
      const result = await runRadarScan();
      const signals = await getRadarSignals(20);
      return NextResponse.json({ success: true, ...result, signals });
    }

    if (action === "dismiss") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
      await supabase
        .from("radar_signals")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Radar POST error:", error);
    const msg = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
