"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Inbox,
  MessageCircle,
  Mail,
  Globe,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import type { Inquiry } from "@/lib/oem/types";

const STATUS_LABELS: Record<string, string> = {
  new: "新询盘",
  in_progress: "进行中",
  quoted: "已报价",
  sampled: "样品中",
  closed_won: "成交",
  closed_lost: "已流失",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  quoted: "bg-purple-50 text-purple-700 border-purple-200",
  sampled: "bg-cyan-50 text-cyan-700 border-cyan-200",
  closed_won: "bg-green-50 text-green-700 border-green-200",
  closed_lost: "bg-gray-50 text-gray-600 border-gray-200",
};

const SOURCE_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  email: Mail,
  website_form: Globe,
  referral: Inbox,
};

const PRIORITY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  high: { icon: AlertTriangle, color: "text-red-500", label: "高" },
  medium: { icon: AlertCircle, color: "text-amber-500", label: "中" },
  low: { icon: Info, color: "text-gray-400", label: "低" },
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const res = await fetch("/api/oem/inquiries");
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filtered =
    filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

  // KPI 计算
  const stats = {
    new: inquiries.filter((i) => i.status === "new").length,
    in_progress: inquiries.filter((i) => i.status === "in_progress").length,
    quoted: inquiries.filter((i) => i.status === "quoted").length,
    won: inquiries.filter((i) => i.status === "closed_won").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="询盘看板"
        description="统一管理来自 WhatsApp / 网站表单 / 邮件 / 推荐的所有 OEM 询盘"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="新询盘" value={stats.new} color="text-blue-600" />
        <KpiCard label="进行中" value={stats.in_progress} color="text-amber-600" />
        <KpiCard label="已报价" value={stats.quoted} color="text-purple-600" />
        <KpiCard label="已成交" value={stats.won} color="text-green-600" />
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { v: "all", l: `全部 (${inquiries.length})` },
          { v: "new", l: `新询盘 (${stats.new})` },
          { v: "in_progress", l: `进行中 (${stats.in_progress})` },
          { v: "quoted", l: `已报价 (${stats.quoted})` },
          { v: "sampled", l: "样品中" },
          { v: "closed_won", l: "成交" },
          { v: "closed_lost", l: "流失" },
        ].map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
              filter === f.v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Inquiry List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无询盘</p>
            <p className="text-xs text-muted-foreground mt-1">
              询盘会从 WhatsApp / 表单 / 邮件 自动汇集到这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} onUpdate={fetchInquiries} />
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums mt-1", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InquiryCard({ inquiry, onUpdate }: { inquiry: Inquiry; onUpdate: () => void }) {
  const SourceIcon = SOURCE_ICONS[inquiry.source] || Inbox;
  const priority = PRIORITY_CONFIG[inquiry.ai_priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;
  const buyer = inquiry.buyer;

  const handleStatusChange = async (status: string) => {
    await fetch("/api/oem/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id: inquiry.id, status }),
    });
    onUpdate();
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <SourceIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="font-semibold text-sm">{buyer?.company || "未知买家"}</span>
              {buyer?.country && (
                <span className="text-xs text-muted-foreground">{buyer.country}</span>
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[inquiry.status])}
              >
                {STATUS_LABELS[inquiry.status]}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <PriorityIcon className={cn("h-2.5 w-2.5 mr-1", priority.color)} />
                {priority.label}优先
              </Badge>
            </div>
            {buyer?.contact_name && (
              <p className="text-xs text-muted-foreground">
                联系人: {buyer.contact_name}
                {buyer.contact_email && ` · ${buyer.contact_email}`}
              </p>
            )}
          </div>
        </div>

        {/* AI Summary */}
        {inquiry.ai_summary && (
          <div className="rounded-md bg-blue-50/50 border border-blue-100 px-3 py-2">
            <p className="text-xs font-medium text-blue-700 mb-0.5">AI 摘要</p>
            <p className="text-xs text-foreground/80">{inquiry.ai_summary}</p>
          </div>
        )}

        {/* Raw Content */}
        {inquiry.raw_content && (
          <div className="text-xs text-muted-foreground line-clamp-2 italic">
            &ldquo;{inquiry.raw_content}&rdquo;
          </div>
        )}

        {/* Extracted Needs */}
        {inquiry.ai_extracted_needs && Object.keys(inquiry.ai_extracted_needs).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(inquiry.ai_extracted_needs).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px]">
                {k}: {Array.isArray(v) ? v.join(", ") : String(v)}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {inquiry.status === "new" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleStatusChange("in_progress")}
            >
              开始处理
            </Button>
          )}
          {inquiry.status === "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => handleStatusChange("quoted")}
            >
              标记已报价
            </Button>
          )}
          {(inquiry.status === "quoted" || inquiry.status === "sampled") && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-green-700 border-green-300"
                onClick={() => handleStatusChange("closed_won")}
              >
                成交
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => handleStatusChange("closed_lost")}
              >
                流失
              </Button>
            </>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
            {new Date(inquiry.created_at).toLocaleString("zh-CN")}
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
