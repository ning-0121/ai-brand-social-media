import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateWeeklyPlan, executeDailyTasks, recordPerformanceSnapshot, weeklyReview } from "@/lib/ops-director";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "goals") {
      const { data } = await supabase.from("ops_goals").select("*").order("created_at", { ascending: false });
      return NextResponse.json({ goals: data || [] });
    }

    if (type === "weekly_plan") {
      const mod = url.searchParams.get("module") || "store";
      const { data } = await supabase
        .from("ops_weekly_plans").select("*").eq("module", mod)
        .order("week_start", { ascending: false }).limit(1);
      return NextResponse.json({ plan: data?.[0] || null });
    }

    if (type === "daily_tasks") {
      const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("ops_daily_tasks").select("*").eq("task_date", date)
        .order("created_at", { ascending: true });
      return NextResponse.json({ tasks: data || [] });
    }

    if (type === "performance") {
      const days = parseInt(url.searchParams.get("days") || "30");
      const mod = url.searchParams.get("module") || "store";
      const since = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("ops_performance_snapshots").select("*").eq("module", mod)
        .gte("snapshot_date", since).order("snapshot_date", { ascending: true });
      return NextResponse.json({ snapshots: data || [] });
    }

    return NextResponse.json({ error: "未知类型" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create_goal": {
        const { module, metric, target_value, baseline_value, unit, deadline } = body;
        const { data } = await supabase.from("ops_goals").insert({
          module, metric, target_value, baseline_value: baseline_value || 0,
          current_value: baseline_value || 0, unit: unit || "", deadline,
        }).select().single();
        return NextResponse.json({ success: true, goal: data });
      }

      case "generate_plan": {
        const planId = await generateWeeklyPlan(body.module || "store");
        return NextResponse.json({ success: true, plan_id: planId });
      }

      case "execute_today": {
        const result = await executeDailyTasks();
        return NextResponse.json({ success: true, ...result });
      }

      case "record_snapshot": {
        await recordPerformanceSnapshot();
        return NextResponse.json({ success: true });
      }

      case "weekly_review": {
        await weeklyReview(body.module || "store");
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (err) {
    console.error("Ops director error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
