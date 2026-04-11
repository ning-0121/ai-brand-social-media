"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string;
  ai_generated?: boolean;
  created_at: string;
}

export default function ChatWidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [visitorName] = useState(() => `访客${Math.floor(Math.random() * 9000) + 1000}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      const lastTime = messages[messages.length - 1]?.created_at;
      const res = await fetch(`/api/chat/poll?conversation_id=${conversationId}${lastTime ? `&after=${lastTime}` : ""}`);
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newMsgs = data.messages.filter((m: Message) => !ids.has(m.id));
          return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId, messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      direction: "inbound",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: text,
          visitor_name: visitorName,
          channel: "chat",
          business_type: "d2c",
        }),
      });
      const data = await res.json();
      if (data.conversation_id) setConversationId(data.conversation_id);

      // Add AI reply if immediate
      if (data.ai_reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            direction: "outbound",
            content: data.ai_reply,
            ai_generated: true,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // send failed silently
    }
    setSending(false);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "#fff",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid #eee",
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        color: "#fff",
      }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>BrandMind 客服</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>AI 智能助手 · 通常即时回复</div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#999", fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            <div>您好！有什么可以帮您的吗？</div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.direction === "inbound" ? "flex-end" : "flex-start",
              marginBottom: 8,
            }}
          >
            <div style={{
              maxWidth: "80%",
              padding: "8px 12px",
              borderRadius: msg.direction === "inbound" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: msg.direction === "inbound" ? "#6366f1" : "#f3f4f6",
              color: msg.direction === "inbound" ? "#fff" : "#1f2937",
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
              {msg.ai_generated && (
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>✨ AI</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #eee", padding: 12, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="输入消息..."
          style={{
            flex: 1, border: "1px solid #e5e7eb", borderRadius: 20,
            padding: "8px 14px", fontSize: 14, outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            background: "#6366f1", color: "#fff", border: "none",
            borderRadius: 20, padding: "8px 16px", fontSize: 14,
            cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            opacity: input.trim() && !sending ? 1 : 0.5,
          }}
        >
          {sending ? "..." : "发送"}
        </button>
      </div>

      {/* Powered by */}
      <div style={{ textAlign: "center", padding: "4px 0 8px", fontSize: 10, color: "#ccc" }}>
        Powered by BrandMind AI
      </div>
    </div>
  );
}
