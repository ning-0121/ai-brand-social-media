"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { createIntegration } from "@/lib/supabase-integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Store,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  BarChart3,
  Users,
} from "lucide-react";

type Step = "welcome" | "connect" | "syncing" | "done";

interface ShopInfo {
  shop_name: string;
  shop_domain: string;
  currency: string;
}

interface SyncResult {
  synced_products: number;
  synced_orders: number;
  synced_customers: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("welcome");
  const [domain, setDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState("");

  async function handleTestConnection() {
    setTesting(true);
    setError("");

    try {
      const res = await fetch("/api/shopify/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, access_token: accessToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShopInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "连接测试失败");
    } finally {
      setTesting(false);
    }
  }

  async function handleStartSync() {
    setStep("syncing");
    setError("");

    try {
      // Create integration record
      setSyncProgress("正在保存连接信息...");
      const integration = await createIntegration({
        platform: "shopify",
        store_name: shopInfo!.shop_name,
        store_url: domain,
        access_token: accessToken,
        user_id: user?.id,
      });

      // Trigger full sync
      setSyncProgress("正在同步商品数据...");
      const res = await fetch("/api/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_all",
          integration_id: integration.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSyncResult(data);

      // Mark onboarding as complete
      await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "同步失败");
      setStep("connect");
    }
  }

  function handleGoToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold">BrandMind AI</h1>
          <p className="text-sm text-muted-foreground">AI 品牌运营平台</p>
        </div>

        {/* Step: Welcome */}
        {step === "welcome" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-lg">欢迎使用 BrandMind AI</CardTitle>
              <CardDescription>
                连接你的 Shopify 店铺，解锁全部功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {[
                  { icon: ShoppingBag, title: "商品管理", desc: "同步商品数据，AI 优化 SEO" },
                  { icon: BarChart3, title: "销售分析", desc: "实时订单和收入趋势" },
                  { icon: Users, title: "客户洞察", desc: "客户数据分析，提升复购率" },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <feature.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full" onClick={() => setStep("connect")}>
                连接 Shopify 店铺
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Connect */}
        {step === "connect" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5" />
                连接 Shopify 店铺
              </CardTitle>
              <CardDescription>
                输入你的 Shopify 店铺域名和 Admin API Access Token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">店铺域名</label>
                <Input
                  placeholder="your-store.myshopify.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  例如：my-brand.myshopify.com 或直接输入 my-brand
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin API Access Token</label>
                <Input
                  type="password"
                  placeholder="shpat_..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  在 Shopify 后台 → Settings → Apps and sales channels → Develop apps 中获取
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {shopInfo && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">连接成功</p>
                    <p className="text-xs opacity-80">
                      {shopInfo.shop_name} ({shopInfo.shop_domain}) · {shopInfo.currency}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setStep("welcome"); setError(""); setShopInfo(null); }}
                >
                  返回
                </Button>

                {!shopInfo ? (
                  <Button
                    className="flex-1"
                    onClick={handleTestConnection}
                    disabled={!domain || !accessToken || testing}
                  >
                    {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    测试连接
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={handleStartSync}>
                    开始同步数据
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step: Syncing */}
        {step === "syncing" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h3 className="mt-4 text-sm font-medium">正在同步数据</h3>
              <p className="mt-1 text-xs text-muted-foreground">{syncProgress}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                首次同步可能需要几分钟，请勿关闭页面
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === "done" && syncResult && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="mt-4 text-lg font-medium">同步完成</h3>
              <p className="mt-1 text-sm text-muted-foreground">你的店铺数据已就绪</p>

              <div className="mt-6 grid w-full grid-cols-3 gap-3">
                {[
                  { label: "商品", value: syncResult.synced_products },
                  { label: "订单", value: syncResult.synced_orders },
                  { label: "客户", value: syncResult.synced_customers },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              <Button className="mt-6 w-full" onClick={handleGoToDashboard}>
                进入仪表盘
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
