"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Plus, Loader2, DollarSign, TrendingUp, MousePointer, Target, Pause, Play, Trash2, Sparkles, BarChart3, Shield, AlertTriangle } from "lucide-react";
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
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [genCreatives, setGenCreatives] = useState<string | null>(null);
  const [roiChecking, setRoiChecking] = useState(false);
  const [roiAlerts, setRoiAlerts] = useState<Array<{ campaign: string; issue: string; action: string }>>([]);
  const [form, setForm] = useState({ name: "", platform: "facebook", campaign_type: "conversion", budget: "", budget_type: "daily" });

  useEffect(() => { fetchData(); }, []);
  const fetchData = async () => { const res = await fetch("/api/ads"); const data = await res.json(); setCampaigns(data.campaigns || []); if (data.kpis) setKpis(data.kpis); setLoading(false); };
  const handleCreate = async () => { setCreating(true); await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form, budget: parseFloat(form.budget) || 0, status: "draft" }) }); setShowCreate(false); fetchData(); setCreating(false); };
  const handleStatus = async (id: string, s: string) => { await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, status: s }) }); fetchData(); };
  const handleDelete = async (id: string) => { await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) }); fetchData(); };
  const handleAiAnalyze = async (id: string) => { setAnalyzing(id); await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai_analyze", id }) }); fetchData(); setAnalyzing(null); };
  const handleAiCreative = async (id: string) => { setGenCreatives(id); const res = await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ai_creative", id }) }); const d = await res.json(); if (d.success) alert(`已生成 ${d.creatives_count} 组创意`); setGenCreatives(null); };
  const handleRoiCheck = async () => { setRoiChecking(true); const res = await fetch("/api/ads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "roi_check" }) }); const d = await res.json(); setRoiAlerts(d.alerts || []); setRoiChecking(false); };

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <PageHeader title="广告投放大师" description="AI 驱动 — 智能创意 + ROI 红线 + 自动优化" actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRoiCheck} disabled={roiChecking}>{roiChecking ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Shield className="mr-1 h-3.5 w-3.5 text-red-500" />}ROI 巡检</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1 h-3.5 w-3.5" />新建计划</Button>
        </div>
      } />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总计划</p><p className="text-2xl font-bold mt-1">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">投放中</p><p className="text-2xl font-bold mt-1 text-green-600">{kpis.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总花费</p><p className="text-2xl font-bold mt-1">${kpis.total_spend.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总收入</p><p className="text-2xl font-bold mt-1 text-green-600">${kpis.total_revenue.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ROAS</p><p className={cn("text-2xl font-bold mt-1", kpis.avg_roas >= 3 ? "text-green-600" : kpis.avg_roas >= 1.5 ? "text-yellow-600" : "text-red-600")}>{kpis.avg_roas}x</p></CardContent></Card>
      </div>

      {roiAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50/50"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-red-500" /><p className="text-sm font-semibold text-red-700">ROI 预警 ({roiAlerts.length})</p></div>
          {roiAlerts.map((a, i) => (<div key={i} className="rounded border border-red-200 p-2 mb-1.5 text-xs"><p className="font-medium">{a.campaign}</p><p className="text-red-600">{a.issue}</p><p className="text-muted-foreground">{a.action}</p></div>))}
        </CardContent></Card>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList><TabsTrigger value="campaigns">广告计划</TabsTrigger><TabsTrigger value="ai_tools">AI 工具箱</TabsTrigger><TabsTrigger value="roi_rules">ROI 标准</TabsTrigger></TabsList>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="flex gap-2">{["all", "draft", "active", "paused", "ended"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium border", filter === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted")}>
              {s === "all" ? `全部 (${campaigns.length})` : `${STATUS_CFG[s]?.label} (${campaigns.filter(c => c.status === s).length})`}
            </button>
          ))}</div>

          {loading ? <div className="h-20 rounded-lg bg-muted animate-pulse" /> : filtered.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-16 text-center"><BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">暂无广告计划</p></CardContent></Card>
          ) : (
            <div className="space-y-3">{filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-sm"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold">{c.name}</p>
                  <Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[c.platform] || c.platform}</Badge>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_CFG[c.status]?.color)}>{STATUS_CFG[c.status]?.label}</Badge>
                  {c.spend > 50 && c.revenue / Math.max(c.spend, 1) < 1 && <Badge className="text-[10px] bg-red-500">ROI 低</Badge>}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${c.budget}/{c.budget_type === "daily" ? "天" : "总"}</span>
                  <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{c.clicks} 点击</span>
                  <span className="flex items-center gap-1"><Target className="h-3 w-3" />{c.conversions} 转化</span>
                  <span className={cn("flex items-center gap-1 font-medium", c.roas >= 3 ? "text-green-600" : c.roas >= 1.5 ? "text-yellow-600" : "text-red-600")}><TrendingUp className="h-3 w-3" />ROAS {c.roas}x</span>
                </div>
              </div><div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAiAnalyze(c.id)} disabled={analyzing === c.id}>{analyzing === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3 mr-1" />分析</>}</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAiCreative(c.id)} disabled={genCreatives === c.id}>{genCreatives === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3 mr-1" />创意</>}</Button>
                {c.status === "draft" && <Button size="sm" variant="outline" className="h-7" onClick={() => handleStatus(c.id, "active")}><Play className="h-3 w-3" /></Button>}
                {c.status === "active" && <Button size="sm" variant="outline" className="h-7" onClick={() => handleStatus(c.id, "paused")}><Pause className="h-3 w-3" /></Button>}
                {c.status === "paused" && <Button size="sm" variant="outline" className="h-7" onClick={() => handleStatus(c.id, "active")}><Play className="h-3 w-3" /></Button>}
                <Button size="sm" variant="ghost" className="h-7" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div></div></CardContent></Card>
            ))}</div>
          )}
        </TabsContent>

        <TabsContent value="ai_tools" className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { l: "广告创意批量生成", d: "5 组 A/B 测试创意", c: "text-amber-500" },
              { l: "广告效果优化大师", d: "分析数据，找问题，给方案", c: "text-green-500" },
              { l: "ROI 红线守卫", d: "监控 ROI，低于红线自动预警", c: "text-red-500" },
              { l: "AI 预算规划", d: "分配 + ROI 预测", c: "text-blue-500" },
              { l: "AI 受众策略", d: "精准定位方案", c: "text-purple-500" },
              { l: "AI 广告文案", d: "多平台文案变体", c: "text-pink-500" },
            ].map((i) => (
              <Link key={i.l} href="/content"><Card className="cursor-pointer hover:shadow-sm hover:border-primary/20 h-full"><CardContent className="p-4 flex items-center gap-3"><Sparkles className={cn("h-5 w-5 shrink-0", i.c)} /><div><p className="text-sm font-medium">{i.l}</p><p className="text-xs text-muted-foreground">{i.d}</p></div></CardContent></Card></Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roi_rules" className="mt-4">
          <Card><CardHeader><CardTitle className="text-sm">ROI 红线标准</CardTitle></CardHeader><CardContent className="space-y-3">
            {[
              { zone: "停", color: "red", roas: "< 1.0x", desc: "亏损投放，立即暂停" },
              { zone: "优", color: "yellow", roas: "1.0x-3.0x", desc: "48h 内优化或暂停" },
              { zone: "稳", color: "green", roas: "3.0x-5.0x", desc: "稳定运行，测试新创意" },
              { zone: "放", color: "purple", roas: "> 5.0x", desc: "放量扩大 20-50%" },
            ].map((r) => (
              <div key={r.zone} className={`rounded-lg bg-${r.color}-50 border border-${r.color}-200 p-3 flex items-center gap-3`}>
                <div className={`h-8 w-8 rounded-full bg-${r.color}-500 flex items-center justify-center text-white font-bold text-xs`}>{r.zone}</div>
                <div><p className={`text-sm font-semibold text-${r.color}-700`}>ROAS {r.roas}</p><p className={`text-xs text-${r.color}-600`}>{r.desc}</p></div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}><DialogContent><DialogHeader><DialogTitle>新建广告计划</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs font-medium">计划名称</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="春季新品推广" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">投放平台</label><Select value={form.platform} onValueChange={(v) => v && setForm({ ...form, platform: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLATFORM_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-xs font-medium">投放目标</label><Select value={form.campaign_type} onValueChange={(v) => v && setForm({ ...form, campaign_type: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="awareness">品牌曝光</SelectItem><SelectItem value="traffic">引流</SelectItem><SelectItem value="conversion">转化</SelectItem><SelectItem value="retargeting">再营销</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">预算 (USD)</label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs font-medium">预算类型</label><Select value={form.budget_type} onValueChange={(v) => v && setForm({ ...form, budget_type: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">日预算</SelectItem><SelectItem value="lifetime">总预算</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button><Button onClick={handleCreate} disabled={creating || !form.name}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}创建</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
