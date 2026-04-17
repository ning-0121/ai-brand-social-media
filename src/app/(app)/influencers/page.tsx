"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { AIAnalysisDialog } from "@/components/influencer/ai-analysis-dialog";
import { OutreachDialog } from "@/components/influencer/outreach-dialog";
import { CSVImportDialog } from "@/components/influencer/csv-import-dialog";
import { ModashSearchDialog } from "@/components/influencer/modash-search-dialog";
import { useSupabase } from "@/hooks/use-supabase";
import { getInfluencers, getInfluencerKPIs } from "@/lib/supabase-queries";
import { createInfluencer, updateInfluencer, deleteInfluencer } from "@/lib/supabase-mutations";
import { KPIData } from "@/lib/types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Sparkles, MessageCircle, Trash2, Loader2, Upload, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InfluencerStatus = "active" | "pending" | "inactive" | "blacklist";

const INFLUENCER_STATUS_LABEL: Record<InfluencerStatus, string> = {
  active: "合作中",
  pending: "待联系",
  inactive: "已结束",
  blacklist: "黑名单",
};

const INFLUENCER_STATUS_STYLE: Record<InfluencerStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
  blacklist: "bg-destructive/10 text-destructive border-destructive/20",
};

const AVATAR_COLORS = [
  "bg-pink-500", "bg-blue-500", "bg-purple-500", "bg-orange-500",
  "bg-green-500", "bg-rose-500", "bg-amber-500", "bg-cyan-500",
  "bg-teal-500", "bg-fuchsia-500", "bg-indigo-500", "bg-red-500",
];

// Influencer type for local state
interface InfluencerRecord {
  id: string;
  name: string;
  platform: string;
  followers: number;
  engagement_rate: number;
  category: string;
  price_min: number;
  price_max: number;
  status: string;
  ai_score: number;
  ai_analysis: Record<string, unknown>;
  collaboration_count: number;
  total_revenue: number;
  avg_roi: number;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
  profile_url: string | null;
  notes: string | null;
  contacted_at: string | null;
  last_collaboration_at: string | null;
  created_at: string;
  updated_at: string;
}

function formatFollowers(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(0) + "k";
  return num.toString();
}

function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : score > 0 ? "text-destructive" : "text-muted";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
        {score > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className={cn("transition-all duration-500", color)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className={cn("absolute text-[10px] font-bold tabular-nums", color)}>
        {score || "-"}
      </span>
    </div>
  );
}

