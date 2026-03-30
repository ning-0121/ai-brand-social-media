"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Store,
  TrendingUp,
  ExternalLink,
  Star,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const activeChannels = [
  {
    id: 1,
    name: "Amazon",
    color: "bg-orange-500",
    status: "正常运营",
    monthlyGMV: 285000,
    gmvTarget: 350000,
    products: 128,
    rating: 4.7,
    joinDate: "2024-03-15",
  },
  {
    id: 2,
    name: "TikTok Shop",
    color: "bg-pink-500",
    status: "正常运营",
    monthlyGMV: 196000,
    gmvTarget: 250000,
    products: 86,
    rating: 4.5,
    joinDate: "2024-06-22",
  },
  {
    id: 3,
    name: "Shopify",
    color: "bg-green-600",
    status: "正常运营",
    monthlyGMV: 142000,
    gmvTarget: 200000,
    products: 215,
    rating: 4.8,
    joinDate: "2023-11-08",
  },
  {
    id: 4,
    name: "Etsy",
    color: "bg-amber-600",
    status: "正常运营",
    monthlyGMV: 62000,
    gmvTarget: 100000,
    products: 53,
    rating: 4.6,
    joinDate: "2025-01-10",
  },
];

const recommendedChannels = [
  {
    id: 1,
    name: "Walmart",
    type: "B2C",
    estimatedMonthly: "¥15-25万",
    difficulty: 4,
    recommendation: 5,
    description: "美国第二大电商平台，流量巨大，适合品牌拓展",
  },
  {
    id: 2,
    name: "Faire",
    type: "B2B",
    estimatedMonthly: "¥8-15万",
    difficulty: 3,
    recommendation: 4,
    description: "北美领先的批发采购平台，连接独立零售商",
  },
  {
    id: 3,
    name: "FashionGo",
    type: "批发",
    estimatedMonthly: "¥5-10万",
    difficulty: 2,
    recommendation: 3,
    description: "时尚服装批发平台，面向精品店和零售商",
  },
  {
    id: 4,
    name: "Temu",
    type: "B2C",
    estimatedMonthly: "¥20-35万",
    difficulty: 2,
    recommendation: 5,
    description: "拼多多旗下跨境平台，增长迅猛，低门槛入驻",
  },
  {
    id: 5,
    name: "SHEIN Marketplace",
    type: "B2C",
    estimatedMonthly: "¥12-20万",
    difficulty: 3,
    recommendation: 4,
    description: "全球快时尚巨头开放第三方卖家入驻",
  },
  {
    id: 6,
    name: "Wish",
    type: "B2C",
    estimatedMonthly: "¥3-8万",
    difficulty: 1,
    recommendation: 3,
    description: "面向价格敏感型消费者的移动端优先平台",
  },
];

const comparisonData = [
  { name: "Amazon", type: "B2C", gmv: "¥28.5万", commission: "8%-15%", competition: "高", recommendation: 5, active: true },
  { name: "TikTok Shop", type: "B2C", gmv: "¥19.6万", commission: "5%-8%", competition: "中", recommendation: 4, active: true },
  { name: "Shopify", type: "DTC", gmv: "¥14.2万", commission: "2.9%", competition: "低", recommendation: 5, active: true },
  { name: "Etsy", type: "B2C", gmv: "¥6.2万", commission: "6.5%", competition: "中", recommendation: 4, active: true },
  { name: "Walmart", type: "B2C", gmv: "预估¥20万", commission: "6%-15%", competition: "高", recommendation: 5, active: false },
  { name: "Faire", type: "B2B", gmv: "预估¥12万", commission: "15%", competition: "低", recommendation: 4, active: false },
  { name: "Temu", type: "B2C", gmv: "预估¥28万", commission: "3%-5%", competition: "高", recommendation: 5, active: false },
  { name: "SHEIN Marketplace", type: "B2C", gmv: "预估¥16万", commission: "10%-20%", competition: "中", recommendation: 4, active: false },
];

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < count
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

