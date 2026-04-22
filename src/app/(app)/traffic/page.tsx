"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Zap, Play, Pause,
  Loader2, Sparkles, Target, DollarSign, ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelHealth {
  roas_vs_target: "healthy" | "warning" | "danger" | "n/a";
  utilization_pct: number;
  next_dollar_score: number;
}

interface TrafficChannel {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  monthly_budget_usd: number;
  monthly_spent_usd: number;
  month_to_date_traffic: number;
  month_to_date_conversions: number;
  month_to_date_revenue_usd: number;
  roas: number | null;
  cpa_usd: number | null;
  cpc_usd: number | null;
  scaling_ceiling_monthly_usd: number | null;
  ai_leverage_score: number | null;
  time_to_roi_days: number | null;
  notes: string | null;
  health: ChannelHealth;
}

interface Totals {
  spent: number;
  revenue: number;
  traffic: number;
  conversions: number;
  blended_roas: number;
  avg_cvr_pct: number;
}

interface Recommendation {
  recommendation?: {
    channel_slug: string;
    amount_usd: number;
    priority: string;
    rationale: string;
    expected_return: string;
  };
  alternatives?: Array<{ channel_slug: string; amount_usd: number; when_to_consider: string }>;
  kill_recommendations?: Array<{ channel_slug: string; reason: string }>;
  holistic_insight?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  seo: "SEO",
  paid: "付费",
  owned: "自营",
  pr: "PR / 媒体",
  community: "社区",
  partnership: "合作",
};
const CATEGORY_COLORS: Record<string, string> = {
  seo: "bg-blue-500/10 text-blue-700 border-blue-200",
  paid: "bg-purple-500/10 text-purple-700 border-purple-200",
  owned: "bg-green-500/10 text-green-700 border-green-200",
  pr: "bg-amber-500/10 text-amber-700 border-amber-200",
  community: "bg-pink-500/10 text-pink-700 border-pink-200",
  partnership: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
};
const STATUS_LABELS: Record<string, string> = {
  not_started: "未启动",
  warming_up: "学习期",
  active: "运行中",
  paused: "暂停",
  killed: "已停",
};
const HEALTH_COLORS: Record<string, string> = {
  healthy: "text-green-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  "n/a": "text-muted-foreground",
};

