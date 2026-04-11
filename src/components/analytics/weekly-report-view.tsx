"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WeeklyReport {
  id: string;
  week_start: string;
  summary: string;
  highlights: Array<{ title: string; metric: string; change: string }>;
  concerns: Array<{ title: string; detail: string }>;
  recommendations: string[];
  metrics: Record<string, number>;
  prev_metrics: Record<string, number>;
  ai_actions_count: number;
  ai_success_rate: number;
  created_at: string;
}

export function WeeklyReportView() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    fetch("/api/weekly-report")
      .then((r) => r.json())
      .then((data) => setReport(data.report || null))
      .catch(() => toast.error("加载周报失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        toast.success("周报已生成");
        fetchReport();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "生成失败");
      }
    } catch {
      toast.error("生成周报失败");
    }
    setGenerating(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            运营周报
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {generating ? "生成中..." : report ? "重新生成" : "生成周报"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!report ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            暂无周报。点击上方按钮生成，或等待每周一自动生成。
          </div>
        ) : (
          <div className="space-y-4">
            {/* Week header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>周报: {report.week_start}</span>
              <span>·</span>
              <span>AI 操作 {report.ai_actions_count} 次</span>
              <span>·</span>
              <span>成功率 {report.ai_success_rate}%</span>
            </div>

            {/* Summary */}
            <div className="text-sm leading-relaxed">{report.summary}</div>

            {/* Highlights */}
            {report.highlights && report.highlights.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  亮点
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {report.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-medium">{h.title}</div>
                        <div className="text-sm font-bold">{h.metric}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          h.change?.startsWith("+")
                            ? "text-emerald-600 border-emerald-300"
                            : "text-red-600 border-red-300"
                        )}
                      >
                        {h.change}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concerns */}
            {report.concerns && report.concerns.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  关注点
                </div>
                <div className="space-y-1">
                  {report.concerns.map((c, i) => (
                    <div
                      key={i}
                      className="text-sm p-2 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30"
                    >
                      <span className="font-medium">{c.title}</span>
                      {c.detail && (
                        <span className="text-muted-foreground">
                          {" — "}
                          {c.detail}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  下周建议
                </div>
                <ul className="space-y-1">
                  {report.recommendations.map((r, i) => (
                    <li
                      key={i}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
