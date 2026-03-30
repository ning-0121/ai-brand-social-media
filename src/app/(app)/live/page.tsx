"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Plus,

  Eye,
  ShoppingCart,
  TrendingUp,
  Mic,
  Package,
  HandCoins,
  Users,
  MessageSquareText,
  PartyPopper,
  CalendarDays,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const kpis = [
  { label: "本月直播场次", value: "12", trend: "up" as const, trendPercent: 20, icon: "Radio", format: undefined },
  { label: "累计观看", value: "28.5万", trend: "up" as const, trendPercent: 15.3, icon: "Eye", format: undefined },
  { label: "直播GMV", value: "¥18.6万", trend: "up" as const, trendPercent: 8.7, icon: "ShoppingCart", format: undefined },
  { label: "平均转化率", value: "3.8%", trend: "up" as const, trendPercent: 0.5, icon: "TrendingUp", format: undefined },
];

const liveSessions = [
  { id: 1, title: "春季新品首发专场", platform: "抖音", date: "2026-03-28 19:00", status: "待开始", viewers: 5000 },
  { id: 2, title: "会员日特惠直播", platform: "小红书", date: "2026-03-27 20:00", status: "进行中", viewers: 3200 },
  { id: 3, title: "爆款返场 - 限时秒杀", platform: "淘宝", date: "2026-03-25 19:30", status: "已完成", viewers: 8600 },
  { id: 4, title: "护肤专场 - 成分解析", platform: "抖音", date: "2026-03-22 20:00", status: "已完成", viewers: 6200 },
  { id: 5, title: "穿搭分享 - 早春系列", platform: "小红书", date: "2026-03-20 19:00", status: "已完成", viewers: 4800 },
  { id: 6, title: "家居好物推荐", platform: "淘宝", date: "2026-03-18 20:30", status: "已完成", viewers: 7100 },
];

const scriptTemplates = [
  {
    id: 1,
    title: "开场话术",
    icon: PartyPopper,
    lines: [
      "家人们，欢迎来到直播间！今天给大家准备了超多惊喜福利~",
      "新来的宝宝先点个关注，等会儿有专属红包雨哦！",
      "话不多说，我们直接上干货！",
    ],
  },
  {
    id: 2,
    title: "产品讲解话术",
    icon: Package,
    lines: [
      "这款产品我自己用了整整三个月，真的是回购了无数次。",
      "大家看一下成分表，主打的就是一个安心好用。",
      "和市面上同类产品对比，性价比真的绝了。",
    ],
  },
  {
    id: 3,
    title: "促单话术",
    icon: HandCoins,
    lines: [
      "库存只剩最后 200 单了，拍完真的就没了！",
      "今天直播间专属价，比日常便宜了整整 50 元！",
      "犹豫就会败北，果断就会白给~赶紧拍！",
    ],
  },
  {
    id: 4,
    title: "留人话术",
    icon: Users,
    lines: [
      "下一个品更炸！千万别走，马上就来~",
      "后面还有一波超大福利，先留在直播间等一下。",
    ],
  },
  {
    id: 5,
    title: "互动话术",
    icon: MessageSquareText,
    lines: [
      "觉得好看的宝宝扣 1，想要链接的扣 2！",
      "有什么问题直接打在公屏上，主播一个一个回答~",
      "点赞到 10 万，直接再加一波福利！",
    ],
  },
  {
    id: 6,
    title: "结束话术",
    icon: Mic,
    lines: [
      "今天的直播就到这里啦，感谢所有家人的陪伴！",
      "别忘了点关注，下次开播第一时间通知你~",
    ],
  },
];

const lastLiveStats = {
  viewers: 8600,
  peakOnline: 1250,
  interactions: 3420,
  gmv: 42800,
};

