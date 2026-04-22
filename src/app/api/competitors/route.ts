import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { scrapeCompetitorUrl } from "@/lib/competitor-intel/url-scraper";
import { analyzeCompetitorGap } from "@/lib/competitor-intel/gap-analyzer";
import { calculateTotalScore } from "@/lib/competitor-intel/rubric";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "list";

  if (action === "list") {
    const { data } = await supabase
      .from("competitor_products")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json({ competitors: data || [] });
  }

  if (action === "get") {
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const { data } = await supabase.from("competitor_products").select("*").eq("id", id).single();
    return NextResponse.json({ competitor: data });
  }

  return NextResponse.json({ error: "未知 action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. 从 URL 创建竞品
    if (action === "create_from_url") {
      const { url: sourceUrl, our_product_id } = body;
      if (!sourceUrl) return NextResponse.json({ error: "缺少 url" }, { status: 400 });

      const scraped = await scrapeCompetitorUrl(sourceUrl);
      if (!scraped) {
        return NextResponse.json({
          error: "无法抓取该链接。请用「手动创建」填入竞品信息",
          fallback: "manual",
        }, { status: 422 });
      }

      const { data: created, error } = await supabase.from("competitor_products").insert({
        competitor_brand: scraped.brand_hint || "未命名品牌",
        product_name: scraped.product_name,
        product_url: sourceUrl,
        price_usd: scraped.price_usd,
        image_urls: scraped.image_urls,
        notes: scraped.description?.slice(0, 500),
        our_product_id: our_product_id || null,
        teardown_scores: {},
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ competitor: created, scraped });
    }

    // 2. 手动创建
    if (action === "create_manual") {
      const { competitor_brand, product_name, product_url, price_usd, our_product_id, notes } = body;
      if (!competitor_brand || !product_name) {
        return NextResponse.json({ error: "缺少 competitor_brand 或 product_name" }, { status: 400 });
      }
      const { data: created, error } = await supabase.from("competitor_products").insert({
        competitor_brand,
        product_name,
        product_url: product_url || null,
        price_usd: price_usd ? Number(price_usd) : null,
        our_product_id: our_product_id || null,
        notes: notes || null,
        teardown_scores: {},
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ competitor: created });
    }

    // 3. 更新打分
    if (action === "update_scores") {
      const { id, scores, status_updates } = body;
      if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

      const totals = calculateTotalScore(scores || {});
      const updates: Record<string, unknown> = {
        teardown_scores: scores || {},
        total_score: totals.total,
        teardown_completed: totals.completed >= totals.total_dimensions * 0.8,
        updated_at: new Date().toISOString(),
      };
      if (status_updates) {
        Object.assign(updates, status_updates);
      }
      const { data, error } = await supabase
        .from("competitor_products")
        .update(updates).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ competitor: data, totals });
    }

    // 4. 状态翻转（已购入/已收货）
    if (action === "mark_status") {
      const { id, purchased, received } = body;
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof purchased === "boolean") updates.purchased = purchased;
      if (typeof received === "boolean") updates.received = received;
      const { data, error } = await supabase
        .from("competitor_products").update(updates).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ competitor: data });
    }

    // 5. 触发 AI 差距分析
    if (action === "analyze") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
      const report = await analyzeCompetitorGap(id);
      return NextResponse.json({ report });
    }

    // 6. 删除
    if (action === "delete") {
      const { id } = body;
      const { error } = await supabase.from("competitor_products").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "API 失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