export default function InfluencersPage() {
  const { data: kpiData } = useSupabase(getInfluencerKPIs, { total: 0, active: 0, pending: 0, avgROI: 0 });
  const kpis: KPIData[] = [
    { label: "达人总数", value: kpiData.total, trend: "up", trendPercent: 12, icon: "Users", format: "number", source: "shopify_live" },
    { label: "合作中", value: kpiData.active, trend: "up", trendPercent: 8, icon: "Handshake", format: "number", source: "shopify_live" },
    { label: "待联系", value: kpiData.pending, trend: "flat", trendPercent: 0, icon: "PhoneCall", format: "number", source: "shopify_live" },
    { label: "平均 ROI", value: kpiData.avgROI > 0 ? `${kpiData.avgROI}x` : "-", trend: "up", trendPercent: 15, icon: "TrendingUp", source: "our_estimate" },
  ];

  const { data: initialInfluencers } = useSupabase(getInfluencers, []);
  const [localInfluencers, setLocalInfluencers] = useState<InfluencerRecord[] | null>(null);
  const influencers = localInfluencers ?? initialInfluencers;

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ name: "", platform: "tiktok", followers: "", category: "", engagement_rate: "", price_min: "", price_max: "" });
  const [saving, setSaving] = useState(false);

  // AI dialogs
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerRecord | null>(null);

  // Import/Search dialogs
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [modashSearchOpen, setModashSearchOpen] = useState(false);

  const refreshInfluencers = useCallback(async () => {
    const fresh = await getInfluencers();
    setLocalInfluencers(fresh);
  }, []);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      await createInfluencer({
        name: formData.name.trim(),
        platform: formData.platform,
        followers: parseInt(formData.followers) || 0,
        category: formData.category || "未分类",
        engagement_rate: parseFloat(formData.engagement_rate) || 0,
        price_min: parseFloat(formData.price_min) || 0,
        price_max: parseFloat(formData.price_max) || 0,
      });
      setShowCreateDialog(false);
      setFormData({ name: "", platform: "tiktok", followers: "", category: "", engagement_rate: "", price_min: "", price_max: "" });
      await refreshInfluencers();
    } catch {
      toast.error("添加达人失败");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个达人吗？")) return;
    try {
      await deleteInfluencer(id);
      await refreshInfluencers();
    } catch {
      // Fallback for mock data
      setLocalInfluencers((prev) => (prev || influencers).filter((i) => i.id !== id));
    }
  };

  const handleScoreUpdate = async (id: string, score: number, analysis: Record<string, unknown> | object) => {
    try {
      await updateInfluencer(id, { ai_score: score, ai_analysis: analysis });
      await refreshInfluencers();
    } catch {
      // Update local state for mock data
      setLocalInfluencers((prev) =>
        (prev || influencers).map((i) => i.id === id ? { ...i, ai_score: score, ai_analysis: analysis } : i)
      );
    }
  };

  const handleOutreachStatusUpdate = async (id: string) => {
    try {
      await updateInfluencer(id, { status: "pending", contacted_at: new Date().toISOString() });
      await refreshInfluencers();
    } catch {
      setLocalInfluencers((prev) =>
        (prev || influencers).map((i) => i.id === id ? { ...i, status: "pending" } : i)
      );
    }
  };

  const filtered = influencers.filter((inf) => {
    const matchesName = inf.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = platformFilter === "all" || inf.platform === platformFilter;
    return matchesName && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="达人中心"
        description="AI 驱动的达人管理与合作优化"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCsvImportOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              批量导入
            </Button>
            <Button variant="outline" size="sm" onClick={() => setModashSearchOpen(true)}>
              <Globe className="mr-1.5 h-4 w-4" />
              全球搜索
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              手动添加
            </Button>
          </div>
        }
      />

      <KPICardGrid>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜索达人名称..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={platformFilter} onValueChange={(v) => v && setPlatformFilter(v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="xiaohongshu">小红书</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Influencer Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((inf) => {
          const avatarColor = AVATAR_COLORS[inf.name.charCodeAt(0) % AVATAR_COLORS.length];
          const status = inf.status as InfluencerStatus;

          return (
            <Card key={inf.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="p-4 space-y-3">
                {/* Top: Avatar + Name + AI Score */}
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm", avatarColor)}>
                    {inf.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{inf.name}</span>
                      <PlatformIcon platform={inf.platform as import("@/lib/types").Platform} showLabel />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFollowers(inf.followers)} 粉丝 · {inf.category}
                    </p>
                  </div>
                  <ScoreRing score={inf.ai_score} />
                </div>

                {/* Status + Stats */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={INFLUENCER_STATUS_STYLE[status] || ""}>
                    {INFLUENCER_STATUS_LABEL[status] || status}
                  </Badge>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>互动率 <span className="font-medium text-foreground">{inf.engagement_rate}%</span></span>
                    <span>¥{inf.price_min?.toLocaleString()}-{inf.price_max?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Collaboration stats */}
                {inf.collaboration_count > 0 && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-2">
                    <span>合作 <span className="font-medium text-foreground">{inf.collaboration_count}</span> 次</span>
                    <span>累计 <span className="font-medium text-foreground">¥{inf.total_revenue?.toLocaleString()}</span></span>
                    {Number(inf.avg_roi) > 0 && <span>ROI <span className="font-medium text-emerald-600">{inf.avg_roi}x</span></span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950"
                    onClick={() => { setSelectedInfluencer(inf); setAnalysisOpen(true); }}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    AI 分析
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => { setSelectedInfluencer(inf); setOutreachOpen(true); }}
                  >
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                    生成外联
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(inf.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">未找到匹配的达人，请调整搜索条件</p>
        </div>
      )}

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImported={refreshInfluencers}
      />

      {/* Modash Search Dialog */}
      <ModashSearchDialog
        open={modashSearchOpen}
        onOpenChange={setModashSearchOpen}
        onImported={refreshInfluencers}
      />

      {/* AI Analysis Dialog */}
      <AIAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        influencer={selectedInfluencer ? {
          id: selectedInfluencer.id,
          name: selectedInfluencer.name,
          platform: selectedInfluencer.platform,
          followers: selectedInfluencer.followers,
          engagement_rate: selectedInfluencer.engagement_rate,
          category: selectedInfluencer.category,
          price_min: selectedInfluencer.price_min,
          price_max: selectedInfluencer.price_max,
        } : null}
        onScoreUpdate={handleScoreUpdate}
      />

      {/* Outreach Dialog */}
      <OutreachDialog
        open={outreachOpen}
        onOpenChange={setOutreachOpen}
        influencer={selectedInfluencer ? {
          id: selectedInfluencer.id,
          name: selectedInfluencer.name,
          platform: selectedInfluencer.platform,
          category: selectedInfluencer.category,
        } : null}
        onStatusUpdate={handleOutreachStatusUpdate}
      />

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加达人</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">达人名称</label>
              <Input placeholder="输入达人名称" value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">平台</label>
                <Select value={formData.platform} onValueChange={(v) => v && setFormData((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="xiaohongshu">小红书</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">粉丝数</label>
                <Input type="number" placeholder="例如: 128000" value={formData.followers} onChange={(e) => setFormData((f) => ({ ...f, followers: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">品类</label>
                <Input placeholder="例如: 美妆" value={formData.category} onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">互动率 (%)</label>
                <Input type="number" step="0.1" placeholder="例如: 6.8" value={formData.engagement_rate} onChange={(e) => setFormData((f) => ({ ...f, engagement_rate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">最低报价 (¥)</label>
                <Input type="number" placeholder="5000" value={formData.price_min} onChange={(e) => setFormData((f) => ({ ...f, price_min: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">最高报价 (¥)</label>
                <Input type="number" placeholder="12000" value={formData.price_max} onChange={(e) => setFormData((f) => ({ ...f, price_max: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving || !formData.name.trim()}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {saving ? "添加中..." : "添加达人"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