export default function TrafficDashboardPage() {
  const [channels, setChannels] = useState<TrafficChannel[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch("/api/traffic?action=overview");
    const data = await res.json();
    setChannels(data.channels || []);
    setTotals(data.totals);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (c: TrafficChannel) => {
    setEditingId(c.id);
    setEditValues({
      monthly_budget_usd: String(c.monthly_budget_usd || ""),
      monthly_spent_usd: String(c.monthly_spent_usd || ""),
      month_to_date_traffic: String(c.month_to_date_traffic || ""),
      month_to_date_conversions: String(c.month_to_date_conversions || ""),
      month_to_date_revenue_usd: String(c.month_to_date_revenue_usd || ""),
      status: c.status,
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updates: Record<string, unknown> = {};
    for (const k of Object.keys(editValues)) {
      const v = editValues[k];
      if (k === "status") updates[k] = v;
      else updates[k] = v === "" ? 0 : Number(v);
    }
    await fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_channel", id: editingId, updates }),
    });
    setEditingId(null);
    await load();
  };

  const getRecommendation = async () => {
    setLoadingRec(true);
    try {
      const res = await fetch("/api/traffic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next_dollar_recommendation" }),
      });
      const data = await res.json();
      setRecommendation(data);
    } finally { setLoadingRec(false); }
  };

  const byCategory = channels.reduce<Record<string, TrafficChannel[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <PageHeader
        title="流量指挥中心"
        description="8 渠道 ROI 一览 · 每一块钱的去向都可追溯 · AI 告诉你下一笔投哪里"
      />

      {/* KPI Totals */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile icon={DollarSign} label="本月投入" value={`$${totals.spent.toFixed(0)}`} />
          <KpiTile icon={TrendingUp} label="本月营收" value={`$${totals.revenue.toFixed(0)}`} highlight />
          <KpiTile icon={Target} label="Blended ROAS"
            value={totals.blended_roas ? `${totals.blended_roas.toFixed(2)}x` : "—"}
            color={totals.blended_roas >= 2.5 ? "green" : totals.blended_roas >= 1.5 ? "amber" : "red"}
          />
          <KpiTile icon={ShoppingCart} label="综合 CVR"
            value={totals.avg_cvr_pct ? `${totals.avg_cvr_pct.toFixed(2)}%` : "—"}
          />
        </div>
      )}

      {/* Next Dollar AI Recommendation */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-purple-50/30">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold">下一块 $500 投哪？ — AI 建议</h3>
            </div>
            <Button size="sm" onClick={getRecommendation} disabled={loadingRec}>
              {loadingRec ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
              {recommendation ? "重新分析" : "让 AI 分析"}
            </Button>
          </div>

          {recommendation?.recommendation && (
            <div className="bg-white rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-600">首选</Badge>
                <span className="font-semibold">
                  {channels.find(c => c.slug === recommendation.recommendation!.channel_slug)?.name || recommendation.recommendation.channel_slug}
                </span>
                <span className="text-sm font-mono">${recommendation.recommendation.amount_usd}</span>
                <Badge variant={recommendation.recommendation.priority === "critical" ? "destructive" : "secondary"}>
                  {recommendation.recommendation.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{recommendation.recommendation.rationale}</p>
              <p className="text-xs text-indigo-700">预期：{recommendation.recommendation.expected_return}</p>
            </div>
          )}

          {recommendation?.alternatives && recommendation.alternatives.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">备选：</div>
              {recommendation.alternatives.slice(0, 2).map((a, i) => (
                <div key={i} className="text-xs bg-white/60 rounded px-3 py-1.5">
                  <span className="font-medium">{channels.find(c => c.slug === a.channel_slug)?.name || a.channel_slug}</span>
                  <span className="ml-2 font-mono">${a.amount_usd}</span>
                  <span className="ml-2 text-muted-foreground">— {a.when_to_consider}</span>
                </div>
              ))}
            </div>
          )}

          {recommendation?.kill_recommendations && recommendation.kill_recommendations.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-red-700">建议停掉：</div>
              {recommendation.kill_recommendations.map((k, i) => (
                <div key={i} className="text-xs bg-red-50/60 rounded px-3 py-1.5 text-red-700">
                  {channels.find(c => c.slug === k.channel_slug)?.name || k.channel_slug}: {k.reason}
                </div>
              ))}
            </div>
          )}

          {recommendation?.holistic_insight && (
            <p className="text-xs text-muted-foreground italic pt-2 border-t">💡 {recommendation.holistic_insight}</p>
          )}
        </CardContent>
      </Card>

      {/* Channel table by category */}
      <div className="space-y-6">
        {Object.entries(byCategory).map(([cat, list]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("text-sm", CATEGORY_COLORS[cat])}>
                {CATEGORY_LABELS[cat] || cat}
              </Badge>
              <span className="text-sm text-muted-foreground">({list.length} 个渠道)</span>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left p-3 font-medium">渠道</th>
                      <th className="text-right p-3 font-medium">月预算 / 已花</th>
                      <th className="text-right p-3 font-medium">流量 / 转化</th>
                      <th className="text-right p-3 font-medium">ROAS</th>
                      <th className="text-right p-3 font-medium">CPA / CPC</th>
                      <th className="text-center p-3 font-medium">状态</th>
                      <th className="text-center p-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map(c => (
                      <tr key={c.id} className="border-b hover:bg-muted/20">
                        {editingId === c.id ? (
                          <>
                            <td className="p-3">
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.notes?.slice(0, 50)}</div>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Input className="h-7 text-xs" type="number" placeholder="预算"
                                  value={editValues.monthly_budget_usd}
                                  onChange={e => setEditValues({ ...editValues, monthly_budget_usd: e.target.value })} />
                                <Input className="h-7 text-xs" type="number" placeholder="已花"
                                  value={editValues.monthly_spent_usd}
                                  onChange={e => setEditValues({ ...editValues, monthly_spent_usd: e.target.value })} />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Input className="h-7 text-xs" type="number" placeholder="流量"
                                  value={editValues.month_to_date_traffic}
                                  onChange={e => setEditValues({ ...editValues, month_to_date_traffic: e.target.value })} />
                                <Input className="h-7 text-xs" type="number" placeholder="转化"
                                  value={editValues.month_to_date_conversions}
                                  onChange={e => setEditValues({ ...editValues, month_to_date_conversions: e.target.value })} />
                              </div>
                            </td>
                            <td className="p-2">
                              <Input className="h-7 text-xs" type="number" placeholder="营收"
                                value={editValues.month_to_date_revenue_usd}
                                onChange={e => setEditValues({ ...editValues, month_to_date_revenue_usd: e.target.value })} />
                            </td>
                            <td></td>
                            <td className="p-2">
                              <select className="h-7 text-xs border rounded px-2"
                                value={editValues.status}
                                onChange={e => setEditValues({ ...editValues, status: e.target.value })}>
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                  <option key={k} value={k}>{v}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                <Button size="sm" className="h-7 px-2" onClick={saveEdit}>保存</Button>
                                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditingId(null)}>取消</Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3">
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.notes?.slice(0, 60)}</div>
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              <div>${c.monthly_budget_usd || 0}</div>
                              <div className="text-muted-foreground">${c.monthly_spent_usd || 0} ({c.health.utilization_pct}%)</div>
                            </td>
                            <td className="p-3 text-right font-mono text-xs">
                              <div>{c.month_to_date_traffic || 0}</div>
                              <div className="text-muted-foreground">{c.month_to_date_conversions || 0}</div>
                            </td>
                            <td className={cn("p-3 text-right font-mono", HEALTH_COLORS[c.health.roas_vs_target])}>
                              {c.roas ? `${c.roas.toFixed(2)}x` : "—"}
                              {c.health.roas_vs_target === "healthy" && <TrendingUp className="w-3 h-3 inline ml-1" />}
                              {c.health.roas_vs_target === "danger" && <TrendingDown className="w-3 h-3 inline ml-1" />}
                            </td>
                            <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                              <div>CPA ${c.cpa_usd?.toFixed(2) || "—"}</div>
                              <div>CPC ${c.cpc_usd?.toFixed(3) || "—"}</div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={
                                c.status === "active" ? "default" :
                                c.status === "not_started" ? "outline" :
                                c.status === "warming_up" ? "secondary" :
                                "outline"
                              } className="text-xs">
                                {c.status === "active" && <Play className="w-2.5 h-2.5 mr-0.5" />}
                                {c.status === "paused" && <Pause className="w-2.5 h-2.5 mr-0.5" />}
                                {STATUS_LABELS[c.status]}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEdit(c)}>
                                编辑
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value, highlight, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; highlight?: boolean;
  color?: "green" | "amber" | "red";
}) {
  const colorClass = color === "green" ? "text-green-600" : color === "amber" ? "text-amber-600" : color === "red" ? "text-red-600" : "";
  return (
    <Card className={cn(highlight && "border-primary/40 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        <div className={cn("text-2xl font-bold mt-1", colorClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}
