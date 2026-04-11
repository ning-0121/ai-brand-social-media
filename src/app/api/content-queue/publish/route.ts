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
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "publish_now": {
        const { postId } = body;
        if (!postId) return NextResponse.json({ error: "缺少 postId" }, { status: 400 });

        const { data: post, error: postErr } = await supabase
          .from("scheduled_posts")
          .select("*")
          .eq("id", postId)
          .single();

        if (postErr || !post) {
          return NextResponse.json({ error: "未找到该帖子" }, { status: 404 });
        }

        const { publishPost } = await import("@/lib/social-publisher");
        const result = await publishPost(post);

        if (result.success) {
          await supabase.from("scheduled_posts").update({
            status: "published",
            published_at: new Date().toISOString(),
          }).eq("id", postId);
          await syncQueueStatus();
          return NextResponse.json({ success: true, post_id: result.post_id });
        } else {
          await supabase.from("scheduled_posts").update({
            status: "failed",
          }).eq("id", postId);
          return NextResponse.json({ success: false, error: result.error || "发布失败" });
        }
      }

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
