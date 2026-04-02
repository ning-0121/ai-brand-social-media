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
  categoryTrendData,
} from "@/modules/trends/mock-data";
import { useSupabase } from "@/hooks/use-supabase";
import { getHotProducts, getCompetitors, getTrendsKPIs } from "@/lib/supabase-queries";
import { createCompetitor, deleteCompetitor } from "@/lib/supabase-mutations";
import { KPIData } from "@/lib/types";
import { AITrendDialog } from "@/components/trends/ai-trend-dialog";
import { AICompetitorDialog } from "@/components/trends/ai-competitor-dialog";
import { Sparkles, Plus, Trash2, Loader2, ArrowUpDown, Search, Save } from "lucide-react";
import { createHotProduct } from "@/lib/supabase-mutations";

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

  // AI search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPlatform, setSearchPlatform] = useState("amazon");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    name: string; category: string; sales_volume: number; growth_rate: number;
    trend: string; price_range: string; rating: number; insight?: string;
  }[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortByGrowth, setSortByGrowth] = useState<"asc" | "desc" | null>(null);
  const [savingProduct, setSavingProduct] = useState<string | null>(null);

  // Also show saved products from DB
  const { data: savedProducts } = useSupabase(getHotProducts, []);

  // AI dialogs
  const [trendDialogOpen, setTrendDialogOpen] = useState(false);
  const [competitorDialogOpen, setCompetitorDialogOpen] = useState(false);

  // Competitor search state
  const [compSearchQuery, setCompSearchQuery] = useState("");
  const [compSearchPlatform, setCompSearchPlatform] = useState("amazon");
  const [searchingComp, setSearchingComp] = useState(false);
  const [compSearchResults, setCompSearchResults] = useState<{
    name: string; top_category: string; followers: number; avg_engagement: number;
    growth_rate: number; trend: string; recent_campaigns: number; insight?: string;
  }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_hasSearchedComp, setHasSearchedComp] = useState(false);

  // Competitor CRUD
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [compForm, setCompForm] = useState({ name: "", platform: "tiktok", top_category: "", followers: "", avg_engagement: "", growth_rate: "" });
  const [savingComp, setSavingComp] = useState(false);

  const { data: initialCompetitors, loading: loadingCompetitors } = useSupabase(getCompetitors, []);
  const [localCompetitors, setLocalCompetitors] = useState<typeof initialCompetitors | null>(null);
  const competitors = localCompetitors ?? initialCompetitors;

  // AI product search
  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setHasSearched(true);
    try {
      const platformLabel = PLATFORM_OPTIONS.find(p => p.value === searchPlatform)?.label || searchPlatform;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: "trend_search",
          topic: `品类: ${searchQuery}\n平台: ${platformLabel}\n请搜索该品类在${platformLabel}平台上的当前热门商品趋势。`,
          platform: searchPlatform,
        }),
      });
      const data = await res.json();
      const rawResults = data.results;
      const results = Array.isArray(rawResults) ? rawResults : [rawResults];
      setSearchResults(results.filter((r: Record<string, unknown>) => r && r.name));
    } catch (err) {
      console.error("搜索失败:", err);
    }
    setSearching(false);
  };

  // AI competitor search
  const handleSearchCompetitors = async () => {
    if (!compSearchQuery.trim()) return;
    setSearchingComp(true);
    setCompSearchResults([]);
    setHasSearchedComp(true);
    try {
      const platformLabel = PLATFORM_OPTIONS.find(p => p.value === compSearchPlatform)?.label || compSearchPlatform;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: "competitor_search",
          topic: `品类: ${compSearchQuery}\n平台: ${platformLabel}\n请搜索该品类在${platformLabel}平台上的主要竞争品牌/店铺。`,
          platform: compSearchPlatform,
        }),
      });
      const data = await res.json();
      const rawResults = data.results;
      const results = Array.isArray(rawResults) ? rawResults : [rawResults];
      setCompSearchResults(results.filter((r: Record<string, unknown>) => r && r.name));
    } catch (err) {
      console.error("搜索失败:", err);
    }
    setSearchingComp(false);
  };

  // Save a search result to database
  const handleSaveProduct = async (product: typeof searchResults[0]) => {
    setSavingProduct(product.name);
    try {
      await createHotProduct({
        name: product.name,
        platform: searchPlatform,
        category: product.category,
        sales_volume: product.sales_volume,
        growth_rate: product.growth_rate,
        trend: product.trend as "up" | "down" | "flat",
        price_range: product.price_range,
        rating: product.rating,
      });
    } catch (err) {
      console.error(err);
    }
    setSavingProduct(null);
  };

  // Save competitor search result to database
  const handleSaveCompetitor = async (comp: typeof compSearchResults[0]) => {
    setSavingComp(true);
    try {
      await createCompetitor({
        name: comp.name,
        platform: compSearchPlatform,
        top_category: comp.top_category,
        followers: comp.followers,
        avg_engagement: comp.avg_engagement,
        growth_rate: comp.growth_rate,
        trend: comp.trend,
        recent_campaigns: comp.recent_campaigns,
      });
      await refreshCompetitors();
    } catch (err) {
      console.error(err);
    }
    setSavingComp(false);
  };

  // Sort search results
  const displayProducts = useMemo(() => {
    const sorted = [...searchResults];
    if (sortByGrowth) {
      sorted.sort((a, b) =>
        sortByGrowth === "desc" ? b.growth_rate - a.growth_rate : a.growth_rate - b.growth_rate
      );
    }
    return sorted;
  }, [searchResults, sortByGrowth]);

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

        {/* 热门商品 - AI 搜索 */}
        <TabsContent value="hot-products">
          <div className="space-y-4">
            {/* Search bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                placeholder="输入商品品类，例如：美妆护肤、蓝牙耳机、瑜伽裤..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchProducts()}
                className="sm:max-w-md"
              />
              <Select
                value={searchPlatform}
                onValueChange={(v) => v && setSearchPlatform(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.filter(p => p.value !== "all").map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearchProducts} disabled={searching || !searchQuery.trim()}>
                {searching ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                {searching ? "AI 搜索中..." : "搜索趋势"}
              </Button>
              {searchResults.length > 0 && (
                <>
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
                    variant="outline"
                    onClick={() => setTrendDialogOpen(true)}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    AI 深度分析
                  </Button>
                </>
              )}
            </div>

            {/* Search results */}
            {searching && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["商品名", "品类", "销量", "增长率", "价格", "评分", "洞察", ""].map((h, i) => (
                        <TableHead key={i}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {!searching && displayProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    在 <Badge variant="secondary">{PLATFORM_OPTIONS.find(p => p.value === searchPlatform)?.label}</Badge> 搜索「{searchQuery}」找到 {displayProducts.length} 个热门商品
                  </div>
                </div>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>商品名</TableHead>
                        <TableHead>品类</TableHead>
                        <TableHead className="text-right">预估销量</TableHead>
                        <TableHead className="text-right">增长率</TableHead>
                        <TableHead>价格区间</TableHead>
                        <TableHead className="text-right">评分</TableHead>
                        <TableHead>洞察</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayProducts.map((product, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(product.sales_volume)}
                          </TableCell>
                          <TableCell className="text-right">
                            <TrendTag
                              direction={product.trend as "up" | "down" | "flat"}
                              value={product.growth_rate}
                            />
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {product.price_range}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {product.rating}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                            {product.insight}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="保存到数据库"
                              disabled={savingProduct === product.name}
                              onClick={() => handleSaveProduct(product)}
                            >
                              {savingProduct === product.name ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!searching && hasSearched && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">未找到相关趋势数据，请换一个品类或平台试试</p>
              </div>
            )}

            {!hasSearched && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">输入商品品类，选择平台，AI 将搜索当前市场趋势</p>
                <p className="text-xs mt-1">例如：在 Amazon 上搜索「蓝牙耳机」或在小红书搜索「防晒霜」</p>
              </div>
            )}

            {/* Saved products from DB */}
            {savedProducts.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="text-sm font-medium text-muted-foreground">已保存的趋势商品 ({savedProducts.length})</div>
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
                      {savedProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell><PlatformIcon platform={product.platform} showLabel /></TableCell>
                          <TableCell><Badge variant="secondary">{product.category}</Badge></TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(product.sales_volume)}</TableCell>
                          <TableCell className="text-right"><TrendTag direction={product.trend} value={product.growth_rate} /></TableCell>
                          <TableCell className="tabular-nums">{product.price_range}</TableCell>
                          <TableCell className="text-right tabular-nums">{product.rating}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
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
          {/* Competitor search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-4">
            <Input
              placeholder="输入品类搜索竞品，例如：美妆护肤、健身器材..."
              value={compSearchQuery}
              onChange={(e) => setCompSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchCompetitors()}
              className="sm:max-w-md"
            />
            <Select value={compSearchPlatform} onValueChange={(v) => v && setCompSearchPlatform(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.filter(p => p.value !== "all").map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearchCompetitors} disabled={searchingComp || !compSearchQuery.trim()}>
              {searchingComp ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
              {searchingComp ? "搜索中..." : "搜索竞品"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddCompetitor(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              手动添加
            </Button>
            {competitors.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setCompetitorDialogOpen(true)}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                AI 分析
              </Button>
            )}
          </div>

          {/* Competitor search results */}
          {searchingComp && (
            <div className="rounded-lg border mb-4">
              <Table>
                <TableHeader><TableRow>{Array.from({ length: 7 }).map((_, i) => <TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>)}</TableRow></TableHeader>
                <TableBody>{Array.from({ length: 4 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>)}</TableBody>
              </Table>
            </div>
          )}

          {!searchingComp && compSearchResults.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="text-sm text-muted-foreground">
                搜索到 {compSearchResults.length} 个竞品品牌
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>品牌名称</TableHead>
                      <TableHead>主营品类</TableHead>
                      <TableHead className="text-right">粉丝数</TableHead>
                      <TableHead className="text-right">互动率</TableHead>
                      <TableHead className="text-right">增长率</TableHead>
                      <TableHead>洞察</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compSearchResults.map((comp, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell><Badge variant="secondary">{comp.top_category}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(comp.followers)}</TableCell>
                        <TableCell className="text-right tabular-nums">{comp.avg_engagement}%</TableCell>
                        <TableCell className="text-right"><TrendTag direction={comp.trend as "up"|"down"|"flat"} value={comp.growth_rate} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{comp.insight}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="保存竞品" onClick={() => handleSaveCompetitor(comp)}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Saved competitors */}
          {competitors.length > 0 && (
            <div className="text-sm font-medium text-muted-foreground mb-2">已保存的竞品 ({competitors.length})</div>
          )}
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
        products={searchResults}
        currentCategory={searchQuery || undefined}
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
