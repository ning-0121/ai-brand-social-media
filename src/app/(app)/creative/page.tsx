"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Video, Megaphone, Plus, Sparkles, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CreativeKPIs { total: number; pages: number; designs: number; videos: number; campaigns: number; pending_review: number }

export default function CreativeStudioPage() {
  const [kpis, setKpis] = useState<CreativeKPIs>({ total: 0, pages: 0, designs: 0, videos: 0, campaigns: 0, pending_review: 0 });
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch("/api/creative").then(r => r.json()).then(d => { if (d.kpis) setKpis(d.kpis); });
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await fetch("/api/agent-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "analyze_all" }) });
    setAnalyzing(false);
  };

  const modules = [
    { title: "页面生成", desc: "详情页、活动页、首页、FAQ", icon: FileText, count: kpis.pages, href: "/creative/pages", color: "text-blue-500", bg: "bg-blue-50" },
    { title: "设计中心", desc: "Banner、海报、社媒图、多尺寸", icon: Image, count: kpis.designs, href: "/creative/design", color: "text-pink-500", bg: "bg-pink-50" },
    { title: "视频中心", desc: "短视频脚本、直播脚本、剪辑任务", icon: Video, count: kpis.videos, href: "/creative/video", color: "text-purple-500", bg: "bg-purple-50" },
    { title: "活动中心", desc: "一键生成活动全套素材包", icon: Megaphone, count: kpis.campaigns, href: "/creative/campaigns", color: "text-red-500", bg: "bg-red-50" },
  ];

  const quickActions = [
    { label: "新建详情页", agent: "page", task: "generate_detail_page" },
    { label: "新建 Banner", agent: "design", task: "generate_banner" },
    { label: "新建海报", agent: "design", task: "generate_poster" },
    { label: "新建视频脚本", agent: "video", task: "short_video" },
    { label: "新建活动素材包", agent: "campaign", task: "campaign_full_pack" },
    { label: "修改图片", agent: "image_edit", task: "edit_image" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="创意生产中心" description="AI 驱动的全栈创意生产 — 11 个 Agent 协同，从文案到图片到视频到页面" actions={
        <Button onClick={handleAnalyze} disabled={analyzing}>{analyzing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}AI 全面分析</Button>
      } />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">总项目</p><p className="text-2xl font-bold mt-1">{kpis.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">页面</p><p className="text-2xl font-bold mt-1 text-blue-600">{kpis.pages}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">设计</p><p className="text-2xl font-bold mt-1 text-pink-600">{kpis.designs}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">视频</p><p className="text-2xl font-bold mt-1 text-purple-600">{kpis.videos}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">待审核</p><p className="text-2xl font-bold mt-1 text-amber-600">{kpis.pending_review}</p></CardContent></Card>
      </div>

      {/* Quick Create */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-3">快速创建</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <Link key={a.label} href={`/creative/${a.agent === "design" ? "design" : a.agent === "video" ? "video" : a.agent === "campaign" ? "campaigns" : "pages"}`}>
                <Button variant="outline" size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />{a.label}</Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {modules.map((m) => (
          <Link key={m.title} href={m.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.bg}`}>
                  <m.icon className={`h-6 w-6 ${m.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{m.title}</h3>
                    <Badge variant="secondary">{m.count}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground/30 shrink-0 mt-1" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
