"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Sparkles } from "lucide-react";

export default function CreativeVideoPage() {
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => { fetch("/api/creative?type=video").then(r => r.json()).then(d => setProjects(d.projects || [])); }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="视频中心" description="TikTok/Reels/Shorts 脚本、直播脚本、镜头拆解、剪辑任务" actions={
        <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" />新建视频</Button>
      } />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { l: "短视频脚本", d: "TikTok 15s/30s/60s" },
          { l: "直播脚本", d: "电商直播分镜" },
          { l: "剪辑任务", d: "生成剪辑指令" },
        ].map(i => (
          <Card key={i.l} className="cursor-pointer hover:shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-500 shrink-0" /><div><p className="text-sm font-medium">{i.l}</p><p className="text-xs text-muted-foreground">{i.d}</p></div>
          </CardContent></Card>
        ))}
      </div>
      {projects.length > 0 ? (
        <div className="space-y-3">{projects.map((p) => (
          <Card key={p.id as string}><CardContent className="p-4 flex items-center gap-3">
            <Video className="h-5 w-5 text-purple-500 shrink-0" />
            <div className="flex-1"><p className="text-sm font-semibold">{p.title as string}</p><p className="text-xs text-muted-foreground">{p.status as string}</p></div>
            <Badge variant="outline" className="text-[10px]">{p.status as string}</Badge>
          </CardContent></Card>
        ))}</div>
      ) : (
        <Card className="border-dashed"><CardContent className="py-16 text-center"><Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">暂无视频项目</p></CardContent></Card>
      )}
    </div>
  );
}
