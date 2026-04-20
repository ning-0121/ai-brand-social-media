import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 15;

/**
 * POST { task_ids: string[] } — 批量把 failed 重置成 pending
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { task_ids } = await request.json();
    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json({ error: "缺少 task_ids" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("ops_daily_tasks")
      .update({
        execution_status: "pending",
        execution_result: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", task_ids)
      .eq("execution_status", "failed")
      .select("id");

    if (error) throw error;
    return NextResponse.json({ success: true, retried: data?.length || 0 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "retry failed" },
      { status: 500 }
    );
  }
}
