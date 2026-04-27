"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Search,
  Package,
  Box,
  TrendingDown,
  FileText,
  Loader2,
  ArrowRight,
  RefreshCw,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthScoreRing } from "./health-score-ring";
import { FindingCard } from "./finding-card";
import type { DiagnosticReportWithFindings, DiagnosticSummary, FindingCategory } from "@/lib/diagnostic-types";
import Link from "next/link";
import { toast } from "sonner";

const CATEGORY_CONFIG: Record<
  FindingCategory,
  { label: string; icon: typeof Search; color: string }
> = {
  seo: { label: "SEO", icon: Search, color: "text-blue-500" },
  product: { label: "商品", icon: Package, color: "text-purple-500" },
  inventory: { label: "库存", icon: Box, color: "text-orange-500" },
  sales: { label: "销售", icon: TrendingDown, color: "text-green-500" },
  content: { label: "内容", icon: FileText, color: "text-pink-500" },
  traffic: { label: "流量", icon: Globe, color: "text-yellow-500" },
};

function CategoryScoreCard({
  category,
  score,
  findingCount,
}: {
  category: FindingCategory;
  score: number;
  findingCount: number;
}) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
      <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">{config.label}</p>
        <p className="text-[10px] text-muted-foreground">
          {findingCount > 0 ? `${findingCount} 个问题` : "良好"}
        </p>
      </div>
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500"
        )}
      >
        {score}
      </span>
    </div>
  );
}

export function DailyBriefing() {
  const [report, setReport] = useState<DiagnosticReportWithFindings | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchLatest = async () => {
    try {
      const res = await fetch("/api/diagnostic?type=latest");
      const data = await res.json();
      setReport(data.report || null);
    } catch {
      toast.error("获取诊断报告失败");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLatest();
  }, []);

  const handleRunDiagnostic = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      }
    } catch {
      toast.error("运行诊断失败，请重试");
    }
    setRunning(false);
  };

  const handleExecuteFinding = async (findingId: string) => {
    const res = await fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "execute_finding", finding_id: findingId }),
    });
    const data = await res.json();
    return data;
  };

  const handleDismissFinding = async (findingId: string) => {
    await fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_finding", finding_id: findingId }),
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6">
            <Skeleton className="h-[120px] w-[120px] rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 没有报告 → 显示运行按钮
  if (!report) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
          <div className="rounded-full bg-primary/10 p-4">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold">AI 全店诊断</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              AI 将自动扫描店铺 SEO、商品、库存、销售和内容，生成诊断报告
            </p>
          </div>
          <Button onClick={handleRunDiagnostic} disabled={running}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                诊断中...
              </>
            ) : (
              <>
                <Activity className="mr-2 h-4 w-4" />
                运行诊断
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = report.summary as DiagnosticSummary;
  const topFindings = report.findings
    .filter((f) => f.status === "open")
    .slice(0, 6);

  // 计算报告年龄
  const reportAge = report.completed_at
    ? Math.floor((Date.now() - new Date(report.completed_at).getTime()) / 3600000)
    : 0;
  const isStale = reportAge > 24;

  // 每个类别的发现数量
  const categoryFindingCount = (cat: FindingCategory) =>
    report.findings.filter((f) => f.category === cat && f.status === "open").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">AI 店铺诊断</CardTitle>
            {isStale && (
              <Badge variant="outline" className="text-[10px] text-yellow-600 border-yellow-200">
                {reportAge}小时前
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleRunDiagnostic}
              disabled={running}
            >
              {running ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              {running ? "诊断中..." : "重新诊断"}
            </Button>
            <Link href="/store/diagnostic">
              <Button size="sm" variant="ghost" className="h-7 text-xs">
                完整报告
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 健康分 + 类别分数 */}
        <div className="flex gap-6">
          <HealthScoreRing score={summary.overall_health} />

          <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <CategoryScoreCard
              category="seo"
              score={summary.seo_score}
              findingCount={categoryFindingCount("seo")}
            />
            <CategoryScoreCard
              category="product"
              score={summary.product_score}
              findingCount={categoryFindingCount("product")}
            />
            <CategoryScoreCard
              category="inventory"
              score={summary.inventory_score}
              findingCount={categoryFindingCount("inventory")}
            />
            <CategoryScoreCard
              category="sales"
              score={summary.sales_score}
              findingCount={categoryFindingCount("sales")}
            />
            <CategoryScoreCard
              category="content"
              score={summary.content_score}
              findingCount={categoryFindingCount("content")}
            />
            <CategoryScoreCard
              category="traffic"
              score={summary.traffic_score ?? 100}
              findingCount={categoryFindingCount("traffic")}
            />
          </div>
        </div>

        {/* 统计摘要 */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>共 {summary.total_findings} 个发现</span>
          {summary.critical > 0 && (
            <span className="text-red-500 font-medium">{summary.critical} 个紧急</span>
          )}
          {summary.high > 0 && (
            <span className="text-orange-500 font-medium">{summary.high} 个重要</span>
          )}
          {summary.medium > 0 && <span>{summary.medium} 个建议</span>}
        </div>

        {/* 优先发现列表 */}
        {topFindings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">优先处理</p>
            {topFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onExecute={handleExecuteFinding}
                onDismiss={handleDismissFinding}
              />
            ))}
          </div>
        )}

        {topFindings.length === 0 && (
          <div className="text-center py-4 space-y-2">
            {summary.overall_health >= 80 ? (
              <p className="text-sm text-muted-foreground">所有问题已处理，店铺状态良好！</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  当前无待处理发现，但健康分仅 {summary.overall_health}。
                </p>
                <p className="text-xs text-muted-foreground">
                  点「重新诊断」获取最新问题清单。
                </p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
