"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target, Star, ShieldCheck, Wrench, MessageCircle, Sparkles,
  Loader2, Check, TrendingUp, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Metrics {
  trust_coverage_pct: number;
  review_rate_pct: number;
  photo_review_rate_pct: number;
  avg_rating: number;
  quality_issues_critical: number;
  support_avg_response_sec: number;
  support_conversion_count: number;
  support_attributed_revenue: number;
  loyalty_tier_breakdown: Record<string, number>;
  projected_cvr_pct: number;
  industry_baseline_cvr_pct: number;
}

interface TrustSignal {
  id: string;
  page_type: string;
  signal_type: string;
  is_present: boolean;
  impact_estimate: string | null;
  recommended_position: string | null;
  notes: string | null;
}

interface QualityIssue {
  id: string;
  product_id: string | null;
  issue_type: string;
  severity: string;
  reported_count: number;
  supplier_contacted: boolean;
  resolved: boolean;
  customer_examples: string[] | null;
}

interface AIRec {
  top_3_actions?: Array<{
    rank: number; action: string; rationale: string;
    expected_cvr_lift: string; implementation_days: number; cost_usd: string; skill_to_use: string;
  }>;
  one_line_insight?: string;
}

const PAGE_LABELS: Record<string, string> = {
  product_page: "商品页",
  cart: "购物车",
  checkout: "结账页",
  landing: "落地页",
  homepage: "首页",
  email: "邮件",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  low: "bg-yellow-100 text-yellow-700 border-yellow-300",
};

