"use client";

import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { StatusBadge } from "@/components/shared/status-badge";
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
import {
  storeKPIs,
  mockProducts,
  mockSEOScore,
  storeHealthData,
} from "@/modules/store/mock-data";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import {
  Plus,
  MoreHorizontal,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";

const SEVERITY_CONFIG: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  high: {
    label: "紧急",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: AlertCircle,
  },
  medium: {
    label: "中等",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: AlertTriangle,
  },
  low: {
    label: "建议",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Info,
  },
};

function SEOProgressBar({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-amber-500"
        : "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={cn(
          "text-xs font-medium tabular-nums",
          score >= 80
            ? "text-emerald-600"
            : score >= 60
              ? "text-amber-600"
              : "text-destructive"
        )}
      >
        {score}
      </span>
    </div>
  );
}

function OverallScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "text-emerald-500"
      : score >= 60
        ? "text-amber-500"
        : "text-destructive";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64" cy="64" r="54"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="64" cy="64" r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700", color)}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums">{score}</span>
        <span className="text-xs text-muted-foreground">总分</span>
      </div>
    </div>
  );
}

export default function StorePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="店铺优化中心"
        description="全方位优化店铺表现，提升转化率与搜索排名"
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            添加商品
          </Button>
        }
      />

      <KPICardGrid>
        {storeKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">商品管理</TabsTrigger>
          <TabsTrigger value="seo">SEO 优化</TabsTrigger>
          <TabsTrigger value="health">店铺健康</TabsTrigger>
        </TabsList>

        {/* 商品管理 */}
        <TabsContent value="products">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">全部商品</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  共 {mockProducts.length} 件
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">价格</TableHead>
                    <TableHead className="text-right">库存</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>SEO 分</TableHead>
                    <TableHead className="w-[60px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(product.price)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={cn(product.stock === 0 && "text-destructive font-medium")}>
                          {product.stock.toLocaleString("zh-CN")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={product.status} />
                      </TableCell>
                      <TableCell>
                        <SEOProgressBar score={product.seo_score} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO 优化 */}
        <TabsContent value="seo" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 总分卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SEO 综合评分</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pt-2">
                <OverallScoreRing score={mockSEOScore.overall} />
                <p className="text-xs text-muted-foreground text-center">
                  综合评分基于标题、描述、关键词、图片、速度和移动端等维度计算
                </p>
              </CardContent>
            </Card>

            {/* 分项得分 */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">分项得分明细</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {mockSEOScore.breakdown.map((item) => {
                  const pct = Math.round((item.score / item.maxScore) * 100);
                  const barColor =
                    pct >= 80
                      ? "bg-emerald-500"
                      : pct >= 60
                        ? "bg-amber-500"
                        : "bg-destructive";

                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium tabular-nums">
                          {item.score}/{item.maxScore}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* 优化建议 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">优化建议</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {mockSEOScore.suggestions.length} 条建议
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockSEOScore.suggestions.map((suggestion) => {
                const config = SEVERITY_CONFIG[suggestion.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={suggestion.id}
                    className="flex gap-3 rounded-lg border p-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className={cn(
                        "h-4 w-4",
                        suggestion.severity === "high" && "text-destructive",
                        suggestion.severity === "medium" && "text-amber-500",
                        suggestion.severity === "low" && "text-blue-500",
                      )} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{suggestion.title}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", config.className)}
                        >
                          {config.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.description}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 self-center">
                      去优化
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 店铺健康 */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">当前健康分</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2 pt-2">
                <span className="text-5xl font-bold tabular-nums text-emerald-600">
                  {storeHealthData.currentScore}
                </span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">健康状态良好</span>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  综合评估店铺运营、商品质量、客户满意度等指标
                </p>
              </CardContent>
            </Card>

            <ChartCard title="近 30 天健康分趋势" className="lg:col-span-3">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={storeHealthData.trend}>
                    <defs>
                      <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fontSize: 11 }}
                      domain={[50, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [String(value), "健康分"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
