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
import { Skeleton } from "@/components/ui/skeleton";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatNumber } from "@/lib/format";
import {
  mockHotProducts,
  categoryTrendData,
  mockCompetitors,
} from "@/modules/trends/mock-data";
import { useSupabase } from "@/hooks/use-supabase";
import { getHotProducts, getCompetitors, getTrendsKPIs } from "@/lib/supabase-queries";
import { createCompetitor, deleteCompetitor } from "@/lib/supabase-mutations";
import { KPIData } from "@/lib/types";
import { AITrendDialog } from "@/components/trends/ai-trend-dialog";
import { AICompetitorDialog } from "@/components/trends/ai-competitor-dialog";
import { Sparkles, Plus, Trash2, Loader2, ArrowUpDown } from "lucide-react";

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
  const { data: kpiData } = useSupabase(getTrendsKPIs, { categories: 0, trending: 0, avgGrowth: 0, competitors: 0 });
  const trendsKPIs: KPIData[] = [
    { label: "热门品类数", value: kpiData.categories, trend: "up", trendPercent: 5, icon: "Layers", format: "number" },
    { label: "本周爆款", value: kpiData.trending, trend: "up", trendPercent: 20, icon: "Flame", format: "number" },
    { label: "平均增长率", value: kpiData.avgGrowth, trend: "up", trendPercent: 3.5, icon: "TrendingUp", format: "percent" },
    { label: "竞品数", value: kpiData.competitors, trend: "flat", trendPercent: 0, icon: "Target", format: "number" },
  ];

  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortByGrowth, setSortByGrowth] = useState<"asc" | "desc" | null>(null);

  // AI dialogs
  const [trendDialogOpen, setTrendDialogOpen] = useState(false);
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);

  // Competitor CRUD
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [compForm, setCompForm] = useState({ name: "", platform: "tiktok", top_category: "", followers: "", avg_engagement: "", growth_rate: "" });
  const [savingComp, setSavingComp] = useState(false);

  const { data: hotProducts, loading: loadingProducts } = useSupabase(getHotProducts, mockHotProducts);
  const { data: initialCompetitors, loading: loadingCompetitors } = useSupabase(getCompetitors, mockCompetitors);
  const [localCompetitors, setLocalCompetitors] = useState<typeof mockCompetitors | null>(null);
  const competitors = localCompetitors ?? initialCompetitors;

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(hotProducts.map((p) => p.category));
    return Array.from(cats).sort();
  }, [hotProducts]);

  const filteredProducts = useMemo(() => {
    let result = hotProducts.filter((p) => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = platformFilter === "all" || p.platform === platformFilter;
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesPlatform && matchesCategory;
    });
    if (sortByGrowth) {
      result = [...result].sort((a, b) =>
        sortByGrowth === "desc" ? b.growth_rate - a.growth_rate : a.growth_rate - b.growth_rate
      );
    }
    return result;
  }, [hotProducts, search, platformFilter, categoryFilter, sortByGrowth]);

  const refreshCompetitors = async () => {
    const fresh = await getCompetitors();
    setLocalCompetitors(fresh);
  };

  const handleAddCompetitor = async () => {
    if (!compForm.name.trim()) return;
    setSavingComp(true);
    try {
      await createCompetitor({
        name: compForm.name,
        platform: compForm.platform,
        top_category: compForm.top_category || "未分类",
        followers: parseInt(compForm.followers) || 0,
        avg_engagement: parseFloat(compForm.avg_engagement) || 0,
        growth_rate: parseFloat(compForm.growth_rate) || 0,
      });
      setShowAddCompetitor(false);
      setCompForm({ name: "", platform: "tiktok", top_category: "", followers: "", avg_engagement: "", growth_rate: "" });
      await refreshCompetitors();
    } catch (err) { console.error(err); }
    setSavingComp(false);
  };

  const handleDeleteCompetitor = async (id: string) => {
    if (!confirm("确定要删除这个竞品吗？")) return;
    try {
      await deleteCompetitor(id);
      await refreshCompetitors();
    } catch {
      setLocalCompetitors((prev) => (prev || competitors).filter((c) => c.id !== id));
    }
  };

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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
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
              <Select
                value={categoryFilter}
                onValueChange={(v) => v && setCategoryFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部品类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部品类</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortByGrowth((prev) => prev === "desc" ? "asc" : prev === "asc" ? null : "desc")}
              >
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                增长率{sortByGrowth === "desc" ? " ↓" : sortByGrowth === "asc" ? " ↑" : ""}
              </Button>
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => setTrendDialogOpen(true)}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI 分析市场
              </Button>
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
                  {loadingProducts ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        没有找到匹配的商品
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
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
                    ))
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
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={() => setShowAddCompetitor(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              添加竞品
            </Button>
            <Button size="sm" onClick={() => setCompetitorDialogOpen(true)} disabled={competitors.length === 0}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI 竞品分析
            </Button>
          </div>
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCompetitors ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  competitors.map((comp) => (
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteCompetitor(comp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Trend Analysis Dialog */}
      <AITrendDialog
        open={trendDialogOpen}
        onOpenChange={setTrendDialogOpen}
        products={filteredProducts}
        currentCategory={categoryFilter !== "all" ? categoryFilter : undefined}
      />

      {/* AI Competitor Analysis Dialog */}
      <AICompetitorDialog
        open={competitorDialogOpen}
        onOpenChange={setCompetitorDialogOpen}
        competitors={competitors}
      />

      {/* Add Competitor Dialog */}
      <Dialog open={showAddCompetitor} onOpenChange={setShowAddCompetitor}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加竞品</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">竞品名称</label>
              <Input placeholder="输入竞品名称" value={compForm.name} onChange={(e) => setCompForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">平台</label>
                <Select value={compForm.platform} onValueChange={(v) => v && setCompForm((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.filter((p) => p.value !== "all").map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">主营品类</label>
                <Input placeholder="例如: 美妆护肤" value={compForm.top_category} onChange={(e) => setCompForm((f) => ({ ...f, top_category: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">粉丝数</label>
                <Input type="number" placeholder="100000" value={compForm.followers} onChange={(e) => setCompForm((f) => ({ ...f, followers: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">互动率 (%)</label>
                <Input type="number" step="0.1" placeholder="4.5" value={compForm.avg_engagement} onChange={(e) => setCompForm((f) => ({ ...f, avg_engagement: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">增长率 (%)</label>
                <Input type="number" step="0.1" placeholder="15.2" value={compForm.growth_rate} onChange={(e) => setCompForm((f) => ({ ...f, growth_rate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCompetitor(false)}>取消</Button>
            <Button onClick={handleAddCompetitor} disabled={savingComp || !compForm.name.trim()}>
              {savingComp && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {savingComp ? "添加中..." : "添加竞品"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
