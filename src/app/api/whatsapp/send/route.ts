import { NextResponse } from "next/server";
import { sendTextMessage } from "@/lib/whatsapp/client";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversation_id, message_id, text, phone, approve } = body;

    // Mode 1: Approve a draft message
    if (approve && message_id) {
      const { data: msg } = await supabase
        .from("whatsapp_messages")
        .select("*, conversation:whatsapp_conversations(phone)")
        .eq("id", message_id)
        .single();

      if (!msg) return NextResponse.json({ error: "未找到消息" }, { status: 404 });

      const conv = msg.conversation as { phone: string } | null;
      const targetPhone = conv?.phone;
      if (!targetPhone) return NextResponse.json({ error: "对话信息缺失" }, { status: 400 });

      const result = await sendTextMessage(targetPhone, msg.content);
      if (result.error) {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "failed" })
          .eq("id", message_id);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      await supabase
        .from("whatsapp_messages")
        .update({
          status: "sent",
          wamid: result.wamid,
          sent_at: new Date().toISOString(),
          requires_approval: false,
          approved_at: new Date().toISOString(),
        })
        .eq("id", message_id);

      return NextResponse.json({ success: true, wamid: result.wamid });
    }

    // Mode 2: Send a new message directly
    if (!text || (!phone && !conversation_id)) {
      return NextResponse.json({ error: "缺少 text 和 phone/conversation_id" }, { status: 400 });
    }

    let targetPhone = phone as string | undefined;
    let convId = conversation_id as string | undefined;

    if (!targetPhone && convId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("phone")
        .eq("id", convId)
        .single();
      targetPhone = conv?.phone;
    }

    if (!targetPhone) return NextResponse.json({ error: "无法解析目标号码" }, { status: 400 });

    if (!convId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("phone", targetPhone)
        .maybeSingle();
      convId = conv?.id;
    }

    const result = await sendTextMessage(targetPhone, text);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

    if (convId) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: convId,
        wamid: result.wamid,
        direction: "outbound",
        message_type: "text",
        content: text,
        ai_generated: false,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, wamid: result.wamid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
