"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { HtmlPreview } from "@/components/ops/html-preview";
import { TaskResultRenderer } from "@/components/ops/task-result-renderer";
import { Loader2, Zap, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Product { id: string; name: string; }

interface Component {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  platform?: string;
}

interface CampaignResult {
  campaign_name: string;
  duration_ms: number;
  components: {
    landing_page?: Component;
    banner?: Component;
    social_posts?: Component[];
    hashtag_strategy?: Component;
    video_script?: Component;
  };
}

export default function CampaignComposePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [spec, setSpec] = useState({
    name: "",
    goal: "purchase",
    product_id: "",
    headline_idea: "",
    offer: "",
    urgency: "",
    banner_size: "wide_banner",
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase-browser");
        const sb = createClient();
        const { data } = await sb.from("products").select("id, name")
          .eq("platform", "shopify").not("shopify_product_id", "is", null)
          .order("created_at", { ascending: false }).limit(50);
        if (data) setProducts(data as Product[]);
      } catch { /* silent */ }
    })();
  }, []);

  const compose = async () => {
    if (!spec.name) { toast.error("请填活动名"); return; }
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/campaigns/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "failed");
      setResult(d.result);
      const ok = Object.values(d.result.components).flat().filter((c: unknown) => (c as Component)?.success).length;
      toast.success(`活动套件已生成（${ok} 件成功，耗时 ${(d.result.duration_ms / 1000).toFixed(1)}s）`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "生成失败");
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Campaign Composer"
        description="一个活动概念 → 并行生成 落地页 / Banner / 3 条社媒 / Hashtag / 视频脚本，全套使用统一品牌指南"
      />

      <Card className="bg-gradient-to-br from-primary/5 to-purple-50 dark:to-purple-950/10">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" />活动配置</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">活动名 *</label>
              <Input value={spec.name} onChange={e => setSpec({ ...spec, name: e.target.value })}
                placeholder="春夏新品发布 · 母亲节特惠..." className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">活动目标</label>
              <select value={spec.goal} onChange={e => setSpec({ ...spec, goal: e.target.value })}
                className="mt-1 w-full h-9 rounded-md border px-2 text-sm">
                <option value="purchase">促成购买</option>
                <option value="email_signup">邮件订阅</option>
                <option value="presale">新品预售</option>
                <option value="brand_story">品牌故事</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">主推商品（可选）</label>
              <select value={spec.product_id} onChange={e => setSpec({ ...spec, product_id: e.target.value })}
                className="mt-1 w-full h-9 rounded-md border px-2 text-sm">
                <option value="">— 不绑定商品 —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Banner 尺寸</label>
              <select value={spec.banner_size} onChange={e => setSpec({ ...spec, banner_size: e.target.value })}
                className="mt-1 w-full h-9 rounded-md border px-2 text-sm">
                <option value="wide_banner">宽幅 16:9</option>
                <option value="ad_banner">广告 16:9</option>
                <option value="promo_poster">海报 3:4</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">优惠信息</label>
              <Input value={spec.offer} onChange={e => setSpec({ ...spec, offer: e.target.value })}
                placeholder="首单 8 折 · 满 $100 免运" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">紧迫性</label>
              <Input value={spec.urgency} onChange={e => setSpec({ ...spec, urgency: e.target.value })}
                placeholder="本周末结束 · 仅 100 件" className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">主标题灵感（可选）</label>
            <Textarea value={spec.headline_idea} onChange={e => setSpec({ ...spec, headline_idea: e.target.value })}
              placeholder="留空让 AI 发挥..." rows={2} className="mt-1" />
          </div>
          <Button size="lg" className="w-full" onClick={compose} disabled={running}>
            {running
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />并行生成中（约 30-60 秒）...</>
              : <><Zap className="h-4 w-4 mr-2" />一键生成完整活动包</>}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            将并行调用 5 个 AI skill，所有输出使用你在 <a href="/brand-guide" className="underline">品牌指南</a> 里定义的色彩/语气
          </p>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 hover:bg-green-600">✓ {result.campaign_name}</Badge>
            <span className="text-xs text-muted-foreground">耗时 {(result.duration_ms / 1000).toFixed(1)}s</span>
          </div>

          {result.components.landing_page?.success && result.components.landing_page.output && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">📄 活动落地页</CardTitle></CardHeader>
              <CardContent>
                <HtmlPreview
                  html={(result.components.landing_page.output.body_html as string) || ""}
                  title={result.campaign_name}
                  shopifyDeploy={{ target: "new_page", defaultTitle: result.campaign_name }}
                  deployLabel="创建 Shopify 页面"
                />
              </CardContent>
            </Card>
          )}

          {result.components.banner?.success && result.components.banner.output && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">🎨 活动 Banner</CardTitle></CardHeader>
              <CardContent>
                <TaskResultRenderer taskType="banner_design" result={result.components.banner.output} />
              </CardContent>
            </Card>
          )}

          {result.components.social_posts && result.components.social_posts.some(p => p.success) && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">📱 社媒帖子</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.components.social_posts.map((p, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{p.platform}</Badge>
                      {p.success ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                    </div>
                    {p.success && p.output
                      ? <TaskResultRenderer taskType="post" result={p.output} />
                      : <p className="text-xs text-red-600">{p.error || "失败"}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.components.hashtag_strategy?.success && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">#️⃣ Hashtag 策略</CardTitle></CardHeader>
                <CardContent>
                  <TaskResultRenderer taskType="hashtag_strategy" result={result.components.hashtag_strategy.output!} />
                </CardContent>
              </Card>
            )}
            {result.components.video_script?.success && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">🎬 短视频脚本</CardTitle></CardHeader>
                <CardContent>
                  <TaskResultRenderer taskType="short_video_script" result={result.components.video_script.output!} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
