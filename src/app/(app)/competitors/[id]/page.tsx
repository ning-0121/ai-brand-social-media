"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GROUP_LABELS, getDimensionsByGroup,
  calculateTotalScore, type RubricGroup,
} from "@/lib/competitor-intel/rubric";
import {
  ChevronLeft, Sparkles, Loader2, Package, Truck,
  TrendingUp, TrendingDown, ExternalLink, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Competitor {
  id: string;
  competitor_brand: string;
  product_name: string | null;
  product_url: string | null;
  price_usd: number | null;
  image_urls: string[] | null;
  teardown_scores: Record<string, number>;
  total_score: number | null;
  purchased: boolean;
  received: boolean;
  teardown_completed: boolean;
  ai_analysis: GapReport | null;
  notes: string | null;
}

interface GapReport {
  our_total: number;
  competitor_total: number;
  max: number;
  radar_data: Array<{ group: string; our_pct: number; theirs_pct: number }>;
  lead_dimensions: Array<{ key: string; label: string; our: number; theirs: number; advantage: number }>;
  behind_dimensions: Array<{ key: string; label: string; our: number; theirs: number; deficit: number; suggested_action: string }>;
  top_insights: string[];
  recommended_actions: Array<{ priority: "high" | "medium" | "low"; action: string; rationale: string }>;
}

const GROUP_ORDER: RubricGroup[] = ["physical", "ecommerce", "pricing", "marketing"];

export default function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [comp, setComp] = useState<Competitor | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeGroup, setActiveGroup] = useState<RubricGroup>("physical");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/competitors?action=get&id=${id}`);
    const data = await res.json();
    if (data.competitor) {
      setComp(data.competitor);
      setScores(data.competitor.teardown_scores || {});
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const updateScore = (key: string, val: number) => {
    setScores({ ...scores, [key]: val });
  };

  const saveScores = async () => {
    setSaving(true);
    try {
      await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_scores", id, scores }),
      });
      await load();
    } finally { setSaving(false); }
  };

  const toggleStatus = async (field: "purchased" | "received") => {
    await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_status", id, [field]: !comp?.[field] }),
    });
    await load();
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", id }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else await load();
    } finally { setAnalyzing(false); }
  };

  const del = async () => {
    if (!confirm("确定删除这个竞品？")) return;
    await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    router.push("/competitors");
  };

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  if (!comp) return <div className="p-6 text-center text-muted-foreground">竞品不存在</div>;

  const totals = calculateTotalScore(scores);
  const completionPct = Math.round((totals.completed / totals.total_dimensions) * 100);

  return (
    <div className="space-y-5 p-6 max-w-5xl mx-auto">
      <Link href="/competitors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4" /> 返回竞品列表
      </Link>

      <PageHeader
        title={comp.product_name || "未命名"}
        description={`${comp.competitor_brand}${comp.price_usd ? ` · $${comp.price_usd}` : ""}`}
        actions={
          <div className="flex gap-2">
            {comp.product_url && (
              <a href={comp.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 h-9 text-sm border rounded-md hover:bg-muted">
                <ExternalLink className="w-4 h-4 mr-1" />访问原页
              </a>
            )}
            <Button variant="outline" size="sm" onClick={del} className="text-red-600 hover:text-red-700">删除</Button>
          </div>
        }
      />

      {/* Images */}
      {comp.image_urls && comp.image_urls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {comp.image_urls.slice(0, 5).map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="w-32 h-32 object-cover rounded border flex-shrink-0" />
          ))}
        </div>
      )}

      {/* Status tracker */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm font-medium">实物追踪：</div>
            <Button
              size="sm"
              variant={comp.purchased ? "default" : "outline"}
              onClick={() => toggleStatus("purchased")}
              className="gap-1"
            >
              <Truck className="w-3.5 h-3.5" />
              {comp.purchased ? "已下单 ✓" : "标记已下单"}
            </Button>
            <Button
              size="sm"
              variant={comp.received ? "default" : "outline"}
              onClick={() => toggleStatus("received")}
              className="gap-1"
            >
              <Package className="w-3.5 h-3.5" />
              {comp.received ? "已收货 ✓" : "标记已收货"}
            </Button>
            {comp.received && (
              <span className="text-xs text-muted-foreground ml-auto">
                实物打分 {totals.completed}/{totals.total_dimensions} 项 ({completionPct}%)
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Score totals + generate analysis */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-purple-50/30">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">竞品总分</div>
              <div className="text-3xl font-bold">
                {totals.total}<span className="text-lg text-muted-foreground">/{totals.max}</span>
              </div>
            </div>
            <Button
              onClick={analyze}
              disabled={analyzing || totals.completed < 10}
              className="gap-2"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {comp.ai_analysis ? "重新生成 AI 差距报告" : "生成 AI 差距报告"}
            </Button>
          </div>
          {totals.completed < 10 && (
            <p className="text-xs text-muted-foreground">至少填完 10 项才能生成 AI 报告（当前 {totals.completed} 项）</p>
          )}
          {/* Quick breakdown by group */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t">
            {GROUP_ORDER.map(g => {
              const gs = totals.by_group[g];
              const pct = gs.max > 0 ? Math.round((gs.score / gs.max) * 100) : 0;
              return (
                <div key={g} className="text-center">
                  <div className="text-xs text-muted-foreground">{GROUP_LABELS[g]}</div>
                  <div className="font-mono text-sm">{gs.score}/{gs.max}</div>
                  <div className="h-1 bg-white/60 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis Report */}
      {comp.ai_analysis && <AnalysisReport report={comp.ai_analysis} />}

      {/* Group tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {GROUP_ORDER.map(g => {
          const gs = totals.by_group[g];
          const isActive = activeGroup === g;
          return (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={cn(
                "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {GROUP_LABELS[g]} <span className="ml-1 text-xs">({gs.score}/{gs.max})</span>
            </button>
          );
        })}
      </div>

      {/* Dimension scoring */}
      <div className="space-y-3">
        {getDimensionsByGroup(activeGroup).map(dim => {
          const score = scores[dim.key];
          const canScore = !dim.requires_physical || comp.received;
          return (
            <Card key={dim.key} className={cn(!canScore && "opacity-50")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{dim.label}</h4>
                      <Badge variant="outline" className="text-xs">满分 {dim.max_score}</Badge>
                      {dim.requires_physical && !comp.received && (
                        <Badge variant="secondary" className="text-xs">需实物</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{dim.description}</p>
                    <p className="text-xs text-muted-foreground/80 italic mt-0.5">
                      评分方法：{dim.how_to_evaluate}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: dim.max_score + 1 }, (_, i) => (
                      <button
                        key={i}
                        disabled={!canScore}
                        onClick={() => updateScore(dim.key, i)}
                        className={cn(
                          "w-8 h-8 rounded font-mono text-sm border transition-colors",
                          score === i
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted border-border",
                          !canScore && "cursor-not-allowed"
                        )}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save floating bar */}
      <div className="sticky bottom-6 flex justify-end">
        <Button onClick={saveScores} disabled={saving} className="shadow-lg">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          保存评分
        </Button>
      </div>
    </div>
  );
}

function AnalysisReport({ report }: { report: GapReport }) {
  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardContent className="p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-green-600" />
          AI 差距分析报告
        </h3>

        {/* Totals comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-muted-foreground">我方总分</div>
            <div className="text-2xl font-bold">{report.our_total}<span className="text-sm text-muted-foreground">/{report.max}</span></div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-xs text-muted-foreground">竞品总分</div>
            <div className="text-2xl font-bold">{report.competitor_total}<span className="text-sm text-muted-foreground">/{report.max}</span></div>
          </div>
        </div>

        {/* Radar bars */}
        <div className="space-y-2">
          <div className="text-sm font-medium">四维对比</div>
          {report.radar_data.map(r => (
            <div key={r.group} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span>{GROUP_LABELS[r.group as RubricGroup] || r.group}</span>
                <span className="font-mono">我 {r.our_pct}% vs 竞 {r.theirs_pct}%</span>
              </div>
              <div className="flex h-2 bg-white rounded overflow-hidden">
                <div className="bg-indigo-500" style={{ width: `${r.our_pct / 2}%` }} />
                <div className="bg-muted w-px" />
                <div className="bg-orange-500" style={{ width: `${r.theirs_pct / 2}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Top insights */}
        {report.top_insights && report.top_insights.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-sm font-medium">核心洞察</div>
            <ul className="space-y-1 text-sm">
              {report.top_insights.map((ins, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-600 flex-shrink-0">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        {report.recommended_actions && report.recommended_actions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">推荐战术（按优先级）</div>
            {report.recommended_actions.map((a, i) => (
              <div key={i} className="bg-white rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={a.priority === "high" ? "default" : a.priority === "medium" ? "secondary" : "outline"}>
                    {a.priority}
                  </Badge>
                  <span className="font-medium">{a.action}</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.rationale}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lead / Behind */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-sm font-medium flex items-center gap-1 text-green-700">
              <TrendingUp className="w-4 h-4" />我们领先
            </div>
            <div className="text-xs space-y-1 mt-1">
              {report.lead_dimensions.slice(0, 5).map(d => (
                <div key={d.key} className="flex justify-between">
                  <span>{d.label}</span>
                  <span className="font-mono text-green-600">+{d.advantage}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium flex items-center gap-1 text-red-700">
              <TrendingDown className="w-4 h-4" />我们落后
            </div>
            <div className="text-xs space-y-1 mt-1">
              {report.behind_dimensions.slice(0, 5).map(d => (
                <div key={d.key} className="flex justify-between">
                  <span>{d.label}</span>
                  <span className="font-mono text-red-600">-{d.deficit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