function GMVProgressBar({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  const color =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 50
        ? "bg-amber-500"
        : "bg-blue-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>GMV 完成度</span>
        <span className="tabular-nums font-medium">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>¥{(current / 10000).toFixed(1)}万</span>
        <span>目标 ¥{(target / 10000).toFixed(1)}万</span>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    B2C: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    B2B: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    批发: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    DTC: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };

  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", styles[type] || "")}
    >
      {type}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChannelsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="渠道拓展中心"
        description="管理已入驻渠道、发现新渠道机会，推动多平台增长"
        actions={
          <Button size="sm">
            <Store className="mr-1.5 h-4 w-4" />
            添加渠道
          </Button>
        }
      />

      {/* KPI Cards */}
      <KPICardGrid>
        <KPICard
          label="已入驻渠道"
          value={4}
          trend="up"
          trendPercent={33}
          icon="Store"
          format="number"
        />
        <KPICard
          label="待开发渠道"
          value={6}
          trend="up"
          trendPercent={20}
          icon="Compass"
          format="number"
        />
        <KPICard
          label="渠道总GMV"
          value="¥68.5万"
          trend="up"
          trendPercent={18}
          icon="DollarSign"
        />
        <KPICard
          label="渠道增长率"
          value="+23%"
          trend="up"
          trendPercent={23}
          icon="TrendingUp"
        />
      </KPICardGrid>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">已入驻渠道</TabsTrigger>
          <TabsTrigger value="recommended">推荐渠道</TabsTrigger>
          <TabsTrigger value="compare">渠道对比</TabsTrigger>
        </TabsList>

        {/* ---- 已入驻渠道 ---- */}
        <TabsContent value="active">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeChannels.map((ch) => (
              <Card key={ch.id} className="transition-shadow hover:shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm",
                        ch.color
                      )}
                    >
                      {ch.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-semibold">
                          {ch.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                        >
                          {ch.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        入驻时间: {ch.joinDate}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold tabular-nums">
                        ¥{(ch.monthlyGMV / 10000).toFixed(1)}万
                      </p>
                      <p className="text-xs text-muted-foreground">月GMV</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">
                        {ch.products}
                      </p>
                      <p className="text-xs text-muted-foreground">商品数</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold tabular-nums">
                        {ch.rating}
                      </p>
                      <p className="text-xs text-muted-foreground">评分</p>
                    </div>
                  </div>
                  <GMVProgressBar
                    current={ch.monthlyGMV}
                    target={ch.gmvTarget}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- 推荐渠道 ---- */}
        <TabsContent value="recommended">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedChannels.map((ch) => (
              <Card key={ch.id} className="transition-shadow hover:shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {ch.name}
                    </CardTitle>
                    <TypeBadge type={ch.type} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ch.description}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">预估月销</span>
                      <span className="font-medium">{ch.estimatedMonthly}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">入驻难度</span>
                      <Stars count={ch.difficulty} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">推荐指数</span>
                      <Stars count={ch.recommendation} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      了解详情
                    </Button>
                    <Button size="sm" className="flex-1">
                      <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                      开始入驻
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- 渠道对比 ---- */}
        <TabsContent value="compare">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  渠道综合对比
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  共 {comparisonData.length} 个渠道
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>渠道名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">月GMV</TableHead>
                    <TableHead className="text-right">佣金比例</TableHead>
                    <TableHead>竞争度</TableHead>
                    <TableHead>推荐度</TableHead>
                    <TableHead className="w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((ch) => (
                    <TableRow key={ch.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ch.name}</span>
                          {ch.active && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                            >
                              已入驻
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={ch.type} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {ch.gmv}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {ch.commission}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            ch.competition === "高" &&
                              "bg-destructive/10 text-destructive border-destructive/20",
                            ch.competition === "中" &&
                              "bg-amber-500/10 text-amber-600 border-amber-500/20",
                            ch.competition === "低" &&
                              "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          )}
                        >
                          {ch.competition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Stars count={ch.recommendation} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          {ch.active ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
