"use client";

import { useEffect, useState, useRef } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { WhatsappConversation, WhatsappMessage } from "@/lib/oem/types";

export default function WhatsappPage() {
  const [conversations, setConversations] = useState<WhatsappConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsappConversation | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) fetchMessages(selectedConv.id);
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/oem/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchMessages = async (id: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/oem/conversations?id=${id}`);
      const data = await res.json();
      setMessages(data.messages || []);
      // mark as read
      await fetch("/api/oem/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", id }),
      });
    } catch (err) {
      console.error(err);
    }
    setLoadingMessages(false);
  };

  const handleSetAiMode = async (mode: string) => {
    if (!selectedConv) return;
    await fetch("/api/oem/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_ai_mode", id: selectedConv.id, ai_mode: mode }),
    });
    setSelectedConv({ ...selectedConv, ai_mode: mode as "auto" | "draft" | "off" });
    fetchConversations();
  };

  const handleSend = async () => {
    if (!draft.trim() || !selectedConv) return;
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConv.id,
          phone: selectedConv.phone,
          text: draft,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft("");
        fetchMessages(selectedConv.id);
      } else {
        alert(`发送失败: ${data.error || "未知错误"}`);
      }
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  const handleApproveDraft = async (messageId: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true, message_id: messageId }),
      });
      const data = await res.json();
      if (data.success && selectedConv) fetchMessages(selectedConv.id);
      else alert(`发送失败: ${data.error || "未知错误"}`);
    } catch (err) {
      console.error(err);
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="WhatsApp 收件箱"
        description="AI 全自动客服 + 人工监督。所有消息走 WhatsApp Business API"
      />

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left: Conversation list */}
        <Card className="w-[320px] shrink-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">对话 ({conversations.length})</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                暂无对话<br />
                <span className="text-[10px]">配置 WhatsApp Business API 后会自动接收</span>
              </div>
            ) : (
              conversations.map((c) => (
                <ConversationItem
                  key={c.id}
                  conv={c}
                  selected={selectedConv?.id === c.id}
                  onClick={() => setSelectedConv(c)}
                />
              ))
            )}
          </div>
        </Card>

        {/* Right: Conversation detail */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 text-muted-foreground/20" />
              <p className="text-sm">选择一个对话查看详情</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedConv.display_name || selectedConv.phone}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedConv.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">AI 模式</span>
                  <Select
                    value={selectedConv.ai_mode}
                    onValueChange={(v) => v && handleSetAiMode(v)}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="text-xs">
                        <div className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          全自动
                        </div>
                      </SelectItem>
                      <SelectItem value="draft" className="text-xs">
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI 草稿
                        </div>
                      </SelectItem>
                      <SelectItem value="off" className="text-xs">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          人工
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <Skeleton className="h-16" />
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">暂无消息</p>
                ) : (
                  messages.map((m) => (
                    <MessageBubble key={m.id} message={m} onApprove={handleApproveDraft} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3">
                <div className="flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="输入消息..."
                    className="flex-1 rounded-md border px-3 py-2 text-sm resize-none min-h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={!draft.trim() || sending}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  ⌘+Enter 发送 · 配置 WhatsApp Business API 后才能真实发送
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function ConversationItem({
  conv,
  selected,
  onClick,
}: {
  conv: WhatsappConversation;
  selected: boolean;
  onClick: () => void;
}) {
  const aiBadge = {
    auto: { icon: Bot, color: "text-green-600", label: "自动" },
    draft: { icon: Sparkles, color: "text-amber-600", label: "草稿" },
    off: { icon: User, color: "text-gray-400", label: "人工" },
  }[conv.ai_mode];
  const AiIcon = aiBadge.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors",
        selected && "bg-muted"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium truncate">{conv.display_name || conv.phone}</p>
        {conv.unread_count > 0 && (
          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 h-4">
            {conv.unread_count}
          </Badge>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground truncate">{conv.phone}</p>
      <div className="flex items-center gap-1 mt-1">
        <AiIcon className={cn("h-3 w-3", aiBadge.color)} />
        <span className="text-[10px] text-muted-foreground">{aiBadge.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {conv.last_message_at && formatRelativeTime(conv.last_message_at)}
        </span>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  onApprove,
}: {
  message: WhatsappMessage;
  onApprove: (id: string) => void;
}) {
  const isOutbound = message.direction === "outbound";
  const isDraft = message.status === "draft" && message.requires_approval;

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
          isOutbound
            ? isDraft
              ? "bg-amber-100 border border-amber-300"
              : "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.ai_generated && (
          <div className="flex items-center gap-1 text-[10px] mb-1 opacity-70">
            <Sparkles className="h-2.5 w-2.5" />
            AI 生成
            {message.ai_confidence && (
              <span>· 置信度 {Math.round(message.ai_confidence * 100)}%</span>
            )}
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {isDraft && (
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px]"
              onClick={() => onApprove(message.id)}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              批准发送
            </Button>
          </div>
        )}
        <p className={cn("text-[10px] mt-1", isOutbound && !isDraft ? "opacity-70" : "text-muted-foreground")}>
          {message.status} · {formatRelativeTime(message.created_at)}
        </p>
        {isDraft && (
          <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            等待审批
          </p>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}
