"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Loader2, Play, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OutcomeSummary {
  pending: number;
  measured: number;
  avg_business_score: number | null;
  by_slug: Array<{ slug: string; measured: number; avg_business_score: number | null }>;
  recent: Array<{
    slug: string;
    version: number | null;
    target_name: string | null;
    business_score: number | null;
    notes: string | null;
    measured_at: string | null;
  }>;
}

function timeAgo(ts: string | null): string {
  if (!ts) return "-";
  const diff = Date.now() - new Date(ts).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "今天";
  if (d === 1) return "昨天";
  return `${d} 天前`;
}

function scoreColor(s: number | null): string {
  if (s == null) return "text-muted-foreground";
  if (s >= 75) return "text-green-600";
  if (s >= 50) return "text-amber-600";
  return "text-red-600";
}

export function OutcomesPanel() {
  const [data, setData] = useState<OutcomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/outcomes?days=30");
      const d = await res.json();
      setData(d);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const measureNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/outcomes", { method: "POST" });
      const d = await res.json();
      if (d.success) {
        toast.success(`测量完成：${d.measured} 个 outcome（平均 ${d.avg_business_score ?? "N/A"} 分）`);
        await load();
      } else {
        toast.error(d.error || "测量失败");
      }
    } catch {
      toast.error("测量失败");
    }
    setRunning(false);
  };

  if (loading) return <Card><CardContent className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></CardContent></Card>;
  if (!data) return null;

  const hasData = data.measured > 0 || data.pending > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-purple-500" />
            效果回传
            <span className="text-[11px] text-muted-foreground font-normal">
              · SEO/详情页部署 7 天后自动测量真实指标
            </span>
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={measureNow} disabled={running}>
            {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
            立即测量到期
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            暂无效果记录。执行 SEO 改造任务后 7 天会自动测量，真实 SEO 分变化会写回 prompt_runs.score 驱动督察晋升冠军版本。
          </p>
        ) : (
          <>
            {/* KPI 3 格 */}
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI
                icon={<Clock className="h-3 w-3 text-amber-500" />}
                label="待测量"
                value={data.pending}
                sub="部署但未到 7 天"
              />
              <MiniKPI
                icon={<TrendingUp className="h-3 w-3 text-green-500" />}
                label="已测量"
                value={data.measured}
                sub="近 30 天"
              />
              <MiniKPI
                icon={<Trophy className="h-3 w-3 text-purple-500" />}
                label="平均商业分"
                value={data.avg_business_score != null ? `${data.avg_business_score}/100` : "-"}
                sub="商业效果"
                color={scoreColor(data.avg_business_score)}
              />
            </div>

            {/* 按 slug 汇总 */}
            {data.by_slug.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5">按 Prompt 分类</div>
                <div className="space-y-1">
                  {data.by_slug.slice(0, 5).map((s) => (
                    <div key={s.slug} className="flex items-center justify-between text-xs border-b pb-1">
                      <code className="font-mono text-[11px] truncate">{s.slug}</code>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-muted-foreground">{s.measured} 次</span>
                        <span className={cn("text-xs font-medium tabular-nums", scoreColor(s.avg_business_score))}>
                          {s.avg_business_score}/100
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最近测量 */}
            {data.recent.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5">最近测量</div>
                <div className="space-y-1">
                  {data.recent.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 text-xs border-b pb-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {r.version && <Badge variant="outline" className="text-[9px]">v{r.version}</Badge>}
                          <span className="font-medium truncate">{r.target_name || r.slug}</span>
                        </div>
                        {r.notes && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn("text-sm font-semibold tabular-nums", scoreColor(r.business_score))}>
                          {r.business_score ?? "-"}
                        </div>
                        <div className="text-[9px] text-muted-foreground">{timeAgo(r.measured_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MiniKPI({ icon, label, value, sub, color = "text-foreground" }: {
  icon: React.ReactNode; label: string; value: string | number; sub: string; color?: string;
}) {
  return (
    <div className="rounded border bg-muted/10 p-2">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
