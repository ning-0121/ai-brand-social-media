import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateAiReply } from "@/lib/whatsapp/ai-replier";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { conversation_id, message, visitor_name, channel = "chat", business_type = "d2c" } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

    let convId = conversation_id as string | undefined;

    // Create conversation if new
    if (!convId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .insert({
          phone: `chat-${Date.now()}`,
          display_name: visitor_name || "网站访客",
          channel,
          business_type,
          ai_mode: "auto",
          status: "active",
          last_message_at: new Date().toISOString(),
          message_count: 0,
          unread_count: 0,
        })
        .select()
        .single();
      convId = conv?.id;
    }

    if (!convId) return NextResponse.json({ error: "创建对话失败" }, { status: 500 });

    // Save visitor message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: convId,
      direction: "inbound",
      message_type: "text",
      content: message,
      status: "received",
    });

    // Update conversation
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (await supabase.from("whatsapp_messages").select("id", { count: "exact" }).eq("conversation_id", convId)).count || 0,
        unread_count: 1,
      })
      .eq("id", convId);

    // Generate AI reply
    let aiReply: string | null = null;
    try {
      const result = await generateAiReply({
        buyerMessage: message,
        buyerPhone: "",
        buyerDisplayName: visitor_name || "网站访客",
        conversationId: convId,
        isFirstMessage: !conversation_id,
        businessType: business_type,
      });
      if (result?.reply) {
        aiReply = result.reply;

        // Save AI reply
        await supabase.from("whatsapp_messages").insert({
          conversation_id: convId,
          direction: "outbound",
          message_type: "text",
          content: aiReply,
          ai_generated: true,
          ai_confidence: result.confidence,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("AI reply failed:", err);
    }

    return NextResponse.json({
      success: true,
      conversation_id: convId,
      ai_reply: aiReply,
    });
  } catch (err) {
    console.error("Chat message error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "失败" }, { status: 500 });
  }
}
