"use client";

import { useEffect, useState } from "react";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  dashboardKPIs,
  revenueData,
  platformSales,
  recentActivities,
  tasks,
} from "@/modules/dashboard/mock-data";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  CheckCircle2,
  Circle,
  FileText,
  Radar,
  Store,
  CalendarDays,
  ArrowRight,
  MessageSquare,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  CloudSun,
  Coffee,
} from "lucide-react";
import Link from "next/link";

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  content: FileText,
  order: ShoppingCart,
  trend: TrendingUp,
  review: MessageSquare,
  system: AlertCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

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

function GreetingBanner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const greeting = getGreeting();
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const date = getDateString();
  const pendingTasks = tasks.filter((t) => !t.completed).length;
  const overdueTasks = tasks.filter((t) => t.priority === "high" && !t.completed).length;

  if (!mounted) {
    return <div className="h-[180px] rounded-2xl bg-muted animate-pulse" />;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-violet-500/80" />

      {/* Decorative shapes */}
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute top-8 right-20 h-20 w-20 rounded-full bg-white/5" />
      <div className="absolute bottom-4 right-40 h-8 w-8 rounded-full bg-white/10" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 md:flex-row md:items-end">
        {/* Left: Greeting */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
              <greeting.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-white/60">{date}</p>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">
                {greeting.text}，Alex
              </h1>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-amber-300/80" />
            <span className="italic">&ldquo;{quote}&rdquo;</span>
          </p>

          {/* Quick stats pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: `${pendingTasks} 项待办`, active: pendingTasks > 0 },
              { label: `${overdueTasks} 项紧急`, active: overdueTasks > 0, urgent: true },
              { label: "12 条新内容", active: true },
              { label: "¥8.2万 今日销售", active: true },
            ].map((pill) => (
              <span
                key={pill.label}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors",
                  pill.urgent
                    ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-400/30"
                    : "bg-white/10 text-white/80 ring-1 ring-white/10"
                )}
              >
                {pill.urgent && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />}
                {pill.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Mini action card */}
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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <GreetingBanner />

      <KPICardGrid>
        {dashboardKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="tasks">待办事项</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            {/* Revenue chart */}
            <ChartCard title="近 30 天销售趋势" className="lg:col-span-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
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
            </ChartCard>

            {/* Platform breakdown */}
            <ChartCard title="平台销售分布" className="lg:col-span-3">
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformSales}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="revenue"
                    >
                      {platformSales.map((entry) => (
                        <Cell key={entry.platform} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), "销售额"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {platformSales.map((p) => (
                  <div key={p.platform} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.fill }} />
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="font-medium">{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
            {/* Orders chart */}
            <ChartCard title="近 30 天订单趋势" className="lg:col-span-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
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
            </ChartCard>

            {/* Recent activities */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">最近动态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.type] || AlertCircle;
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <div className="mt-0.5 rounded-md bg-muted p-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
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
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">今日待办</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {tasks.filter((t) => !t.completed).length} 项待完成
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3",
                    task.completed && "opacity-50"
                  )}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn("flex-1 text-sm", task.completed && "line-through")}>
                    {task.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", PRIORITY_COLORS[task.priority])}
                  >
                    {task.priority === "high" ? "紧急" : task.priority === "medium" ? "中等" : "低"}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {task.category}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
