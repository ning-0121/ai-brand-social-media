import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { rateLimitCreative } from "@/lib/rate-limiter";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const projectType = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const listTemplates = url.searchParams.get("templates");

    // Return templates list if requested
    if (listTemplates) {
      const { getTemplates } = await import("@/lib/template-registry");
      const templates = await getTemplates(projectType || undefined);
      return NextResponse.json({ templates });
    }

    let query = supabase.from("creative_projects").select("*").order("created_at", { ascending: false }).limit(50);
    if (projectType) query = query.eq("project_type", projectType);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    const all = data || [];
    return NextResponse.json({
      projects: all,
      kpis: {
        total: all.length,
        pages: all.filter((p) => p.project_type === "page").length,
        designs: all.filter((p) => p.project_type === "design").length,
        videos: all.filter((p) => p.project_type === "video").length,
        campaigns: all.filter((p) => p.project_type === "campaign").length,
        pending_review: all.filter((p) => p.status === "review" || p.status === "generating").length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rl = await rateLimitCreative(auth.userId);
  if (!rl.allowed) return rl.error;

  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "create") {
      // If template_id provided, load template and store on project
      if (data.template_id) {
        const { getTemplate } = await import("@/lib/template-registry");
        const template = await getTemplate(data.template_id);
        if (template) {
          data.brief = {
            ...((data.brief as Record<string, unknown>) || {}),
            template_schema: template.schema_json,
            template_defaults: template.default_copy_json,
            template_title: template.title,
          };
        }
      }
      const { data: project, error } = await supabase.from("creative_projects").insert(data).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, project });
    }

    if (action === "update") {
      await supabase.from("creative_projects").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      await supabase.from("creative_projects").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
