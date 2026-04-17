"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  Users,
  MousePointerClick,
  Activity,
  Globe,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GA4OverviewMetrics, GA4TrafficSource, GA4DailyPoint } from "@/lib/ga4-api";

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  return `${Math.floor(sec / 60)}m${Math.round(sec % 60)}s`;
}

export function GA4Widget() {
  const [overview, setOverview] = useState<GA4OverviewMetrics | null>(null);
  const [traffic, setTraffic] = useState<GA4TrafficSource[]>([]);
  const [trend, setTrend] = useState<GA4DailyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, trRes, tdRes] = await Promise.all([
        fetch("/api/ga4?type=overview&days=30"),
        fetch("/api/ga4?type=traffic&days=30"),
        fetch("/api/ga4?type=trend&days=30"),
      ]);

      const ovData = await ovRes.json();
      const trData = await trRes.json();
      const tdData = await tdRes.json();

      if (ovData.error?.includes("GA4") || ovData.data === null) {
        setNotConnected(true);
        return;
      }

      setOverview(ovData.data);
      setTraffic(trData.data || []);
      setTrend(tdData.data || []);
    } catch {
      setError("GA4 数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  if (notConnected) return null; // Don't render if not connected

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-sm font-semibold">Google Analytics 4</CardTitle>
            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
              已连接
            </Badge>
            <span className="text-[11px] text-muted-foreground">近 30 天</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">正在从 GA4 拉取数据...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-500 py-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : overview ? (
          <>
            {/* 4 KPI 格 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricBox
                icon={<Activity className="h-3.5 w-3.5 text-blue-500" />}
                label="会话数"
                value={fmt(overview.sessions)}
                sub="Sessions"
                color="text-blue-600"
              />
              <MetricBox
                icon={<Users className="h-3.5 w-3.5 text-purple-500" />}
                label="用户数"
                value={fmt(overview.users)}
                sub={`新用户 ${fmt(overview.newUsers)}`}
                color="text-purple-600"
              />
              <MetricBox
                icon={<MousePointerClick className="h-3.5 w-3.5 text-amber-500" />}
                label="跳出率"
                value={`${overview.bounceRate.toFixed(1)}%`}
                sub={overview.bounceRate < 50 ? "良好" : overview.bounceRate < 70 ? "一般" : "偏高"}
                color={overview.bounceRate < 50 ? "text-green-600" : overview.bounceRate < 70 ? "text-amber-600" : "text-red-600"}
              />
              <MetricBox
                icon={<TrendingUp className="h-3.5 w-3.5 text-green-500" />}
                label="平均时长"
                value={fmtDuration(overview.avgSessionDuration)}
                sub={`页面浏览 ${fmt(overview.pageViews)}`}
                color="text-green-600"
              />
            </div>

            {/* 30天趋势 */}
            {trend.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-2">访问趋势（近 30 天）</div>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={trend} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="ga4SessionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.slice(4)} // MMDD
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(v) => [fmt(Number(v)), "会话数"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      fill="url(#ga4SessionGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 流量来源 */}
            {traffic.length > 0 && (
              <div>
                <div className="text-[11px] font-medium text-muted-foreground mb-2">流量来源 Top 6</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart
                    data={traffic.slice(0, 6)}
                    layout="vertical"
                    margin={{ top: 0, right: 10, bottom: 0, left: 0 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                    <YAxis
                      dataKey="source"
                      type="category"
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(v) => [fmt(Number(v)), "会话"]}
                    />
                    <Bar dataKey="sessions" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {overview.conversions > 0 && (
              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="text-muted-foreground">转化事件</span>
                <span className="font-semibold text-green-600">{fmt(overview.conversions)} 次</span>
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-center text-sm text-muted-foreground space-y-2">
            <Globe className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p>GA4 已连接，但暂无数据</p>
            <p className="text-xs">请确认已在 GA4 中选择正确的 Property，且网站有访问记录</p>
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              打开 GA4 控制台 <ExternalLink className="h-3 w-3" />
            </a>
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
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-xl font-bold tabular-nums", color)}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
