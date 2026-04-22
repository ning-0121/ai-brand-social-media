"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KPIComparisonCard } from "@/components/analytics/kpi-comparison-card";
import { useSupabase } from "@/hooks/use-supabase";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { DailyBriefing } from "@/components/diagnostic/daily-briefing";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDashboardKPIs,
  getRevenueTimeSeries,
  getRecentOrders,
  getTopProducts,
  getTodayStats,
  type DashboardKPIs,
} from "@/lib/supabase-queries";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  FileText,
  Radar,
  Store,
  CalendarDays,
  ArrowRight,
  ShoppingCart,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
  Coffee,
} from "lucide-react";
import Link from "next/link";
import { GA4Widget } from "@/components/analytics/ga4-widget";
import { DataSyncBar } from "@/components/ops/data-sync-bar";

const QUOTES = [
  "每一次用心经营，都是品牌成长的养分。",
  "好的品牌，从一个好故事开始。",
  "坚持做对的事，时间会给出答案。",
  "不必追逐每个趋势，找到属于你的节奏。",
  "今天的每一步，都在靠近更好的品牌。",
  "慢慢来，比较快。",
  "用心做内容，用爱做品牌。",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return { text: "夜深了", icon: Moon, emoji: "🌙" };
  if (hour < 9) return { text: "早上好", icon: Sun, emoji: "☀️" };
  if (hour < 12) return { text: "上午好", icon: CloudSun, emoji: "🌤" };
  if (hour < 14) return { text: "中午好", icon: Coffee, emoji: "☕" };
  if (hour < 18) return { text: "下午好", icon: Sun, emoji: "🌅" };
  if (hour < 22) return { text: "晚上好", icon: Moon, emoji: "🌆" };
  return { text: "夜深了", icon: Moon, emoji: "🌙" };
}

