import { supabase } from "../supabase";
import type {
  WhatsappWebhookPayload,
  WhatsappIncomingMessage,
} from "./types";
import { generateAiReply, shouldAutoSend } from "./ai-replier";
import { sendTextMessage } from "./client";

export async function handleWebhookPayload(payload: WhatsappWebhookPayload) {
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const contacts = value.contacts || [];
      const messages = value.messages || [];

      for (const message of messages) {
        const contact = contacts.find((c) => c.wa_id === message.from);
        const displayName = contact?.profile?.name || message.from;
        await processIncomingMessage(message, displayName);
      }
    }
  }
}

async function processIncomingMessage(
  message: WhatsappIncomingMessage,
  displayName: string
) {
  const phone = `+${message.from}`;

  // 1. 找/建对话
  let { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("whatsapp_conversations")
      .insert({
        phone,
        display_name: displayName,
        last_message_at: new Date().toISOString(),
        message_count: 1,
        unread_count: 1,
        ai_mode: "draft",
        status: "active",
      })
      .select()
      .single();
    conversation = newConv;
  } else {
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count || 0) + 1,
        unread_count: (conversation.unread_count || 0) + 1,
        display_name: displayName,
      })
      .eq("id", conversation.id);
  }

  if (!conversation) return;

  // 2. 提取消息内容
  const content = message.text?.body || message.image?.caption || message.document?.caption || "";
  const mediaId =
    message.image?.id || message.document?.id || message.audio?.id || message.video?.id || null;

  // 3. 写入消息
  await supabase.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    wamid: message.id,
    direction: "inbound",
    message_type: message.type === "voice" ? "audio" : (message.type as "text" | "image" | "document" | "audio" | "video"),
    content,
    media_url: mediaId,
    media_mime: message.image?.mime_type || message.document?.mime_type || null,
    status: "received",
    raw_payload: message as unknown as Record<string, unknown>,
  });

  // 4. 触发 AI 回复（如果对话是 auto 或 draft 模式）
  if (conversation.ai_mode === "off") return;

  try {
    const aiResult = await generateAiReply({
      buyerMessage: content,
      buyerPhone: phone,
      buyerDisplayName: displayName,
      conversationId: conversation.id,
      isFirstMessage: conversation.message_count <= 1,
    });

    if (!aiResult) return;

    const autoSend = conversation.ai_mode === "auto" && shouldAutoSend(aiResult, content, conversation.message_count);

    // 写入 AI 生成的回复
    const { data: aiMsg } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversation.id,
        direction: "outbound",
        message_type: "text",
        content: aiResult.reply,
        ai_generated: true,
        ai_confidence: aiResult.confidence,
        requires_approval: !autoSend,
        status: autoSend ? "queued" : "draft",
      })
      .select()
      .single();

    if (autoSend && aiMsg) {
      const sendResult = await sendTextMessage(phone, aiResult.reply);
      if (sendResult.wamid) {
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "sent",
            wamid: sendResult.wamid,
            sent_at: new Date().toISOString(),
          })
          .eq("id", aiMsg.id);
      } else {
        await supabase
          .from("whatsapp_messages")
          .update({ status: "failed" })
          .eq("id", aiMsg.id);
      }
    }
  } catch (err) {
    console.error("AI reply generation failed:", err);
  }
}
