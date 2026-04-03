"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupabase } from "@/hooks/use-supabase";
import { getProducts, getStoreKPIs } from "@/lib/supabase-queries";
import { KPIData } from "@/lib/types";
import { createProduct, deleteProduct } from "@/lib/supabase-mutations";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { SEOOptimizeDialog } from "@/components/store/seo-optimize-dialog";
import { getIntegrationByPlatform } from "@/lib/supabase-integrations";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Loader2,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Wand2,
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
  const { data: kpiData } = useSupabase(getStoreKPIs, { healthScore: 0, avgSEO: 0, totalProducts: 0, outOfStock: 0 });
  const storeKPIs: KPIData[] = [
    { label: "店铺健康分", value: kpiData.healthScore, trend: "up", trendPercent: 3, icon: "HeartPulse", format: "number" },
    { label: "SEO 得分", value: kpiData.avgSEO, trend: "up", trendPercent: 5, icon: "Search", format: "number" },
    { label: "商品总数", value: kpiData.totalProducts, trend: "up", trendPercent: 10, icon: "Package", format: "number" },
    { label: "缺货商品", value: kpiData.outOfStock, trend: "down", trendPercent: 2, icon: "AlertTriangle", format: "number" },
  ];

  const { data: initialProducts, loading: loadingProducts } = useSupabase(getProducts, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localProducts, setLocalProducts] = useState<any[] | null>(null);
  const products = localProducts ?? initialProducts;

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    stock: "",
    category: "",
    platform: "shopify",
  });
  const [saving, setSaving] = useState(false);

  // AI SEO per-product optimization
  const [seoDialogOpen, setSeoDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const { data: shopifyIntegration } = useSupabase(
    () => getIntegrationByPlatform("shopify"),
    null
  );

  // AI SEO 分析状态
  const [analyzing, setAnalyzing] = useState(false);
  const [seoInput, setSeoInput] = useState("");
  const [seoResults, setSeoResults] = useState<{category: string; priority: string; current: string; suggestion: string}[]>([]);

  const handleAnalyzeSEO = async () => {
    if (!seoInput.trim()) return;
    setAnalyzing(true);
    setSeoResults([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "seo_optimize", topic: seoInput }),
      });
      const data = await res.json();
      const text = data.result || data.text || "";
      // 尝试从返回文本中解析 JSON 数组
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {category: string; priority: string; current: string; suggestion: string}[];
        // 按优先级排序：high > medium > low
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        parsed.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
        setSeoResults(parsed);
      }
    } catch (err) {
      console.error("SEO 分析失败:", err);
    }
    setAnalyzing(false);
  };

  const refreshProducts = async () => {
    const fresh = await getProducts();
    setLocalProducts(fresh);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createProduct({
        name: formData.name,
        sku: formData.sku,
        price: parseFloat(formData.price) || 0,
        stock: parseInt(formData.stock) || 0,
        category: formData.category,
        platform: formData.platform,
      });
      setShowCreateDialog(false);
      setFormData({ name: "", sku: "", price: "", stock: "", category: "", platform: "shopify" });
      await refreshProducts();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个商品吗？")) return;
    await deleteProduct(id);
    await refreshProducts();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="店铺优化中心"
        description="全方位优化店铺表现，提升转化率与搜索排名"
        actions={
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
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
                  共 {products.length} 件
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
                    <TableHead className="w-[120px]">操作</TableHead>
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
                  ) : (
                    products.map((product) => (
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-purple-500 hover:text-purple-700 hover:bg-purple-500/10"
                              title="AI SEO 优化"
                              onClick={() => {
                                setSelectedProduct(product);
                                setSeoDialogOpen(true);
                              }}
                            >
                              <Wand2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO 优化 */}
        <TabsContent value="seo" className="space-y-4">
          {/* AI SEO 分析 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <CardTitle className="text-sm font-medium">AI SEO 分析</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  placeholder="输入产品名称和描述，例如：轻薄冰丝防晒衣 UPF50+，专为户外运动设计..."
                  value={seoInput}
                  onChange={(e) => setSeoInput(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={handleAnalyzeSEO}
                  disabled={analyzing || !seoInput.trim()}
                >
                  {analyzing ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  {analyzing ? "分析中..." : "AI 分析 SEO"}
                </Button>
              </div>

              {seoResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">分析结果</span>
                    <Badge variant="secondary" className="text-xs">
                      {seoResults.length} 条建议
                    </Badge>
                  </div>
                  {seoResults.map((item, idx) => {
                    const categoryColors: Record<string, string> = {
                      "标题": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                      "描述": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
                      "关键词": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                      "图片": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                      "结构": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
                    };
                    const priorityColors: Record<string, string> = {
                      high: "bg-destructive/10 text-destructive border-destructive/20",
                      medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                    };
                    const priorityLabels: Record<string, string> = {
                      high: "高优先",
                      medium: "中优先",
                      low: "低优先",
                    };

                    return (
                      <div key={idx} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={cn("text-xs", categoryColors[item.category] || "bg-gray-100 text-gray-700")}
                          >
                            {item.category}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", priorityColors[item.priority] || "")}
                          >
                            {priorityLabels[item.priority] || item.priority}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">当前问题：</span>
                            {item.current}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">AI 建议：</span>
                            {item.suggestion}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 总分卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SEO 综合评分</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pt-2">
                <OverallScoreRing score={kpiData.avgSEO} />
                <p className="text-xs text-muted-foreground text-center">
                  基于商品标题、描述、标签等维度计算
                </p>
              </CardContent>
            </Card>

            {/* 商品 SEO 概览 */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">商品 SEO 概览</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {products.length > 0 ? (
                  products.slice(0, 8).map((product: Record<string, unknown>) => {
                    const score = (product.seo_score as number) || 0;
                    const barColor =
                      score >= 80
                        ? "bg-emerald-500"
                        : score >= 60
                          ? "bg-amber-500"
                          : "bg-destructive";
                    return (
                      <div key={product.id as string} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground truncate max-w-[200px]">{product.name as string}</span>
                          <span className="font-medium tabular-nums">{score}/100</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", barColor)}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">暂无商品数据</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI SEO 优化 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">SEO 优化建议</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {products.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  选择商品后可使用 AI 生成 SEO 优化方案。在商品管理标签页中选择商品并点击"AI SEO 优化"。
                </p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  同步 Shopify 商品后，可获取 AI SEO 优化建议
                </p>
              )}
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
                  {kpiData.healthScore}
                </span>
                <div className="flex items-center gap-1.5">
                  {kpiData.healthScore >= 70 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-emerald-600 font-medium">健康状态良好</span>
                    </>
                  ) : (
                    <span className="text-sm text-amber-600 font-medium">需要优化</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  综合评估商品 SEO 分数、库存和上架状态
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">店铺概况</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 py-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{kpiData.totalProducts}</p>
                    <p className="text-xs text-muted-foreground">总商品数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{kpiData.outOfStock}</p>
                    <p className="text-xs text-muted-foreground">缺货商品</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{kpiData.avgSEO}</p>
                    <p className="text-xs text-muted-foreground">平均 SEO 分</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI SEO 优化对话框 */}
      <SEOOptimizeDialog
        open={seoDialogOpen}
        onOpenChange={setSeoDialogOpen}
        product={selectedProduct}
        integrationId={shopifyIntegration?.id || null}
        onSubmitted={() => {
          refreshProducts();
        }}
      />

      {/* 创建商品对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加商品</DialogTitle>
            <DialogDescription>填写商品信息以创建新商品</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">商品名称</label>
              <Input
                placeholder="请输入商品名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">SKU</label>
                <Input
                  placeholder="请输入 SKU"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">价格</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">库存</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">品类</label>
                <Input
                  placeholder="请输入品类"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">平台</label>
              <Select
                value={formData.platform}
                onValueChange={(val) => setFormData({ ...formData, platform: val as string })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shopify">Shopify</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="tiktok">TikTok Shop</SelectItem>
                  <SelectItem value="独立站">独立站</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.name}>
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {saving ? "创建中..." : "创建商品"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
