import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 30;

export interface WarehouseItem {
  id: string;
  source: "content_task" | "ops_task";
  skill_id: string;
  product_id: string | null;
  product_name: string | null;
  status: string;
  result: Record<string, unknown> | null;
  image_url: string | null;
  has_image: boolean;
  created_at: string;
}

function extractImageUrl(result: Record<string, unknown> | null): string | null {
  if (!result) return null;
  // Direct image_url on result
  if (typeof result.image_url === "string" && result.image_url.startsWith("http")) {
    return result.image_url;
  }
  // image_url in output sub-object
  const output = result.output as Record<string, unknown> | undefined;
  if (output && typeof output.image_url === "string" && output.image_url.startsWith("http")) {
    return output.image_url;
  }
  // image_url in preview sub-object
  const preview = result.preview as Record<string, unknown> | undefined;
  if (preview && typeof preview.image_url === "string" && preview.image_url.startsWith("http")) {
    return preview.image_url;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all"; // all | images | seo | pages | social
  const limit = parseInt(searchParams.get("limit") || "40");

  try {
    // ── 1. content_tasks (manual skill executions) ──
    const { data: contentTasks } = await supabase
      .from("content_tasks")
      .select("id, skill_id, product_id, product_name, source_module, status, result, created_at")
      .in("status", ["completed", "approved", "failed"])
      .order("created_at", { ascending: false })
      .limit(limit);

    // ── 2. ops_daily_tasks (auto-executed tasks with results) ──
    const { data: opsTasks } = await supabase
      .from("ops_daily_tasks")
      .select("id, task_type, target_product_id, target_product_name, execution_status, execution_result, created_at")
      .in("execution_status", ["auto_executed", "completed", "failed"])
      .not("execution_result", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    const items: WarehouseItem[] = [];

    // Map content_tasks
    for (const t of contentTasks || []) {
      const imgUrl = extractImageUrl(t.result);
      const item: WarehouseItem = {
        id: t.id,
        source: "content_task",
        skill_id: t.skill_id,
        product_id: (t as { product_id?: string | null }).product_id ?? null,
        product_name: t.product_name,
        status: t.status,
        result: t.result,
        image_url: imgUrl,
        has_image: !!imgUrl,
        created_at: t.created_at,
      };
      items.push(item);
    }

    // Map ops_daily_tasks
    for (const t of opsTasks || []) {
      const result = t.execution_result as Record<string, unknown> | null;
      const imgUrl = extractImageUrl(result);
      const skillId = t.task_type === "seo_fix" ? "product_seo_optimize"
        : t.task_type === "detail_page" ? "product_detail_page"
        : t.task_type === "post" ? "social_post_pack"
        : t.task_type === "landing_page" ? "landing_page"
        : t.task_type;

      const item: WarehouseItem = {
        id: t.id,
        source: "ops_task",
        skill_id: skillId,
        product_id: (t as { target_product_id?: string | null }).target_product_id ?? null,
        product_name: t.target_product_name || null,
        status: t.execution_status,
        result,
        image_url: imgUrl,
        has_image: !!imgUrl,
        created_at: t.created_at,
      };
      items.push(item);
    }

    // Sort by created_at desc
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply filter
    let filtered = items;
    if (filter === "images") filtered = items.filter((i) => i.has_image);
    else if (filter === "seo") filtered = items.filter((i) => i.skill_id.includes("seo"));
    else if (filter === "pages") filtered = items.filter((i) =>
      ["product_detail_page", "landing_page", "homepage_hero", "campaign_page"].includes(i.skill_id)
    );
    else if (filter === "social") filtered = items.filter((i) =>
      ["social_post_pack", "social_media_image", "campaign_poster", "banner_design", "ai_product_photo"].includes(i.skill_id)
    );

    return NextResponse.json({
      items: filtered.slice(0, limit),
      total: filtered.length,
      images_count: items.filter((i) => i.has_image).length,
      total_count: items.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "获取失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
