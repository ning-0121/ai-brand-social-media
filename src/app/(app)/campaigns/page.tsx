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
  Calendar,
  Sparkles,
  Megaphone,
  ArrowRight,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string; name: string; campaign_type: string; status: string;
  start_date: string | null; end_date: string | null; budget: number | null;
  discount_strategy: string | null; target_revenue: number | null;
  ai_plan: Record<string, unknown> | null; created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  black_friday: "黑五大促", new_launch: "新品首发", seasonal: "季节活动",
  clearance: "季末清仓", holiday: "节日营销", flash_sale: "限时闪购", custom: "自定义",
};

const STATUS_CFG: Record<string, { label: string; color: string; icon: string }> = {
  planning: { label: "策划中", color: "bg-blue-100 text-blue-700", icon: "📋" },
  preparing: { label: "准备中", color: "bg-amber-100 text-amber-700", icon: "⚙️" },
  active: { label: "进行中", color: "bg-green-100 text-green-700", icon: "🔥" },
  ended: { label: "已结束", color: "bg-gray-100 text-gray-600", icon: "✅" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-600", icon: "❌" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", campaign_type: "seasonal", budget: "", start_date: "", end_date: "" });

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = () => fetch("/api/campaigns").then((r) => r.json()).then((d) => { setCampaigns(d.campaigns || []); setLoading(false); });

  const handleCreate = async () => {
    setCreating(true);
    await fetch("/api/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form, budget: parseFloat(form.budget) || null, status: "planning" }),
    });
    setShowCreate(false); setForm({ name: "", campaign_type: "seasonal", budget: "", start_date: "", end_date: "" });
    fetchCampaigns(); setCreating(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", id, status }) });
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    fetchCampaigns();
  };

  // KPIs
  const active = campaigns.filter((c) => c.status === "active").length;
  const planning = campaigns.filter((c) => c.status === "planning" || c.status === "preparing").length;
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="活动策划" description="营销活动全流程管理 — AI 方案策划 + 承接页制作 + 社媒预热 + 复盘分析" actions={
        <div className="flex gap-2">
          <Link href="/content"><Button variant="outline" size="sm"><Sparkles className="mr-1.5 h-3.5 w-3.5" />AI 策划方案</Button></Link>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />新建活动</Button>
        </div>
      } />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总活动</p><p className="text-2xl font-bold mt-1">{campaigns.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">进行中</p><p className="text-2xl font-bold mt-1 text-green-600">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">策划中</p><p className="text-2xl font-bold mt-1 text-blue-600">{planning}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总预算</p><p className="text-2xl font-bold mt-1">${totalBudget.toLocaleString()}</p></CardContent></Card>
      </div>

      {/* AI 工具入口 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { l: "AI 活动策划", d: "方案 + 时间线 + 折扣" },
          { l: "AI 活动复盘", d: "数据分析 + 改进建议" },
          { l: "AI 承接页", d: "活动落地页 HTML" },
          { l: "AI 活动海报", d: "促销海报设计" },
        ].map((i) => (
          <Link key={i.l} href="/content"><Card className="cursor-pointer hover:shadow-sm hover:border-primary/20"><CardContent className="p-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-500 shrink-0" /><div><p className="text-xs font-medium">{i.l}</p><p className="text-[10px] text-muted-foreground">{i.d}</p></div></CardContent></Card></Link>
        ))}
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center">
          <Megaphone className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">暂无活动</p>
          <p className="text-xs text-muted-foreground mt-1">创建你的第一个营销活动，AI 帮你策划全流程</p>
          <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}><Plus className="mr-1.5 h-3.5 w-3.5" />新建活动</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const cfg = STATUS_CFG[c.status] || STATUS_CFG.planning;
            return (
              <Card key={c.id} className="hover:shadow-sm"><CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{cfg.icon}</span>
                      <p className="text-sm font-semibold">{c.name}</p>
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[c.campaign_type] || c.campaign_type}</Badge>
                      <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      {c.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.start_date}{c.end_date ? ` ~ ${c.end_date}` : ""}</span>}
                      {c.budget && <span>${c.budget.toLocaleString()} 预算</span>}
                      {c.discount_strategy && <span>{c.discount_strategy}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {c.status === "planning" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(c.id, "preparing")}>开始准备 <ArrowRight className="ml-1 h-3 w-3" /></Button>}
                    {c.status === "preparing" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(c.id, "active")}>启动活动 <ArrowRight className="ml-1 h-3 w-3" /></Button>}
                    {c.status === "active" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange(c.id, "ended")}>结束活动</Button>}
                    <Button size="sm" variant="ghost" className="h-7 text-muted-foreground" onClick={() => handleDelete(c.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>新建营销活动</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">活动名称</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="如：春季上新活动" /></div>
            <div><label className="text-xs font-medium">活动类型</label>
              <Select value={form.campaign_type} onValueChange={(v) => v && setForm({ ...form, campaign_type: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">开始日期</label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs font-medium">结束日期</label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs font-medium">预算 (USD)</label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="mt-1" placeholder="10000" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button><Button onClick={handleCreate} disabled={creating || !form.name}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}创建</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
