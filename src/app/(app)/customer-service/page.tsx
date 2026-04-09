"use client";

import { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Globe,
  Mail,
  Send,
  Loader2,
  Sparkles,
  Plus,
} from "lucide-react";

interface Conversation {
  id: string;
  display_name: string | null;
  phone: string;
  channel: string;
  business_type: string;
  last_message_at: string | null;
  unread_count: number;
  ai_mode: string;
  status: string;
  email?: string;
  subject?: string;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  content: string | null;
  ai_generated: boolean;
  ai_confidence: number | null;
  status: string;
  created_at: string;
}

const CHANNEL_CONFIG: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  whatsapp: { icon: MessageCircle, label: "WhatsApp", color: "text-green-500" },
  chat: { icon: Globe, label: "网站客服", color: "text-blue-500" },
  email: { icon: Mail, label: "邮件", color: "text-purple-500" },
};

export default function CustomerServicePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [showCreateEmail, setShowCreateEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({ name: "", email: "", subject: "", message: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchConversations(); }, []);
  useEffect(() => { if (selected) fetchMessages(selected.id); }, [selected]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/oem/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchMessages = async (id: string) => {
    const res = await fetch(`/api/oem/conversations?id=${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
    await fetch("/api/oem/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id }),
    });
  };

  const handleSend = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true);
    try {
      if (selected.channel === "whatsapp") {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: selected.id, phone: selected.phone, text: draft }),
        });
      } else {
        await fetch("/api/chat/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation_id: selected.id, message: draft, channel: selected.channel }),
        });
      }
      setDraft("");
      fetchMessages(selected.id);
    } catch (err) { console.error(err); }
    setSending(false);
  };

  const handleCreateEmailConversation = async () => {
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: emailForm.message,
          visitor_name: emailForm.name || emailForm.email,
          channel: "email",
          business_type: "d2c",
        }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        setShowCreateEmail(false);
        setEmailForm({ name: "", email: "", subject: "", message: "" });
        fetchConversations();
      }
    } catch (err) { console.error(err); }
  };

  const filtered = channelFilter === "all" ? conversations : conversations.filter((c) => c.channel === channelFilter);

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI 客服中心"
        description="WhatsApp + 网站客服 + 邮件 — 全渠道 AI 自动接待"
        actions={
          <Button size="sm" onClick={() => setShowCreateEmail(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            手动录入邮件
          </Button>
        }
      />

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Left: Conversation list */}
        <Card className="w-[320px] shrink-0 overflow-hidden flex flex-col">
          {/* Channel filter */}
          <div className="p-2 border-b flex gap-1">
            {[
              { v: "all", l: "全部" },
              { v: "whatsapp", l: "WA" },
              { v: "chat", l: "网站" },
              { v: "email", l: "邮件" },
            ].map((f) => (
              <button
                key={f.v}
                onClick={() => setChannelFilter(f.v)}
                className={cn(
                  "flex-1 py-1 rounded text-[11px] font-medium transition-colors",
                  channelFilter === f.v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {f.l}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">加载中...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                暂无对话
              </div>
            ) : (
              filtered.map((c) => {
                const ch = CHANNEL_CONFIG[c.channel] || CHANNEL_CONFIG.chat;
                const ChIcon = ch.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50",
                      selected?.id === c.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ChIcon className={cn("h-3.5 w-3.5 shrink-0", ch.color)} />
                        <span className="text-sm font-medium truncate">{c.display_name || c.phone}</span>
                      </div>
                      {c.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 h-4 shrink-0">{c.unread_count}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{ch.label}</span>
                      <span>{c.business_type === "oem" ? "OEM" : "D2C"}</span>
                      {c.last_message_at && (
                        <span className="ml-auto">{new Date(c.last_message_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Middle: Messages */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 text-muted-foreground/20" />
              <p className="text-sm">选择一个对话</p>
              <p className="text-xs mt-1">WhatsApp / 网站客服 / 邮件消息统一在此</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selected.display_name || selected.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {CHANNEL_CONFIG[selected.channel]?.label} · {selected.business_type === "oem" ? "OEM" : "D2C"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {selected.ai_mode === "auto" ? "🤖 AI 自动" : selected.ai_mode === "draft" ? "✨ AI 草稿" : "👤 人工"}
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                      m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {m.ai_generated && (
                        <div className="flex items-center gap-1 text-[10px] mb-1 opacity-70">
                          <Sparkles className="h-2.5 w-2.5" /> AI
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-3 flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="输入回复..."
                  className="flex-1 rounded-md border px-3 py-2 text-sm resize-none min-h-[50px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSend(); }
                  }}
                />
                <Button onClick={handleSend} disabled={!draft.trim() || sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create email conversation dialog */}
      {showCreateEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateEmail(false)}>
          <Card className="w-[480px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">手动录入客户邮件</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium">客户姓名</label><Input value={emailForm.name} onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })} className="mt-1" placeholder="John Doe" /></div>
              <div><label className="text-xs font-medium">客户邮箱</label><Input value={emailForm.email} onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} className="mt-1" placeholder="john@example.com" /></div>
              <div><label className="text-xs font-medium">邮件主题</label><Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="mt-1" placeholder="关于订单..." /></div>
              <div><label className="text-xs font-medium">邮件内容</label><textarea value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[100px]" placeholder="粘贴客户邮件内容..." /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateEmail(false)}>取消</Button>
              <Button onClick={handleCreateEmailConversation} disabled={!emailForm.message.trim()}>创建并 AI 回复</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
