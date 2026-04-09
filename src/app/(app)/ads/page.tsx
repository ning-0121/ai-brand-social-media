"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  Plus,
  Loader2,
  DollarSign,
  TrendingUp,
  MousePointer,
  Target,
  Pause,
  Play,
  Trash2,
  Sparkles,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

interface AdCampaign {
  id: string; name: string; platform: string; status: string; campaign_type: string;
  budget: number; budget_type: string; impressions: number; clicks: number;
  conversions: number; spend: number; revenue: number; roas: number;
}

const PLATFORM_LABELS: Record<string, string> = { google: "Google Ads", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", pinterest: "Pinterest" };
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-600" }, active: { label: "投放中", color: "bg-green-100 text-green-700" },
  paused: { label: "已暂停", color: "bg-yellow-100 text-yellow-700" }, ended: { label: "已结束", color: "bg-blue-100 text-blue-700" },
};

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, total_spend: 0, total_revenue: 0, avg_roas: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "facebook", campaign_type: "conversion", budget: "", budget_type: "daily" });

  useEffect(() => { fetch("/api/ads").then((r) => r.json()).then((d) => { setCampaigns(d.campaigns || []); if (d.kpis) setKpis(d.kpis); }).finally(() => setLoading(false)); }, []);

  const refetch = () => fetch("/api/ads").then((r) => r.json()).then((d) => { setCampaigns(d.campaigns || []); if (d.kpis) setKpis(d.kpis); });

  const handleCreate = async () => {
    setCreating(true);
    await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form, budget: parseFloat(form.budget) || 0, status: "draft" }) });
    setShowCreate(false); setForm({ name: "", platform: "facebook", campaign_type: "conversion", budget: "", budget_type: "daily" });
    refetch(); setCreating(false);
  };

  const handleStatus = async (id: string, status: string) => { await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, status }) }); refetch(); };
  const handleDelete = async (id: string) => { await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) }); refetch(); };

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader title="广告投放" description="管理 Google / Facebook / TikTok 广告 — AI 创意 + 预算优化 + 受众策略" actions={
        <div className="flex gap-2">
          <Link href="/content"><Button variant="outline" size="sm"><Sparkles className="mr-1.5 h-3.5 w-3.5" />AI 生成创意</Button></Link>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />新建计划</Button>
        </div>
      } />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总计划</p><p className="text-2xl font-bold mt-1">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">投放中</p><p className="text-2xl font-bold mt-1 text-green-600">{kpis.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总花费</p><p className="text-2xl font-bold mt-1">${kpis.total_spend.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总收入</p><p className="text-2xl font-bold mt-1 text-green-600">${kpis.total_revenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ROAS</p><p className="text-2xl font-bold mt-1 text-blue-600">{kpis.avg_roas}x</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[{ l: "AI 广告文案", d: "3 组 A/B 测试变体" }, { l: "AI 预算规划", d: "分配 + ROI 预测" }, { l: "AI 受众策略", d: "精准定位方案" }].map((i) => (
          <Link key={i.l} href="/content"><Card className="cursor-pointer hover:shadow-sm hover:border-primary/20"><CardContent className="p-4 flex items-center gap-3"><Sparkles className="h-5 w-5 text-amber-500" /><div><p className="text-sm font-medium">{i.l}</p><p className="text-xs text-muted-foreground">{i.d}</p></div></CardContent></Card></Link>
        ))}
      </div>

      <div className="flex gap-2">
        {["all", "draft", "active", "paused", "ended"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border", filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>{s === "all" ? "全部" : STATUS_CFG[s]?.label || s}</button>
        ))}
      </div>

      {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div> : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">暂无广告计划</p><Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />创建第一个</Button></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-sm"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1"><p className="text-sm font-semibold">{c.name}</p><Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[c.platform] || c.platform}</Badge><Badge variant="outline" className={cn("text-[10px]", STATUS_CFG[c.status]?.color)}>{STATUS_CFG[c.status]?.label}</Badge></div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2"><span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${c.budget}/{c.budget_type === "daily" ? "天" : "总"}</span><span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{c.clicks} 点击</span><span className="flex items-center gap-1"><Target className="h-3 w-3" />{c.conversions} 转化</span><span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />ROAS {c.roas}x</span></div>
            </div><div className="flex gap-1">
              {c.status === "draft" && <Button size="sm" variant="outline" className="h-7" onClick={() => handleStatus(c.id, "active")}><Play className="h-3 w-3 mr-1" />启动</Button>}
              {c.status === "active" && <Button size="sm" variant="outline" className="h-7" onClick={() => handleStatus(c.id, "paused")}><Pause className="h-3 w-3 mr-1" />暂停</Button>}
              {c.status === "paused" && <Button size="sm" variant="outline" className="h-7" onClick={() => handleStatus(c.id, "active")}><Play className="h-3 w-3 mr-1" />恢复</Button>}
              <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
            </div></div></CardContent></Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>新建广告计划</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">计划名称</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="如：春季新品推广" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">投放平台</label><Select value={form.platform} onValueChange={(v) => v && setForm({ ...form, platform: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLATFORM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs font-medium">投放目标</label><Select value={form.campaign_type} onValueChange={(v) => v && setForm({ ...form, campaign_type: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="awareness">品牌曝光</SelectItem><SelectItem value="traffic">引流</SelectItem><SelectItem value="conversion">转化</SelectItem><SelectItem value="retargeting">再营销</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">预算 (USD)</label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="mt-1" placeholder="100" /></div>
              <div><label className="text-xs font-medium">预算类型</label><Select value={form.budget_type} onValueChange={(v) => v && setForm({ ...form, budget_type: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">日预算</SelectItem><SelectItem value="lifetime">总预算</SelectItem></SelectContent></Select></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button><Button onClick={handleCreate} disabled={creating || !form.name}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
