"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Link2, Package, Truck, CheckCircle2, Loader2, ShoppingCart, AlertCircle, ArrowRight } from "lucide-react";

interface Competitor {
  id: string;
  competitor_brand: string;
  product_name: string | null;
  product_url: string | null;
  price_usd: number | null;
  image_urls: string[] | null;
  total_score: number | null;
  purchased: boolean;
  received: boolean;
  teardown_completed: boolean;
  ai_analysis: Record<string, unknown> | null;
  created_at: string;
}

function statusBadge(c: Competitor) {
  if (c.ai_analysis) return { label: "已分析", color: "default" as const, icon: CheckCircle2 };
  if (c.teardown_completed) return { label: "待生成报告", color: "secondary" as const, icon: AlertCircle };
  if (c.received) return { label: "待评分", color: "secondary" as const, icon: Package };
  if (c.purchased) return { label: "等待送达", color: "outline" as const, icon: Truck };
  return { label: "未下单", color: "outline" as const, icon: ShoppingCart };
}

export default function CompetitorsListPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualProduct, setManualProduct] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [mode, setMode] = useState<"url" | "manual">("url");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/competitors?action=list");
    const data = await res.json();
    setCompetitors(data.competitors || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> =
        mode === "url"
          ? { action: "create_from_url", url: urlInput }
          : {
              action: "create_manual",
              competitor_brand: manualBrand,
              product_name: manualProduct,
              price_usd: manualPrice ? Number(manualPrice) : undefined,
            };
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        if (data.fallback === "manual") setMode("manual");
        return;
      }
      setCreateOpen(false);
      setUrlInput(""); setManualBrand(""); setManualProduct(""); setManualPrice("");
      await load();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <PageHeader
        title="竞品情报"
        description="不只看评价，鼓励实物对比。25 维深度打分 → AI 给战术补差距"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> 添加竞品
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : competitors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 mx-auto text-muted-foreground" />
            <h3 className="font-semibold">还没有竞品</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              把你最在意的 3-5 个竞品加进来。建议每个都下单买回实物，用 25 维框架逐项打分 — 这才是真正的情报
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> 添加第一个竞品
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitors.map(c => {
            const status = statusBadge(c);
            const Icon = status.icon;
            const thumb = c.image_urls?.[0];
            return (
              <Link key={c.id} href={`/competitors/${c.id}`}>
                <Card className="cursor-pointer hover:border-primary/60 transition-colors overflow-hidden h-full">
                  {thumb ? (
                    <div className="h-40 bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb} alt={c.product_name || c.competitor_brand} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/60" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{c.competitor_brand}</p>
                        <h3 className="font-semibold truncate">{c.product_name || "未命名"}</h3>
                      </div>
                      {c.price_usd && <span className="text-sm font-mono">${c.price_usd}</span>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <Badge variant={status.color} className="gap-1">
                        <Icon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                      {typeof c.total_score === "number" && (
                        <span className="font-mono text-muted-foreground">{c.total_score}/100</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加竞品</DialogTitle>
            <DialogDescription>
              粘贴商品链接最快（Shopify 店直接抓），或手动填入基础信息后慢慢打分
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex gap-2 text-sm">
              <button
                className={`px-3 py-1 rounded ${mode === "url" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setMode("url")}
              ><Link2 className="w-3 h-3 inline mr-1" />从 URL 抓取</button>
              <button
                className={`px-3 py-1 rounded ${mode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setMode("manual")}
              >手动填写</button>
            </div>

            {mode === "url" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">竞品商品链接</label>
                <Input
                  placeholder="https://competitor.com/products/xxx"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shopify 店铺只需商品页链接，我们会自动抓取名称/价格/图片。其他站会尝试从页面元数据提取
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="品牌名（如 Alo Yoga）" value={manualBrand} onChange={e => setManualBrand(e.target.value)} />
                <Input placeholder="产品名" value={manualProduct} onChange={e => setManualProduct(e.target.value)} />
                <Input placeholder="价格 (USD，可选)" type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={create} disabled={submitting || (mode === "url" ? !urlInput : !manualBrand || !manualProduct)}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowRight className="w-4 h-4 mr-1" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
