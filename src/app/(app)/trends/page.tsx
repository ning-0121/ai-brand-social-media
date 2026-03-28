"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { ChartCard } from "@/components/shared/chart-card";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { TrendTag } from "@/components/shared/trend-tag";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/format";
import {
  trendsKPIs,
  mockHotProducts,
  categoryTrendData,
  mockCompetitors,
} from "@/modules/trends/mock-data";

const CATEGORY_COLORS: Record<string, string> = {
  美妆护肤: "#f472b6",
  家居生活: "#60a5fa",
  数码科技: "#a78bfa",
  食品饮料: "#34d399",
};

const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "全部平台" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "amazon", label: "Amazon" },
  { value: "shopify", label: "Shopify" },
  { value: "independent", label: "独立站" },
];

export default function TrendsPage() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filteredProducts = useMemo(() => {
    return mockHotProducts.filter((p) => {
      const matchesSearch =
        !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform =
        platformFilter === "all" || p.platform === platformFilter;
      return matchesSearch && matchesPlatform;
    });
  }, [search, platformFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="趋势雷达中心"
        description="实时追踪市场热点、品类趋势与竞品动态"
      />

      <KPICardGrid>
        {trendsKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      <Tabs defaultValue="hot-products">
        <TabsList>
          <TabsTrigger value="hot-products">热门商品</TabsTrigger>
          <TabsTrigger value="category-trends">品类趋势</TabsTrigger>
          <TabsTrigger value="competitors">竞品分析</TabsTrigger>
        </TabsList>

        {/* 热门商品 */}
        <TabsContent value="hot-products">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="搜索商品名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:max-w-xs"
              />
              <Select
                value={platformFilter}
                onValueChange={(v) => v && setPlatformFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部平台" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>品类</TableHead>
                    <TableHead className="text-right">销量</TableHead>
                    <TableHead className="text-right">增长率</TableHead>
                    <TableHead>价格</TableHead>
                    <TableHead className="text-right">评分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>
                        <PlatformIcon
                          platform={product.platform}
                          showLabel
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(product.sales_volume)}
                      </TableCell>
                      <TableCell className="text-right">
                        <TrendTag
                          direction={product.trend}
                          value={product.growth_rate}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {product.price_range}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.rating}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        没有找到匹配的商品
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* 品类趋势 */}
        <TabsContent value="category-trends">
          <ChartCard
            title="品类销量趋势 (近30天)"
            description="跟踪各品类每日销量变化"
          >
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    tickFormatter={(v: number) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value) => [formatNumber(Number(value))]}
                  />
                  <Legend />
                  {Object.keys(CATEGORY_COLORS).map((cat) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={CATEGORY_COLORS[cat]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </TabsContent>

        {/* 竞品分析 */}
        <TabsContent value="competitors">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>竞品名称</TableHead>
                  <TableHead>平台</TableHead>
                  <TableHead>主营品类</TableHead>
                  <TableHead className="text-right">粉丝数</TableHead>
                  <TableHead className="text-right">平均互动率</TableHead>
                  <TableHead className="text-right">增长率</TableHead>
                  <TableHead className="text-right">近期活动</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCompetitors.map((comp) => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell>
                      <PlatformIcon platform={comp.platform} showLabel />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{comp.top_category}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(comp.followers)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {comp.avg_engagement}%
                    </TableCell>
                    <TableCell className="text-right">
                      <TrendTag
                        direction={comp.trend}
                        value={comp.growth_rate}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {comp.recent_campaigns} 个
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
