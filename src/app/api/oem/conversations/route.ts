import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      // 单个对话详情 + 消息列表
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("*, buyer:buyers(*)")
        .eq("id", id)
        .single();

      const { data: messages } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      return NextResponse.json({ conversation: conv, messages: messages || [] });
    }

    // 列表
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("*, buyer:buyers(*)")
      .eq("status", "active")
      .order("last_message_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ conversations: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action, id, ...data } = body;

    if (action === "set_ai_mode") {
      await supabase
        .from("whatsapp_conversations")
        .update({ ai_mode: data.ai_mode, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    if (action === "mark_read") {
      await supabase
        .from("whatsapp_conversations")
        .update({ unread_count: 0 })
        .eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "操作失败" },
      { status: 500 }
    );
  }
}
