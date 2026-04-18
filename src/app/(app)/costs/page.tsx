"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid,
} from "recharts";
import { Loader2, DollarSign, Zap, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CostData {
  window_days: number;
  totals: {
    total_cost_usd: number;
    total_runs: number;
    failed_runs: number;
    success_rate: number;
    input_tokens: number;
    output_tokens: number;
  };
  by_slug: Array<{ slug: string; runs: number; cost: number; avg_latency_ms: number; avg_cost_per_run: number; input_tokens: number; output_tokens: number; failed: number }>;
  by_model: Array<{ model: string; runs: number; cost: number; avg_cost_per_run: number }>;
  trend: Array<{ date: string; cost: number; runs: number }>;
}

function fmtUSD(n: number): string {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/costs?days=${days}`);
      const d = await res.json();
      setData(d);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [days]); // eslint-disable-line

  if (loading) {
    return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }

  if (!data || data.totals.total_runs === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="AI 成本看板" description="基于 prompt_runs 表的真实开销统计" />
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="text-sm font-medium">暂无执行记录</p>
            <p className="text-xs text-muted-foreground">先去 Prompt 实验室或跑几个 skill，数据会写入 prompt_runs 表</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI 成本看板"
        description={`最近 ${data.window_days} 天的 LLM 调用开销、延迟、成功率`}
        actions={
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
                {d} 天
              </Button>
            ))}
          </div>
        }
      />

      {/* KPI 4 格 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPIBox
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
          label="总开销"
          value={fmtUSD(data.totals.total_cost_usd)}
          sub={data.totals.total_cost_usd === 0 ? "OpenRouter 未启用时为 0" : "已记录"}
        />
        <KPIBox
          icon={<Activity className="h-4 w-4 text-blue-500" />}
          label="总调用"
          value={fmtNum(data.totals.total_runs)}
          sub={`平均 ${fmtUSD(data.totals.total_cost_usd / Math.max(1, data.totals.total_runs))}/次`}
        />
        <KPIBox
          icon={<Zap className="h-4 w-4 text-purple-500" />}
          label="Token 用量"
          value={`${fmtNum(data.totals.input_tokens + data.totals.output_tokens)}`}
          sub={`in ${fmtNum(data.totals.input_tokens)} / out ${fmtNum(data.totals.output_tokens)}`}
        />
        <KPIBox
          icon={<AlertTriangle className={cn("h-4 w-4", data.totals.success_rate < 90 ? "text-red-500" : "text-green-500")} />}
          label="成功率"
          value={`${data.totals.success_rate}%`}
          sub={data.totals.failed_runs > 0 ? `${data.totals.failed_runs} 次失败` : "全部成功"}
          color={data.totals.success_rate < 80 ? "text-red-600" : data.totals.success_rate < 95 ? "text-amber-600" : "text-green-600"}
        />
      </div>

      {/* 日开销趋势 */}
      {data.trend.length > 1 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">每日开销趋势</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtUSD} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => fmtUSD(Number(v))} />
                <Area type="monotone" dataKey="cost" stroke="#22c55e" fill="url(#costGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 按 Slug 排行 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">按 Prompt 汇总 Top 10</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {data.by_slug.slice(0, 10).map((s) => (
              <div key={s.slug} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs border-b pb-1.5">
                <div className="min-w-0">
                  <code className="font-mono text-[11px] truncate block">{s.slug}</code>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{s.runs} 次</span>
                    <span className="text-[10px] text-muted-foreground">avg {fmtMs(s.avg_latency_ms)}</span>
                    {s.failed > 0 && <Badge variant="outline" className="text-[9px] text-red-600 border-red-200">{s.failed} 失败</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-green-600">{fmtUSD(s.cost)}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtUSD(s.avg_cost_per_run)}/次</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 按模型对比 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">按模型对比</CardTitle></CardHeader>
          <CardContent>
            {data.by_model.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.by_model.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={fmtUSD} />
                  <YAxis dataKey="model" type="category" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => fmtUSD(Number(v))} />
                  <Bar dataKey="cost" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">暂无模型数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.totals.total_cost_usd === 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardContent className="p-3 text-xs text-amber-700 dark:text-amber-400">
            💡 开销为 $0，因为 cost 字段未填。启用 OpenRouter（设置 <code>OPENROUTER_API_KEY</code>）后，每次调用会自动返回真实 cost；Anthropic direct 路径不返回 cost，但 token 数仍被记录。
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPIBox({ icon, label, value, sub, color = "text-foreground" }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
        <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
