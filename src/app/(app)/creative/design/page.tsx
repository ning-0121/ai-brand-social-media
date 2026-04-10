"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Plus, Sparkles } from "lucide-react";

export default function CreativeDesignPage() {
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { fetch("/api/creative?type=design").then(r => r.json()).then(d => setProjects(d.projects || [])); }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="设计中心" description="Banner、海报、社媒图片、广告图 — AI 生成 + 多尺寸导出" actions={
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />新建设计</Button>
      } />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[
          { l: "活动 Banner", d: "横版 1920×600" },
          { l: "促销海报", d: "竖版 1000×1500" },
          { l: "社媒配图", d: "各平台适配" },
          { l: "多尺寸导出", d: "一图多平台" },
        ].map(i => (
          <Card key={i.l} className="cursor-pointer hover:shadow-sm"><CardContent className="p-4 text-center">
            <Sparkles className="h-6 w-6 mx-auto mb-2 text-pink-500" /><p className="text-sm font-medium">{i.l}</p><p className="text-xs text-muted-foreground">{i.d}</p>
          </CardContent></Card>
        ))}
      </div>
      {projects.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{projects.map((p) => (
          <Card key={p.id as string}><CardContent className="p-3">
            <div className="aspect-video rounded bg-muted mb-2 flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground/30" /></div>
            <p className="text-xs font-medium truncate">{p.title as string}</p>
            <Badge variant="outline" className="text-[9px] mt-1">{p.status as string}</Badge>
          </CardContent></Card>
        ))}</div>
      ) : (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><Image className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">暂无设计项目</p></CardContent></Card>
      )}
    </div>
  );
}