function getDateString() {
  const now = new Date();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

function AutoOpsStatusCard() {
  const [logs, setLogs] = useState<Array<{ id: string; run_type: string; created_at: string; results_summary: { success?: number; failed?: number; total?: number } }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load auto-ops logs via browser supabase client (has user session)
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase-browser");
        const sb = createClient();
        const { data } = await sb.from("auto_ops_logs")
          .select("id, run_type, created_at, results_summary")
          .order("created_at", { ascending: false })
          .limit(3);
        if (data) setLogs(data as typeof logs);
      } catch { /* silent */ }
      setLoaded(true);
    })();
  }, []);

  if (!loaded || logs.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium">自动运营引擎</span>
          <span className="text-[10px] text-muted-foreground ml-auto">每小时 + 每天 8:00 自动运行</span>
        </div>
        <div className="flex gap-3">
          {logs.map((log) => (
            <div key={log.id} className="text-[11px] text-muted-foreground">
              <span className="font-medium">{log.run_type}</span>
              {" · "}
              {log.results_summary?.success || 0}/{log.results_summary?.total || 0} 成功
              {" · "}
              {new Date(log.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function GreetingBanner({ todayRevenue, todayOrders }: { todayRevenue: number; todayOrders: number }) {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  useEffect(() => setMounted(true), []);

  const greeting = getGreeting();
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const date = getDateString();

  if (!mounted) {
    return <div className="h-[180px] rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-violet-500/80" />
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute top-8 right-20 h-20 w-20 rounded-full bg-white/5" />
      <div className="absolute bottom-4 right-40 h-8 w-8 rounded-full bg-white/10" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-end">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <greeting.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/60">{date}</p>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {greeting.text}，{user?.user_metadata?.full_name || user?.email?.split("@")[0] || "你好"}
              </h1>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-amber-300/80" />
            <span className="italic">&ldquo;{quote}&rdquo;</span>
          </p>

          {(todayRevenue > 0 || todayOrders > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {todayOrders > 0 && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10">
                  {todayOrders} 笔今日订单
                </span>
              )}
              {todayRevenue > 0 && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10">
                  {formatCurrency(todayRevenue)} 今日销售
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          {[
            { icon: FileText, label: "创建内容", href: "/content" },
            { icon: Radar, label: "看趋势", href: "/trends" },
            { icon: CalendarDays, label: "排计划", href: "/social" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-1.5 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm ring-1 ring-white/10 transition-all hover:bg-white/20 hover:ring-white/20"
            >
              <action.icon className="h-4 w-4 text-white/80 transition-transform group-hover:scale-110" />
              <span className="text-[11px] font-medium text-white/70 group-hover:text-white/90">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  paid: "已付款",
  pending: "待付款",
  refunded: "已退款",
  partially_refunded: "部分退款",
  voided: "已作废",
  fulfilled: "已发货",
  partial: "部分发货",
};

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

export default function DashboardPage() {
  const { data: kpis, loading: kpisLoading } = useSupabase<DashboardKPIs | null>(getDashboardKPIs, null);
  const { data: timeSeries } = useSupabase(() => getRevenueTimeSeries(30), []);
  const { data: recentOrders } = useSupabase(() => getRecentOrders(6), []);
  const { data: topProducts } = useSupabase(() => getTopProducts(5), []);
  const { data: todayStats } = useSupabase(getTodayStats, { todayRevenue: 0, todayOrders: 0 });

  const hasData = kpis !== null;

  if (kpisLoading) {
    return (
      <div className="space-y-6">
        <div className="h-[180px] rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <GreetingBanner todayRevenue={0} todayOrders={0} />
        {/* Smart banner: detects whether Shopify is connected or not */}
        <DataSyncBar />
        <EmptyState
          title="暂无销售数据"
          description="同步 Shopify 订单数据后，这里将显示收入、订单趋势和 AI 分析"
          action={
            <Link href="/settings">
              <Button variant="outline">
                <Store className="mr-2 h-4 w-4" />
                Shopify 设置
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const trendDir = (v: number) => (v > 0 ? "up" : v < 0 ? "down" : "flat") as "up" | "down" | "flat";

  return (
    <div className="space-y-6">
      <GreetingBanner todayRevenue={todayStats.todayRevenue} todayOrders={todayStats.todayOrders} />

      {/* Shopify sync status — shows orange banner if orders not synced yet */}
      <DataSyncBar />

      <KPICardGrid>
        <KPICard
          label="总收入 (30天)"
          value={kpis.totalRevenue}
          trend={trendDir(kpis.revenueTrend)}
          trendPercent={kpis.revenueTrend}
          icon="DollarSign"
          format="currency"
          source="shopify_live"
        />
        <KPICard
          label="总订单 (30天)"
          value={kpis.totalOrders}
          trend={trendDir(kpis.ordersTrend)}
          trendPercent={kpis.ordersTrend}
          icon="ShoppingCart"
          format="number"
          source="shopify_live"
        />
        <KPICard
          label="客单价"
          value={kpis.aov}
          trend="flat"
          icon="TrendingUp"
          format="currency"
          source="shopify_live"
        />
        <KPICard
          label="客户总数"
          value={kpis.totalCustomers}
          trend="flat"
          icon="Users"
          format="number"
          source="all_accounts"
          sourceNote="包含注册未购买、邮件订阅、弃购等所有账号"
        />
      </KPICardGrid>

      <KPIComparisonCard />

      <DailyBriefing />

      {/* Auto-Ops Engine Status */}
      <AutoOpsStatusCard />

      {/* GA4 Analytics */}
      <GA4Widget />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Revenue chart */}
        <ChartCard title="近 30 天销售趋势" className="lg:col-span-4">
          {timeSeries.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "销售额"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              暂无销售数据
            </div>
          )}
        </ChartCard>

        {/* Top products */}
        <ChartCard title="热销商品 TOP 5" className="lg:col-span-3">
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={product.title} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm font-medium">{product.title}</p>
                    <p className="text-xs text-muted-foreground">
                      已售 {product.total_quantity} 件
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(product.total_revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              暂无商品数据
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        {/* Orders chart */}
        <ChartCard title="近 30 天订单趋势" className="lg:col-span-4">
          {timeSeries.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value) => [String(value), "订单数"]}
                  />
                  <Bar dataKey="orders" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              暂无订单数据
            </div>
          )}
        </ChartCard>

        {/* Recent orders */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">最近订单</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="flex gap-3">
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      订单 {order.order_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Number(order.total_price))} ·{" "}
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {STATUS_LABELS[order.financial_status] || order.financial_status}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(order.order_date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                暂无订单
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "创建内容", icon: FileText, href: "/content", color: "text-purple-500" },
          { label: "查看趋势", icon: Radar, href: "/trends", color: "text-blue-500" },
          { label: "优化店铺", icon: Store, href: "/store", color: "text-green-500" },
          { label: "排期发布", icon: CalendarDays, href: "/social", color: "text-orange-500" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="transition-all hover:shadow-sm hover:border-primary/20 cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <action.icon className={cn("h-5 w-5", action.color)} />
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
