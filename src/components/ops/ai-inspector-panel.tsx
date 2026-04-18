"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Activity,
  Zap,
  Gauge,
  Timer,
  Loader2,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Report {
  timestamp: string;
  throughput: {
    completed_24h: number;
    failed_24h: number;
    pending_now: number;
    running_now: number;
    success_rate: number;
  };
  speed: {
    by_skill: Array<{ skill_id: string; avg_duration_ms: number; samples: number }>;
    slowest_skill: string | null;
    fastest_skill: string | null;
  };
  quality: {
    avg_qa_score: number | null;
    qa_samples: number;
    image_success_rate: number | null;
    image_samples: number;
  };
  failures: {
    top_errors: Array<{ pattern: string; count: number }>;
    stuck_tasks_reset: number;
  };
  actions_taken: string[];
  verdict: "healthy" | "degraded" | "critical";
  summary: string;
}

const VERDICT_STYLE: Record<Report["verdict"], { color: string; bg: string; label: string }> = {
  healthy: { color: "text-green-600", bg: "bg-green-50 border-green-200", label: "运转良好" },
  degraded: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "存在问题" },
  critical: { color: "text-red-600", bg: "bg-red-50 border-red-200", label: "严重异常" },
};

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  return `${Math.floor(min / 60)} 小时前`;
}

export function AIInspectorPanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/ai-inspector");
      const data = await res.json();
      setReport(data.report || null);
    } catch {
      /* silent */
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/ai-inspector", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setReport(data.report);
        toast.success("督察报告已更新");
      } else {
        toast.error(data.error || "督察失败");
      }
    } catch {
      toast.error("督察失败");
    }
    setRunning(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">加载督察报告...</span>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            AI 督察
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            尚未运行过督察。点击下方按钮立即体检，督察会自动检查速度、成功率、质量分，并修复卡住的任务。
          </p>
          <Button size="sm" onClick={runNow} disabled={running}>
            {running ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />检查中</> : <><Zap className="h-3.5 w-3.5 mr-1.5" />立即体检</>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const style = VERDICT_STYLE[report.verdict];

  return (
    <Card className={cn("border-2", style.bg)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className={cn("h-4 w-4", style.color)} />
            AI 督察
            <Badge variant="outline" className={cn("text-[10px]", style.color)}>
              {style.label}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-normal">
              · {timeAgo(report.timestamp)}
            </span>
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7" onClick={runNow} disabled={running}>
            <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总结 */}
        <p className={cn("text-sm font-medium", style.color)}>{report.summary}</p>

        {/* 吞吐 4 格 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricBox
            icon={<Activity className="h-3.5 w-3.5 text-green-500" />}
            label="24h 完成"
            value={report.throughput.completed_24h}
          />
          <MetricBox
            icon={<Gauge className="h-3.5 w-3.5 text-blue-500" />}
            label="成功率"
            value={`${report.throughput.success_rate}%`}
            color={report.throughput.success_rate >= 80 ? "text-green-600" : report.throughput.success_rate >= 50 ? "text-amber-600" : "text-red-600"}
          />
          <MetricBox
            icon={<Timer className="h-3.5 w-3.5 text-purple-500" />}
            label="待执行"
            value={report.throughput.pending_now}
            color={report.throughput.pending_now > 30 ? "text-amber-600" : "text-foreground"}
          />
          <MetricBox
            icon={<TrendingDown className="h-3.5 w-3.5 text-red-500" />}
            label="24h 失败"
            value={report.throughput.failed_24h}
            color={report.throughput.failed_24h > 0 ? "text-red-600" : "text-foreground"}
          />
        </div>

        {/* 速度排行 */}
        {report.speed.by_skill.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5">Skill 速度（按耗时排序）</div>
            <div className="space-y-1">
              {report.speed.by_skill.slice(0, 5).map((s) => (
                <div key={s.skill_id} className="flex items-center justify-between text-xs border-b pb-1">
                  <span className="font-mono text-muted-foreground">{s.skill_id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{s.samples}次</span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      s.avg_duration_ms > 30000 ? "text-red-600" :
                      s.avg_duration_ms > 15000 ? "text-amber-600" : "text-green-600"
                    )}>
                      {fmtDuration(s.avg_duration_ms)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 质量分 */}
        {(report.quality.qa_samples > 0 || report.quality.image_samples > 0) && (
          <div className="grid grid-cols-2 gap-2">
            {report.quality.avg_qa_score !== null && (
              <div className="rounded border p-2">
                <div className="text-[10px] text-muted-foreground">平均 QA 分</div>
                <div className={cn("text-lg font-bold",
                  report.quality.avg_qa_score >= 80 ? "text-green-600" :
                  report.quality.avg_qa_score >= 65 ? "text-amber-600" : "text-red-600"
                )}>
                  {report.quality.avg_qa_score}/100
                </div>
                <div className="text-[10px] text-muted-foreground">{report.quality.qa_samples} 样本</div>
              </div>
            )}
            {report.quality.image_success_rate !== null && (
              <div className="rounded border p-2">
                <div className="text-[10px] text-muted-foreground">图片生成成功率</div>
                <div className={cn("text-lg font-bold",
                  report.quality.image_success_rate >= 90 ? "text-green-600" :
                  report.quality.image_success_rate >= 60 ? "text-amber-600" : "text-red-600"
                )}>
                  {report.quality.image_success_rate}%
                </div>
                <div className="text-[10px] text-muted-foreground">{report.quality.image_samples} 样本</div>
              </div>
            )}
          </div>
        )}

        {/* 故障模式 */}
        {report.failures.top_errors.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              常见错误
            </div>
            <div className="space-y-1">
              {report.failures.top_errors.slice(0, 3).map((e, i) => (
                <div key={i} className="flex justify-between gap-2 text-xs">
                  <span className="text-red-600 truncate font-mono">{e.pattern}</span>
                  <span className="text-red-600 font-medium shrink-0">{e.count}次</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 自动动作 */}
        {report.actions_taken.length > 0 && (
          <div className="rounded border bg-blue-50 dark:bg-blue-950/20 border-blue-200 p-2">
            <div className="text-[11px] font-medium text-blue-700 mb-1">督察已自动处理</div>
            <ul className="space-y-0.5 text-xs text-blue-700">
              {report.actions_taken.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricBox({
  icon,
  label,
  value,
  color = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded border bg-muted/10 p-2">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-lg font-bold tabular-nums", color)}>{value}</div>
    </div>
  );
}