export default function ConversionDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trustSignals, setTrustSignals] = useState<TrustSignal[]>([]);
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
  const [aiRec, setAiRec] = useState<AIRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRec, setLoadingRec] = useState(false);

  const load = async () => {
    const res = await fetch("/api/conversion?action=overview");
    const data = await res.json();
    setMetrics(data.metrics);
    setTrustSignals(data.trust_signals || []);
    setQualityIssues(data.quality_issues || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleSignal = async (id: string, present: boolean) => {
    await fetch("/api/conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_trust_signal", id, is_present: present, quality_score: present ? 3 : 0 }),
    });
    await load();
  };

  const getRec = async () => {
    setLoadingRec(true);
    try {
      const res = await fetch("/api/conversion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_weekly_recommendations" }),
      });
      const data = await res.json();
      setAiRec(data);
    } finally { setLoadingRec(false); }
  };

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  if (!metrics) return <div className="p-6">加载失败</div>;

  // 分组信任信号
  const byPage = trustSignals.reduce<Record<string, TrustSignal[]>>((acc, s) => {
    if (!acc[s.page_type]) acc[s.page_type] = [];
    acc[s.page_type].push(s);
    return acc;
  }, {});

  const cvrUpliftPct = metrics.industry_baseline_cvr_pct > 0
    ? Math.round(((metrics.projected_cvr_pct - metrics.industry_baseline_cvr_pct) / metrics.industry_baseline_cvr_pct) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <PageHeader
        title="全链转化优化"
        description="CVR 从 2% 到 3.5% 不是一个改动，是 10 个系统性提升"
      />

      {/* 核心 KPI 带进度条 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-purple-50/30">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold">预测 CVR</h3>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">{metrics.projected_cvr_pct}%</span>
              <span className="text-sm text-muted-foreground">vs 行业 {metrics.industry_baseline_cvr_pct}%</span>
              {cvrUpliftPct > 0 && (
                <Badge className="bg-green-500 text-white">+{cvrUpliftPct}%</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">基于 4 个系统当前状态自动估算</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold">本周 3 个最优动作</h3>
              </div>
              <Button size="sm" variant="outline" onClick={getRec} disabled={loadingRec}>
                {loadingRec ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {aiRec ? "刷新" : "让 AI 分析"}
              </Button>
            </div>
            {aiRec?.top_3_actions ? (
              <div className="space-y-1.5">
                {aiRec.top_3_actions.map(a => (
                  <div key={a.rank} className="text-xs flex gap-2">
                    <span className="font-mono flex-shrink-0">#{a.rank}</span>
                    <div>
                      <span className="font-medium">{a.action}</span>
                      <span className="text-indigo-600 ml-1">· {a.expected_cvr_lift}</span>
                      <span className="text-muted-foreground ml-1">· {a.implementation_days}天 · {a.cost_usd}</span>
                    </div>
                  </div>
                ))}
                {aiRec.one_line_insight && (
                  <p className="text-xs text-muted-foreground italic pt-2 border-t">💡 {aiRec.one_line_insight}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">点击「让 AI 分析」查看本周动作清单</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4 个系统健康度 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SystemCard
          icon={ShieldCheck}
          label="信任信号"
          metric={`${metrics.trust_coverage_pct}%`}
          detail={`${trustSignals.filter(s => s.is_present).length}/${trustSignals.length} 已部署`}
          status={metrics.trust_coverage_pct >= 80 ? "healthy" : metrics.trust_coverage_pct >= 50 ? "warning" : "danger"}
        />
        <SystemCard
          icon={Star}
          label="评价获取"
          metric={`${metrics.review_rate_pct}%`}
          detail={`带图率 ${metrics.photo_review_rate_pct}% · 均星 ${metrics.avg_rating || "—"}`}
          status={metrics.review_rate_pct >= 15 ? "healthy" : metrics.review_rate_pct >= 5 ? "warning" : "danger"}
        />
        <SystemCard
          icon={Wrench}
          label="品质问题"
          metric={String(metrics.quality_issues_critical)}
          detail={metrics.quality_issues_critical === 0 ? "无高危问题" : "严重 + 高优"}
          status={metrics.quality_issues_critical === 0 ? "healthy" : metrics.quality_issues_critical <= 2 ? "warning" : "danger"}
        />
        <SystemCard
          icon={MessageCircle}
          label="客服响应"
          metric={metrics.support_avg_response_sec > 0 ? `${metrics.support_avg_response_sec}s` : "—"}
          detail={`转化 ${metrics.support_conversion_count} · $${Math.round(metrics.support_attributed_revenue)}`}
          status={
            metrics.support_avg_response_sec === 0 ? "n/a" :
            metrics.support_avg_response_sec <= 45 ? "healthy" :
            metrics.support_avg_response_sec <= 120 ? "warning" : "danger"
          }
        />
      </div>

      {/* 信任信号审计清单 */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">信任信号审计清单</h3>
            <Badge variant="outline">{trustSignals.filter(s => s.is_present).length}/{trustSignals.length}</Badge>
          </div>
          <div className="space-y-5">
            {Object.entries(byPage).map(([pageType, signals]) => (
              <div key={pageType}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {PAGE_LABELS[pageType] || pageType}
                </h4>
                <div className="space-y-1.5">
                  {signals.map(s => (
                    <div key={s.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/30">
                      <button
                        onClick={() => toggleSignal(s.id, !s.is_present)}
                        className={cn(
                          "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          s.is_present ? "bg-green-500 border-green-500" : "border-muted-foreground/40 hover:border-muted-foreground"
                        )}
                      >
                        {s.is_present && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{s.signal_type.replace(/_/g, " ")}</span>
                          {s.impact_estimate && (
                            <Badge variant="outline" className="text-xs text-green-700 border-green-200">
                              <TrendingUp className="w-3 h-3 mr-0.5" />
                              {s.impact_estimate}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {s.recommended_position} {s.notes ? `· ${s.notes}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 品质问题待解决 */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold">品质问题工单</h3>
              <Badge variant="outline">{qualityIssues.length} 待解决</Badge>
            </div>
            <a href="/content" className="inline-flex items-center px-3 h-9 text-sm border rounded-md hover:bg-muted">
              用 AI 扫描品质问题
            </a>
          </div>
          {qualityIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">暂无待解决品质问题</p>
          ) : (
            <div className="space-y-2">
              {qualityIssues.slice(0, 10).map(q => (
                <div key={q.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-xs", SEVERITY_COLORS[q.severity])}>
                      {q.severity}
                    </Badge>
                    <span className="font-medium">{q.issue_type}</span>
                    <span className="text-xs text-muted-foreground">× {q.reported_count} 次</span>
                    {q.supplier_contacted && <Badge variant="secondary" className="text-xs">已联系供应商</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4 个 CTA 去触发对应 skill */}
      <Card className="bg-muted/30">
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3">用 AI 修复指定系统</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="/content" className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted transition-colors">
              <Star className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
              <div className="text-left">
                <div className="font-medium text-sm">评价获取系统</div>
                <div className="text-xs text-muted-foreground">Day 2-3 SMS + 激励 + Loox 配置</div>
              </div>
            </a>
            <a href="/content" className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted transition-colors">
              <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-sm">信任信号全站审计</div>
                <div className="text-xs text-muted-foreground">5 触点缺失检测 + 修复文案</div>
              </div>
            </a>
            <a href="/content" className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted transition-colors">
              <Wrench className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600" />
              <div className="text-left">
                <div className="font-medium text-sm">品质闭环分析</div>
                <div className="text-xs text-muted-foreground">退款率扫描 + 供应商沟通稿</div>
              </div>
            </a>
            <a href="/content" className="flex items-start gap-3 p-3 border rounded-md hover:bg-muted transition-colors">
              <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-600" />
              <div className="text-left">
                <div className="font-medium text-sm">客服 AI 回复生成器</div>
                <div className="text-xs text-muted-foreground">&lt;45s 响应 + 加购推荐</div>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SystemCard({ icon: Icon, label, metric, detail, status }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; metric: string; detail: string;
  status: "healthy" | "warning" | "danger" | "n/a";
}) {
  const colors: Record<string, string> = {
    healthy: "text-green-600",
    warning: "text-amber-600",
    danger: "text-red-600",
    "n/a": "text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className={cn("text-2xl font-bold mt-1", colors[status])}>{metric}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
      </CardContent>
    </Card>
  );
}
