import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { editImage } from "@/lib/image-editor";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const productId = url.searchParams.get("product_id");
    const source = url.searchParams.get("source");

    let query = supabase.from("media_library").select("*").order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);
    if (productId) query = query.eq("product_id", productId);
    if (source) query = query.eq("source", source);

    const { data, error } = await query.limit(100);
    if (error) throw error;

    return NextResponse.json({ media: data || [] });
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

    if (action === "register") {
      // Register an uploaded file (frontend uploads to Supabase Storage, then registers here)
      const { data: media, error } = await supabase.from("media_library").insert({
        filename: body.filename,
        original_url: body.url,
        thumbnail_url: body.url,
        media_type: body.media_type || "image",
        mime_type: body.mime_type,
        file_size: body.file_size,
        width: body.width,
        height: body.height,
        category: body.category || "general",
        tags: body.tags || [],
        product_id: body.product_id,
        product_name: body.product_name,
        source: "upload",
      }).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, media });
    }

    if (action === "ai_edit") {
      // AI edit an existing image — creates a new version, keeps original
      const { media_id, edit_prompt } = body;
      if (!media_id || !edit_prompt) {
        return NextResponse.json({ error: "缺少 media_id 或 edit_prompt" }, { status: 400 });
      }

      const { data: original } = await supabase
        .from("media_library").select("*").eq("id", media_id).single();
      if (!original) return NextResponse.json({ error: "未找到原图" }, { status: 404 });

      const result = await editImage(original.original_url, edit_prompt);

      if (!result.url) {
        return NextResponse.json({ error: result.error || "AI 修图失败" }, { status: 500 });
      }

      // Save as new media record, reference parent
      const { data: edited, error } = await supabase.from("media_library").insert({
        filename: `edited-${original.filename}`,
        original_url: result.url,
        thumbnail_url: result.url,
        media_type: "image",
        mime_type: "image/png",
        category: original.category,
        tags: [...(original.tags || []), "ai-edited"],
        product_id: original.product_id,
        product_name: original.product_name,
        source: "ai_edited",
        parent_id: media_id,
        ai_edit_prompt: edit_prompt,
      }).select().single();
      if (error) throw error;

      return NextResponse.json({ success: true, media: edited, original_preserved: true });
    }

    if (action === "delete") {
      await supabase.from("media_library").delete().eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    if (action === "update_tags") {
      await supabase.from("media_library")
        .update({ tags: body.tags, category: body.category, updated_at: new Date().toISOString() })
        .eq("id", body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
