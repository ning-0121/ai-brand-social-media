"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface PilotMetrics {
  execution_count: number;
  success_rate: number;
  error_rate: number;
  rollback_rate: number;
  approval_pass_rate: number;
  content_publish_rate: number;
  seo_apply_rate: number;
  avg_latency_ms: number;
  top_features: { name: string; count: number }[];
  bottom_features: { name: string; count: number }[];
}

const DEFAULT_METRICS: PilotMetrics = {
  execution_count: 0,
  success_rate: 0,
  error_rate: 0,
  rollback_rate: 0,
  approval_pass_rate: 0,
  content_publish_rate: 0,
  seo_apply_rate: 0,
  avg_latency_ms: 0,
  top_features: [],
  bottom_features: [],
};

export default function PilotMetricsPage() {
  const [metrics, setMetrics] = useState<PilotMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(() => {
    fetch("/api/pilot/metrics")
      .then((r) => r.json())
      .then((data) => setMetrics({ ...DEFAULT_METRICS, ...data }))
      .catch(() => toast.error("加载指标失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilot Metrics"
        description="试跑期间的关键运营指标与功能使用数据"
        actions={
          <Link href="/pilot">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              返回
            </Button>
          </Link>
        }
      />

      {/* Row 1 KPIs */}
      <KPICardGrid>
        <KPICard
          label="执行次数"
          value={metrics.execution_count}
          trend={metrics.execution_count > 0 ? "up" : "flat"}
          icon="Activity"
        />
        <KPICard
          label="成功率"
          value={metrics.success_rate}
          trend={metrics.success_rate >= 80 ? "up" : metrics.success_rate >= 50 ? "flat" : "down"}
          icon="CheckCircle2"
          format="percent"
        />
        <KPICard
          label="错误率"
          value={metrics.error_rate}
          trend={metrics.error_rate <= 10 ? "up" : metrics.error_rate <= 30 ? "flat" : "down"}
          icon="XCircle"
          format="percent"
        />
        <KPICard
          label="回滚率"
          value={metrics.rollback_rate}
          trend={metrics.rollback_rate <= 5 ? "up" : "down"}
          icon="RotateCcw"
          format="percent"
        />
      </KPICardGrid>

      {/* Row 2 KPIs */}
      <KPICardGrid>
        <KPICard
          label="审批通过率"
          value={metrics.approval_pass_rate}
          trend={metrics.approval_pass_rate >= 70 ? "up" : "flat"}
          icon="ShieldCheck"
          format="percent"
        />
        <KPICard
          label="内容发布率"
          value={metrics.content_publish_rate}
          trend={metrics.content_publish_rate >= 60 ? "up" : "flat"}
          icon="FileText"
          format="percent"
        />
        <KPICard
          label="SEO应用率"
          value={metrics.seo_apply_rate}
          trend={metrics.seo_apply_rate >= 50 ? "up" : "flat"}
          icon="Search"
          format="percent"
        />
        <KPICard
          label="平均耗时(ms)"
          value={metrics.avg_latency_ms}
          trend={metrics.avg_latency_ms <= 3000 ? "up" : "down"}
          icon="Clock"
        />
      </KPICardGrid>

      {/* Feature Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              使用率最高功能
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.top_features.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {metrics.top_features.slice(0, 5).map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <span className="text-sm font-medium">{f.name}</span>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{f.count} 次</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              使用率最低功能
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.bottom_features.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {metrics.bottom_features.slice(0, 5).map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between p-2.5 rounded-md border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <span className="text-sm font-medium">{f.name}</span>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{f.count} 次</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
