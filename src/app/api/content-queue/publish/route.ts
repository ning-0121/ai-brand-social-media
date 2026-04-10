import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";
import { processContentQueue, syncQueueStatus } from "@/lib/content-queue-processor";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  try {
    let query = supabase
      .from("content_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Count by status
    const items = data || [];
    const kpis = {
      total: items.length,
      queued: items.filter((i) => i.status === "queued").length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      published: items.filter((i) => i.status === "published").length,
      failed: items.filter((i) => i.status === "failed").length,
    };

    return NextResponse.json({ items, kpis });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { action } = await request.json();

    switch (action) {
      case "process_queue": {
        const result = await processContentQueue();
        // Also sync status of previously scheduled items
        const synced = await syncQueueStatus();
        return NextResponse.json({
          success: true,
          processed: result.processed,
          synced,
          errors: result.errors,
        });
      }

      case "sync_status": {
        const synced = await syncQueueStatus();
        return NextResponse.json({ success: true, synced });
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