const performanceData = [
  { name: "3/18", viewers: 7100, gmv: 38000 },
  { name: "3/20", viewers: 4800, gmv: 22000 },
  { name: "3/22", viewers: 6200, gmv: 31000 },
  { name: "3/25", viewers: 8600, gmv: 42800 },
  { name: "3/27", viewers: 3200, gmv: 15000 },
  { name: "3/28", viewers: 5000, gmv: 28000 },
];

const improvements = [
  "开场节奏可以更快，前5分钟流失率偏高，建议开场即亮出核心福利",
  "产品讲解时长控制在3-5分钟为宜，上一场部分商品讲解超过8分钟导致互动下降",
  "促单环节可增加倒计时和库存播报频次，营造紧迫感提升转化",
  "建议增加整点抽奖环节，有效提升直播间停留时长和在线人数峰值",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusColor(status: string) {
  if (status === "已完成") return "bg-emerald-500/10 text-emerald-600";
  if (status === "进行中") return "bg-blue-500/10 text-blue-600";
  return "bg-gray-500/10 text-gray-500";
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LivePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="直播中心"
        description="直播排期、话术管理与直播复盘"
        actions={
          <Button>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            新建直播
          </Button>
        }
      />

      {/* KPI Cards */}
      <KPICardGrid>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* Tabs */}
      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plan">直播计划</TabsTrigger>
          <TabsTrigger value="scripts">话术库</TabsTrigger>
          <TabsTrigger value="review">直播复盘</TabsTrigger>
        </TabsList>

        {/* ---- 直播计划 ---- */}
        <TabsContent value="plan">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {liveSessions.map((session) => (
              <Card key={session.id} className="transition-shadow hover:shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium leading-snug">
                      {session.title}
                    </CardTitle>
                    <Badge
                      className={`shrink-0 text-xs ${statusColor(session.status)}`}
                    >
                      {session.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-normal">
                      {session.platform}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {session.date}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    预计观看: {formatNumber(session.viewers)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- 话术库 ---- */}
        <TabsContent value="scripts">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {scriptTemplates.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <Card key={tpl.id} className="transition-shadow hover:shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <div className="rounded-md bg-primary/10 p-1.5">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      {tpl.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5">
                      {tpl.lines.map((line, idx) => (
                        <li
                          key={idx}
                          className="text-xs leading-relaxed text-muted-foreground"
                        >
                          {line}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" size="sm" className="w-full">
                      使用
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ---- 直播复盘 ---- */}
        <TabsContent value="review" className="space-y-4">
          {/* 基本数据 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                上场直播数据 - 爆款返场 限时秒杀 (3/25)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center">
                  <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatNumber(lastLiveStats.viewers)}
                  </p>
                  <p className="text-xs text-muted-foreground">观看人数</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatNumber(lastLiveStats.peakOnline)}
                  </p>
                  <p className="text-xs text-muted-foreground">峰值在线</p>
                </div>
                <div className="text-center">
                  <MessageSquareText className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatNumber(lastLiveStats.interactions)}
                  </p>
                  <p className="text-xs text-muted-foreground">互动数</p>
                </div>
                <div className="text-center">
                  <ShoppingCart className="mx-auto h-4 w-4 text-muted-foreground" />
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    ¥{formatNumber(lastLiveStats.gmv)}
                  </p>
                  <p className="text-xs text-muted-foreground">GMV</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 趋势图表 */}
          <ChartCard title="近6场直播数据趋势" description="观看人数与GMV对比">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      fontSize: "12px",
                    }}
                    formatter={(value, name) => [
                      name === "viewers" ? formatNumber(Number(value)) : `¥${formatNumber(Number(value))}`,
                      name === "viewers" ? "观看人数" : "GMV",
                    ]}
                  />
                  <Bar yAxisId="left" dataKey="viewers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="viewers" />
                  <Bar yAxisId="right" dataKey="gmv" fill="hsl(var(--primary)/0.4)" radius={[4, 4, 0, 0]} name="gmv" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* 改进建议 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                改进建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {improvements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
