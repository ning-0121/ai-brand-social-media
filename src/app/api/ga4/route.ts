import { NextResponse } from "next/server";
import { getGA4Overview, getGA4TrafficSources, getGA4TopPages, getGA4DailyTrend } from "@/lib/ga4-api";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "overview";
  const days = parseInt(searchParams.get("days") || "30");

  try {
    switch (type) {
      case "status": {
        const { data } = await supabase
          .from("integrations")
          .select("id, status, metadata")
          .eq("platform", "google_analytics")
          .eq("status", "active")
          .maybeSingle();
        if (!data) return NextResponse.json({ connected: false });
        const hasProperty = !!(
          data.metadata?.selected_property ||
          (data.metadata?.properties as unknown[])?.length > 0
        );
        return NextResponse.json({
          connected: true,
          hasProperty,
          selectedProperty: data.metadata?.selected_property || null,
          selectedPropertyName: data.metadata?.selected_property_name || null,
          properties: data.metadata?.properties || [],
        });
      }

      case "overview": {
        const data = await getGA4Overview(days);
        return NextResponse.json({ data });
      }
      case "traffic": {
        const data = await getGA4TrafficSources(days);
        return NextResponse.json({ data });
      }
      case "pages": {
        const data = await getGA4TopPages(days);
        return NextResponse.json({ data });
      }
      case "trend": {
        const data = await getGA4DailyTrend(days);
        return NextResponse.json({ data });
      }
      default:
        return NextResponse.json({ error: "不支持的 type" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GA4 数据获取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
