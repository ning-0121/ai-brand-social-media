"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Loader2 } from "lucide-react";

export default function CreativeCampaignsPage() {
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [generating, setGenerating] = useState(false);
  useEffect(() => { fetch("/api/creative?type=campaign").then(r => r.json()).then(d => setProjects(d.projects || [])); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    await fetch("/api/agent-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", agent_id: "campaign", task_type: "campaign_full_pack", title: "春季活动素材包", priority: "high", input: { campaign_name: "Spring Sale" }, source_module: "creative", requires_approval: true }) });
    setGenerating(false);
    alert("已创建活动素材任务，前往审批中心批准后执行");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="活动中心" description="一键生成活动全套素材包：着陆页+Banner+海报+社媒+邮件+广告+视频脚本" actions={
        <Button onClick={handleGenerate} disabled={generating}>{generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}生成活动素材包</Button>
      } />
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3"><Megaphone className="h-5 w-5 text-red-600" /><h3 className="text-base font-semibold text-red-900">一键全套素材</h3></div>
          <p className="text-sm text-red-700 mb-3">输入活动主题，AI 自动生成：着陆页 + Banner + 海报 + 社媒帖子 + 邮件 + 广告文案 + 视频脚本</p>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {["着陆页", "Banner", "海报", "社媒帖子", "邮件", "广告文案", "视频脚本", "发布计划"].map(i => (
              <div key={i} className="rounded bg-white/70 p-2 text-center text-red-800 font-medium">{i}</div>
            ))}
          </div>
        </CardContent>
      </Card>
      {projects.length > 0 ? (
        <div className="space-y-3">{projects.map((p) => (
          <Card key={p.id as string}><CardContent className="p-4 flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-red-500 shrink-0" />
            <div className="flex-1"><p className="text-sm font-semibold">{p.title as string}</p><p className="text-xs text-muted-foreground">{p.status as string}</p></div>
            <Badge variant="outline" className="text-[10px]">{p.status as string}</Badge>
          </CardContent></Card>
        ))}</div>
      ) : (
        <Card className="border-dashed"><CardContent className="py-12 text-center"><Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">暂无活动项目</p></CardContent></Card>
      )}
    </div>
  );
}
