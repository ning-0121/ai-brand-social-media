"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Loader2, RefreshCw, CheckCircle2, AlertCircle, AlertTriangle, Clock,
  TrendingUp, Zap, RotateCcw, Rocket, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Progress {
  window_hours: number;
  generated_at: string;
  health_score: number;
  summary: {
    tasks_completed: number;
    tasks_failed: number;
    tasks_pending: number;
    tasks_running: number;
    llm_calls: number;
    llm_cost_usd: number;
    llm_avg_latency_ms: number;
    ab_variants_created: number;
    ab_winners: number;
  };
  concrete_wins: Array<{ task_type: string; title: string; detail: string; updated_at: string; product?: string }>;
  failures: Array<{ id: string; task_type: string; title: string; error: string; updated_at: string; product?: string }>;
  top_error_clusters: Array<{ pattern: string; count: number; sample_title: string; task_ids: string[] }>;
  cron_health: Record<string, { last_run: string; count: number; avg_duration_ms: number; has_errors: boolean }>;
  ab_variants: Array<{ id: string; campaign_name: string; winner: string | null; views_a: number; views_b: number; conversions_a: number; conversions_b: number; created_at: string }>;
  upcoming_calendar: Array<{ id: string; scheduled_date: string; campaign_name: string; status: string; holiday_tag?: string }>;
  anomalies: Array<{ severity: "critical" | "warning"; type: string; message: string; detail?: string }>;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}m 前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h 前`;
  return `${Math.floor(h / 24)}d 前`;
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

const TASK_LABELS: Record<string, string> = {
  seo_fix: "SEO 修复",
  detail_page: "详情页",
  landing_page: "落地页",
  homepage_update: "首页",
  new_product_content: "新品内容",
  discount_create: "折扣码",
  bundle_page: "套装页",
  winback_email: "挽回邮件",
  post: "社媒帖",
  engage: "互动",
  hashtag_strategy: "Hashtag",
  content_calendar: "内容日历",
  short_video_script: "视频脚本",
  ad_campaign_blueprint: "广告蓝图",
};

export default function MonitorPage() {
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(48);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/monitor/progress?hours=${hours}`);
      const d = await res.json();
      setData(d);
    } catch { toast.error("加载失败"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [hours]); // eslint-disable-line

  const retryCluster = async (taskIds: string[]) => {
    setRetrying(taskIds.join(","));
    try {
      const res = await fetch("/api/monitor/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: taskIds }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`已重置 ${d.retried} 个任务为 pending，下次 Agent Pool 会重跑`);
        await load();
      } else {
        toast.error(d.error || "失败");
      }
    } catch { toast.error("失败"); }
    setRetrying(null);
  };

  if (loading && !data) {
    return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }
  if (!data) return null;

  const healthColor = data.health_score >= 80 ? "text-green-600" : data.health_score >= 60 ? "text-amber-600" : "text-red-600";
  const healthBg = data.health_score >= 80 ? "from-green-50 to-emerald-50 border-green-200" : data.health_score >= 60 ? "from-amber-50 to-yellow-50 border-amber-200" : "from-red-50 to-rose-50 border-red-200";

  return (
    <div className="space-y-4">
      <PageHeader
        title="运行监控"
        description={`最近 ${data.window_hours} 小时 AI 做了什么、什么坏了、有没有跑偏`}
        actions={
          <div className="flex gap-1">
            {[24, 48, 168].map(h => (
              <Button key={h} size="sm" variant={hours === h ? "default" : "outline"} onClick={() => setHours(h)}>
                {h === 168 ? "7 天" : `${h}h`}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </Button>
          </div>
        }
      />

      {/* ═══ 健康分 + KPI ═══ */}
      <Card className={cn("border-2 bg-gradient-to-br", healthBg)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">系统健康分</div>
              <div className={cn("text-5xl font-bold tabular-nums", healthColor)}>{data.health_score}</div>
              <div className="text-[10px] text-muted-foreground">/100</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-0">
              <KPI icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />} label="交付完成" value={data.summary.tasks_completed} />
              <KPI icon={<AlertCircle className="h-3.5 w-3.5 text-red-500" />} label="失败" value={data.summary.tasks_failed} color={data.summary.tasks_failed > 0 ? "text-red-600" : ""} />
              <KPI icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} label="待执行" value={data.summary.tasks_pending} />
              <KPI icon={<Activity className="h-3.5 w-3.5 text-blue-500" />} label="LLM 调用" value={data.summary.llm_calls} sub={`$${data.summary.llm_cost_usd} · ${fmtMs(data.summary.llm_avg_latency_ms)}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ 异常信号 ═══ */}
      {data.anomalies.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              跑偏信号（{data.anomalies.length}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.anomalies.map((a, i) => (
              <div key={i} className={cn(
                "flex items-start gap-2 rounded p-2 text-xs",
                a.severity === "critical" ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900" : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200"
              )}>
                <Badge className={cn("text-[9px] shrink-0", a.severity === "critical" ? "bg-red-600" : "bg-amber-600")}>
                  {a.severity === "critical" ? "严重" : "警告"}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{a.message}</p>
                  {a.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{a.detail}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ═══ AI 做成的事 ═══ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Rocket className="h-4 w-4 text-green-500" />
              AI 做成了什么（{data.concrete_wins.length}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-[500px] overflow-auto">
            {data.concrete_wins.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">本时段无已完成任务</p>
            ) : data.concrete_wins.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs border-b pb-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px]">{TASK_LABELS[w.task_type] || w.task_type}</Badge>
                    {w.product && <span className="text-[10px] text-muted-foreground">· {w.product}</span>}
                  </div>
                  <p className="font-medium truncate">{w.title}</p>
                  <p className="text-[10px] text-green-700 dark:text-green-400">{w.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(w.updated_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ═══ 失败聚类 ═══ */}
        <Card className={data.summary.tasks_failed > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              失败聚类（{data.top_error_clusters.length} 类 · {data.summary.tasks_failed} 次）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-auto">
            {data.top_error_clusters.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">本时段无失败 🎉</p>
            ) : data.top_error_clusters.map((c, i) => (
              <div key={i} className="border rounded p-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400 truncate">{c.pattern}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">样本：{c.sample_title}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 text-red-600 border-red-200">{c.count}次</Badge>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-[10px] w-full"
                  onClick={() => retryCluster(c.task_ids)}
                  disabled={retrying === c.task_ids.join(",")}>
                  {retrying === c.task_ids.join(",")
                    ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    : <RotateCcw className="h-3 w-3 mr-1" />}
                  批量重试（{c.task_ids.length} 个）
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ═══ Cron 心跳 ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-500" />
            自动化任务心跳（{Object.keys(data.cron_health).length} 种）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(data.cron_health).map(([type, h]) => (
              <div key={type} className={cn(
                "border rounded p-2 text-xs",
                h.has_errors && "border-amber-200 bg-amber-50/50"
              )}>
                <div className="flex items-center justify-between">
                  <code className="font-mono text-[11px]">{type}</code>
                  {h.has_errors
                    ? <AlertTriangle className="h-3 w-3 text-amber-500" />
                    : <CheckCircle2 className="h-3 w-3 text-green-500" />}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{h.count} 次 · avg {fmtMs(h.avg_duration_ms)}</span>
                  <span>{timeAgo(h.last_run)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ A/B + 日历 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              A/B 活动（{data.ab_variants.length}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-80 overflow-auto">
            {data.ab_variants.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">本时段无 A/B 活动</p>
            ) : data.ab_variants.map(v => {
              const totalViews = (v.views_a || 0) + (v.views_b || 0);
              const totalConv = (v.conversions_a || 0) + (v.conversions_b || 0);
              const rateA = v.views_a > 0 ? ((v.conversions_a || 0) / v.views_a * 100).toFixed(2) : "0";
              const rateB = v.views_b > 0 ? ((v.conversions_b || 0) / v.views_b * 100).toFixed(2) : "0";
              return (
                <div key={v.id} className="border-b pb-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate flex-1">{v.campaign_name}</span>
                    {v.winner
                      ? <Badge className={cn("text-[9px]", v.winner === "a" ? "bg-blue-600" : "bg-rose-600")}>Winner {v.winner.toUpperCase()}</Badge>
                      : <Badge variant="outline" className="text-[9px]">跑数据中</Badge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    A: {v.views_a || 0} 访 / {v.conversions_a || 0} 转化 ({rateA}%) ·
                    B: {v.views_b || 0} 访 / {v.conversions_b || 0} 转化 ({rateB}%)
                  </div>
                  <div className="text-[9px] text-muted-foreground">
                    总 {totalViews} 访 / {totalConv} 转化 · {timeAgo(v.created_at)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">未来 7 天日历（{data.upcoming_calendar.length}）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-80 overflow-auto">
            {data.upcoming_calendar.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">下周无已规划活动</p>
            ) : data.upcoming_calendar.map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs border-b pb-1">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px]">{c.scheduled_date.slice(5)}</Badge>
                    {c.holiday_tag && <span className="text-[10px]">🎉</span>}
                    <span className="font-medium truncate">{c.campaign_name}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0">{c.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, sub, color = "" }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">{icon}{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
