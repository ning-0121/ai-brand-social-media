"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Sparkles, Loader2 } from "lucide-react";

export default function CreativePagesPage() {
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [generating, setGenerating] = useState(false);
  useEffect(() => { fetch("/api/creative?type=page").then(r => r.json()).then(d => setProjects(d.projects || [])); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    await fetch("/api/agent-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", agent_id: "page", task_type: "generate_detail_page", title: "AI 生成详情页", priority: "high", source_module: "creative" }) });
    await fetch("/api/agent-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "run_next" }) });
    fetch("/api/creative?type=page").then(r => r.json()).then(d => setProjects(d.projects || []));
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="页面生成中心" description="商品详情页、活动承接页、首页 Hero、FAQ — AI 一键生成完整 HTML" actions={
        <Button onClick={handleGenerate} disabled={generating}>{generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}AI 生成详情页</Button>
      } />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { l: "商品详情页", d: "完整 body_html + 图片 + SEO", t: "generate_detail_page" },
          { l: "活动承接页", d: "着陆页 + Hero + CTA", t: "generate_landing_page" },
          { l: "首页 Hero", d: "首页头部区域", t: "generate_homepage_hero" },
        ].map(i => (
          <Card key={i.l} className="cursor-pointer hover:shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-blue-500 shrink-0" /><div><p className="text-sm font-medium">{i.l}</p><p className="text-xs text-muted-foreground">{i.d}</p></div>
          </CardContent></Card>
        ))}
      </div>
      {projects.length > 0 ? (
        <div className="space-y-3">{projects.map((p) => (
          <Card key={p.id as string}><CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="flex-1"><p className="text-sm font-semibold">{p.title as string}</p><p className="text-xs text-muted-foreground">{p.status as string} · {new Date(p.created_at as string).toLocaleString("zh-CN")}</p></div>
            <Badge variant="outline" className="text-[10px]">{p.status as string}</Badge>
          </CardContent></Card>
        ))}</div>
      ) : (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">暂无页面项目</p></CardContent></Card>
      )}
    </div>
  );
}
