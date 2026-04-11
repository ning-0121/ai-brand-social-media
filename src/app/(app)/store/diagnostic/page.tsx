"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Loader2,
  RefreshCw,
  ArrowLeft,
  Play,
} from "lucide-react";
import { HealthScoreRing } from "@/components/diagnostic/health-score-ring";
import { FindingCard } from "@/components/diagnostic/finding-card";
import type {
  DiagnosticReportWithFindings,
  DiagnosticSummary,
  FindingCategory,
} from "@/lib/diagnostic-types";
import Link from "next/link";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "seo", label: "SEO" },
  { value: "product", label: "商品" },
  { value: "inventory", label: "库存" },
  { value: "sales", label: "销售" },
  { value: "content", label: "内容" },
];

export default function DiagnosticPage() {
  const [report, setReport] = useState<DiagnosticReportWithFindings | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState("all");

  const fetchReport = async () => {
    try {
      const res = await fetch("/api/diagnostic?type=latest");
      const data = await res.json();
      setReport(data.report || null);
    } catch {
      toast.error("获取报告失败");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
    } catch {
      toast.error("运行诊断失败");
    }
    setRunning(false);
  };

  const handleExecute = async (findingId: string) => {
    const res = await fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "execute_finding", finding_id: findingId }),
    });
    return await res.json();
  };

  const handleDismiss = async (findingId: string) => {
    await fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_finding", finding_id: findingId }),
    });
  };

  const handleBulkExecute = async (severity: string) => {
    if (!report) return;
    const findings = report.findings.filter(
      (f) => f.status === "open" && f.severity === severity && f.recommended_action.action_type !== "info_only"
    );
    for (const f of findings) {
      await handleExecute(f.id);
    }
    // 刷新
    await fetchReport();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded bg-muted animate-pulse" />
        <div className="h-[200px] rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  const filteredFindings = report?.findings.filter(
    (f) => tab === "all" || f.category === tab
  ) || [];

  const summary = report?.summary as DiagnosticSummary | undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">AI 店铺诊断报告</h1>
            {report?.completed_at && (
              <p className="text-xs text-muted-foreground">
                上次诊断：{new Date(report.completed_at).toLocaleString("zh-CN")}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              诊断中...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              重新诊断
            </>
          )}
        </Button>
      </div>

      {!report ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16">
            <Activity className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">暂无诊断报告，点击上方按钮运行诊断</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
            <Card className="lg:col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <HealthScoreRing score={summary?.overall_health || 0} size={140} />
                <div className="mt-3 text-center">
                  <p className="text-sm font-medium">店铺健康指数</p>
                  <p className="text-xs text-muted-foreground">
                    {summary?.total_findings || 0} 个发现 · {summary?.critical || 0} 个紧急
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">各维度评分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-3">
                  {(["seo", "product", "inventory", "sales", "content"] as FindingCategory[]).map((cat) => {
                    const scoreKey = `${cat}_score` as keyof DiagnosticSummary;
                    const score = (summary?.[scoreKey] as number) || 0;
                    const count = report.findings.filter((f) => f.category === cat && f.status === "open").length;
                    return (
                      <div key={cat} className="text-center space-y-1">
                        <HealthScoreRing score={score} size={64} strokeWidth={6} />
                        <p className="text-xs font-medium">
                          {CATEGORIES.find((c) => c.value === cat)?.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{count} 个问题</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk actions */}
          {(summary?.critical || 0) > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/50 px-4 py-3">
              <span className="text-sm font-medium text-red-600">
                {summary?.critical} 个紧急问题需要处理
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="ml-auto h-7 text-xs"
                onClick={() => handleBulkExecute("critical")}
              >
                <Play className="mr-1 h-3 w-3" />
                一键执行全部紧急项
              </Button>
            </div>
          )}

          {/* Findings by category */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {CATEGORIES.map((cat) => {
                const count =
                  cat.value === "all"
                    ? report.findings.filter((f) => f.status === "open").length
                    : report.findings.filter((f) => f.category === cat.value && f.status === "open").length;
                return (
                  <TabsTrigger key={cat.value} value={cat.value} className="gap-1.5">
                    {cat.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={tab} className="mt-4 space-y-2">
              {filteredFindings.length > 0 ? (
                filteredFindings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onExecute={handleExecute}
                    onDismiss={handleDismiss}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {tab === "all" ? "暂无发现" : `${CATEGORIES.find((c) => c.value === tab)?.label} 维度暂无问题`}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
