"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Briefcase, Mail, Phone, MessageCircle, Search, Globe } from "lucide-react";
import type { Buyer, RelationshipStage } from "@/lib/oem/types";

const STAGE_LABELS: Record<RelationshipStage, string> = {
  new: "新客户",
  engaged: "接触中",
  quoted: "已报价",
  sampled: "样品中",
  negotiating: "谈判中",
  customer: "正式客户",
  dormant: "休眠",
};

const STAGE_COLORS: Record<RelationshipStage, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  engaged: "bg-cyan-50 text-cyan-700 border-cyan-200",
  quoted: "bg-purple-50 text-purple-700 border-purple-200",
  sampled: "bg-amber-50 text-amber-700 border-amber-200",
  negotiating: "bg-orange-50 text-orange-700 border-orange-200",
  customer: "bg-green-50 text-green-700 border-green-200",
  dormant: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      const res = await fetch("/api/oem/buyers");
      const data = await res.json();
      setBuyers(data.buyers || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filtered = buyers.filter((b) => {
    if (stageFilter !== "all" && b.relationship_stage !== stageFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        b.company.toLowerCase().includes(s) ||
        (b.contact_name || "").toLowerCase().includes(s) ||
        (b.country || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="买家 CRM"
        description="OEM/ODM B2B 买家档案管理 — 来自 WhatsApp / 表单 / 邮件 / 推荐"
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">买家总数</p>
            <p className="text-2xl font-bold mt-1">{buyers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">正式客户</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {buyers.filter((b) => b.relationship_stage === "customer").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">谈判中</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">
              {buyers.filter((b) => b.relationship_stage === "negotiating").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">国家数</p>
            <p className="text-2xl font-bold mt-1">
              {new Set(buyers.map((b) => b.country).filter(Boolean)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索公司/联系人/国家..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(["all", "new", "engaged", "quoted", "sampled", "negotiating", "customer", "dormant"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-colors",
                stageFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {s === "all" ? "全部" : STAGE_LABELS[s as RelationshipStage]}
            </button>
          ))}
        </div>
      </div>

      {/* Buyer Cards */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">暂无买家</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <BuyerCard key={b.id} buyer={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BuyerCard({ buyer }: { buyer: Buyer }) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
              {buyer.company.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{buyer.company}</p>
              <p className="text-xs text-muted-foreground truncate">
                {buyer.contact_name || "未知联系人"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 shrink-0", STAGE_COLORS[buyer.relationship_stage])}
          >
            {STAGE_LABELS[buyer.relationship_stage]}
          </Badge>
        </div>

        {/* Country + Category */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {buyer.country && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {buyer.country}
            </span>
          )}
          {buyer.category && <span>{buyer.category}</span>}
          {buyer.estimated_annual_volume && (
            <span className="ml-auto text-[10px] text-foreground/60">
              {buyer.estimated_annual_volume} pcs/年
            </span>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {buyer.contact_email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{buyer.contact_email}</span>
            </div>
          )}
          {buyer.whatsapp_phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3 text-green-500" />
              <span>{buyer.whatsapp_phone}</span>
            </div>
          )}
          {buyer.contact_phone && !buyer.whatsapp_phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{buyer.contact_phone}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {buyer.tags && buyer.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {buyer.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {/* AI Insights */}
        {buyer.ai_insights && Object.keys(buyer.ai_insights).length > 0 && (
          <div className="rounded bg-blue-50/50 border border-blue-100 px-2 py-1.5 text-[11px] text-foreground/70">
            <span className="font-medium text-blue-700">AI 洞察: </span>
            {Object.entries(buyer.ai_insights)
              .map(([k, v]) => `${k}: ${String(v)}`)
              .join(" · ")
              .slice(0, 100)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
