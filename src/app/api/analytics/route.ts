import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";
import { getActionImpacts } from "@/lib/action-impact-tracker";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    switch (type) {
      case "kpi_comparison": {
        const kpis = await getKPIComparison();
        return NextResponse.json(kpis);
      }

      case "action_impacts": {
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const result = await getActionImpacts(limit, offset);
        return NextResponse.json(result);
      }

      case "ai_stats": {
        const stats = await getAIStats();
        return NextResponse.json(stats);
      }

      default:
        return NextResponse.json({ error: "请指定 type 参数" }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

async function getKPIComparison() {
  const now = new Date();
  const thisWeekStart = getMonday(now);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const [thisWeek, lastWeek] = await Promise.all([
    getWeekRevenue(thisWeekStart.toISOString(), now.toISOString()),
    getWeekRevenue(lastWeekStart.toISOString(), thisWeekStart.toISOString()),
  ]);

  const change = (current: number, prev: number) =>
    prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : 0;

  return {
    this_week: thisWeek,
    last_week: lastWeek,
    changes: {
      revenue: change(thisWeek.revenue, lastWeek.revenue),
      orders: change(thisWeek.orders, lastWeek.orders),
      aov: change(thisWeek.aov, lastWeek.aov),
      customers: change(thisWeek.customers, lastWeek.customers),
    },
  };
}

async function getWeekRevenue(startDate: string, endDate: string) {
  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("total_price")
    .gte("order_date", startDate)
    .lt("order_date", endDate);

  const { data: customers } = await supabase
    .from("shopify_customers")
    .select("id")
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  const revenue = (orders || []).reduce((s, o) => s + Number(o.total_price || 0), 0);
  const orderCount = orders?.length || 0;

  return {
    revenue: Math.round(revenue * 100) / 100,
    orders: orderCount,
    aov: orderCount > 0 ? Math.round((revenue / orderCount) * 100) / 100 : 0,
    customers: customers?.length || 0,
  };
}

async function getAIStats() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("audit_logs")
    .select("action_type, status, duration_ms")
    .gte("created_at", since);

  const logs = data || [];
  const total = logs.length;
  const success = logs.filter((l) => l.status === "success").length;
  const avgDuration = total > 0
    ? Math.round(logs.reduce((s, l) => s + (l.duration_ms || 0), 0) / total)
    : 0;

  const byType: Record<string, { count: number; success: number }> = {};
  for (const log of logs) {
    if (!byType[log.action_type]) byType[log.action_type] = { count: 0, success: 0 };
    byType[log.action_type].count++;
    if (log.status === "success") byType[log.action_type].success++;
  }

  return {
    total,
    success,
    failed: total - success,
    success_rate: total > 0 ? Math.round((success / total) * 100) : 0,
    avg_duration_ms: avgDuration,
    by_type: Object.entries(byType)
      .map(([type, stats]) => ({ type, ...stats }))
      .sort((a, b) => b.count - a.count),
  };
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
