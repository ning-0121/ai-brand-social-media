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
  Video,
  Plus,
  ExternalLink,
  Sparkles,
  Clock,
  Users,
  DollarSign,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface LiveSession {
  id: string;
  title: string;
  platform: string;
  virtual_host: string | null;
  scheduled_start: string | null;
  status: string;
  metrics: Record<string, number> | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  live: "bg-red-100 text-red-700",
  ended: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-50 text-gray-400",
};

export default function LivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", platform: "tiktok", scheduled_start: "", scheduled_end: "" });

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/live");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleCreate = async () => {
    await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form, virtual_host: "BocaLive AI" }),
    });
    setShowCreate(false);
    fetchSessions();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="直播中心"
        description="BocaLive 虚拟人 24h 直播 — AI 脚本 + 排期 + 数据"
        actions={
          <div className="flex gap-2">
            <Link href="/content"><Button size="sm" variant="outline"><Sparkles className="mr-1 h-3.5 w-3.5" />AI 直播脚本</Button></Link>
            <a href="https://app.bocalive.ai" target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" />BocaLive</Button></a>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}><Plus className="mr-1 h-3.5 w-3.5" />新建直播</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">直播中</p><p className="text-2xl font-bold mt-1 text-red-600">{sessions.filter(s => s.status === "live").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">待开播</p><p className="text-2xl font-bold mt-1 text-blue-600">{sessions.filter(s => s.status === "scheduled").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总场次</p><p className="text-2xl font-bold mt-1">{sessions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">累计观看</p><p className="text-2xl font-bold mt-1">{sessions.reduce((s, se) => s + (se.metrics?.viewers || 0), 0)}</p></CardContent></Card>
      </div>

      {showCreate && (
        <Card><CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">新建直播排期</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">标题</label><Input className="mt-1" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="春季新品直播" /></div>
            <div><label className="text-xs text-muted-foreground">平台</label><Select value={form.platform} onValueChange={v => v && setForm({...form, platform: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tiktok">TikTok</SelectItem><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="youtube">YouTube</SelectItem></SelectContent></Select></div>
            <div><label className="text-xs text-muted-foreground">开始</label><Input className="mt-1" type="datetime-local" value={form.scheduled_start} onChange={e => setForm({...form, scheduled_start: e.target.value})} /></div>
            <div><label className="text-xs text-muted-foreground">结束</label><Input className="mt-1" type="datetime-local" value={form.scheduled_end} onChange={e => setForm({...form, scheduled_end: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button><Button onClick={handleCreate} disabled={!form.title}>创建</Button></div>
        </CardContent></Card>
      )}

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2"><Video className="h-5 w-5 text-purple-600" /><h3 className="text-base font-semibold text-purple-900">BocaLive 虚拟人直播</h3></div>
          <p className="text-sm text-purple-700">AI 数字人 24 小时不间断直播带货，$58/月起</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-white/70 p-3"><p className="font-semibold text-purple-800">1. 生成脚本</p><p className="text-purple-600 mt-1">内容工厂 → 直播脚本 Skill</p></div>
            <div className="rounded-lg bg-white/70 p-3"><p className="font-semibold text-purple-800">2. 配置虚拟人</p><p className="text-purple-600 mt-1">BocaLive 选形象 + 导入脚本</p></div>
            <div className="rounded-lg bg-white/70 p-3"><p className="font-semibold text-purple-800">3. 开播</p><p className="text-purple-600 mt-1">推流到 TikTok/IG/YouTube</p></div>
          </div>
          <a href="https://www.bocalive.ai" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="border-purple-300 text-purple-700"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />注册 BocaLive</Button>
          </a>
        </CardContent>
      </Card>

      {sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map(s => (
            <Card key={s.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><Video className="h-5 w-5 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold">{s.title}</span>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[s.status])}>{s.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{s.platform}</Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {s.virtual_host && <span>主播: {s.virtual_host}</span>}
                  {s.scheduled_start && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(s.scheduled_start).toLocaleString("zh-CN")}</span>}
                </div>
              </div>
              {s.metrics && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {s.metrics.viewers !== undefined && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.metrics.viewers}</span>}
                  {s.metrics.orders !== undefined && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{s.metrics.orders}单</span>}
                  {s.metrics.comments !== undefined && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{s.metrics.comments}</span>}
                </div>
              )}
            </CardContent></Card>
          ))}
        </div>
      ) : !loading ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />暂无直播排期
        </CardContent></Card>
      ) : null}
    </div>
  );
}
