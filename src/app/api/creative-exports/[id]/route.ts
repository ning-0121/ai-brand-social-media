import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { data: exportData, error } = await supabase
      .from("creative_exports")
      .select("*, project:creative_projects(title, brief, generated_output)")
      .eq("id", params.id)
      .single();

    if (error || !exportData) {
      return NextResponse.json({ error: "未找到导出记录" }, { status: 404 });
    }

    return NextResponse.json({ export: exportData });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { action } = await request.json();

    if (action === "mark_downloaded") {
      await supabase
        .from("creative_exports")
        .update({
          status: "downloaded",
          downloaded_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      return NextResponse.json({ success: true, status: "downloaded" });
    }

    return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 }
    );
  }
}
