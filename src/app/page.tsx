"use client";

import Link from "next/link";
import { Brain, Radar, FileText, Store, Share2, GraduationCap, Zap, ArrowRight, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Radar, title: "趋势雷达", desc: "实时追踪 SHEIN、TikTok、Amazon 等平台热卖趋势，找到值得做的产品方向" },
  { icon: FileText, title: "内容工厂", desc: "AI 批量生成 TikTok 脚本、小红书文案、Instagram Caption，一键多平台适配" },
  { icon: Store, title: "店铺优化", desc: "独立站首页生成、产品页优化、SEO 分析，让你的店铺转化率翻倍" },
  { icon: Share2, title: "社媒规划", desc: "内容排期、多平台同步发布、数据追踪，一个日历管理所有社媒" },
  { icon: Zap, title: "AI 品牌助手", desc: "品牌定位分析、用户画像生成、竞品研究，AI 帮你制定品牌策略" },
  { icon: GraduationCap, title: "技能包", desc: "运营 SOP、Prompt 模板、成功案例库，新手也能快速上手品牌运营" },
];

const PRICING = [
  {
    name: "免费版",
    price: "¥0",
    period: "/月",
    desc: "适合个人探索",
    features: ["每天 10 次内容生成", "基础趋势查看", "基础社媒排期", "3 个技能包"],
    cta: "免费开始",
    highlighted: false,
  },
  {
    name: "专业版",
    price: "¥199",
    period: "/月",
    desc: "适合独立卖家",
    features: ["无限内容生成", "完整趋势雷达", "产品页 & SEO 优化", "邮件 & 广告文案", "全部技能包", "优先客服支持"],
    cta: "升级专业版",
    highlighted: true,
  },
  {
    name: "团队版",
    price: "¥499",
    period: "/月",
    desc: "适合品牌团队",
    features: ["所有专业版功能", "多人协作", "权限管理", "多品牌管理", "数据分析中心", "专属客户成功经理"],
    cta: "联系销售",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Brain className="h-4 w-4" />
            </div>
            <span className="font-semibold">BrandMind AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              登录
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              免费试用
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-4">
          AI 驱动的品牌运营平台
        </Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          帮助普通人也能
          <span className="text-primary">像专业团队一样</span>
          运营品牌
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          从趋势发现、内容生成、店铺优化到社媒管理，BrandMind AI 是你的一站式品牌运营助手。无需专业团队，AI 帮你搞定一切。
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
            免费开始使用
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Button size="lg" variant="outline">
            查看演示
          </Button>
        </div>

        {/* Mock dashboard preview */}
        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="rounded-xl border border-border bg-card p-2 shadow-2xl shadow-primary/5">
            <div className="rounded-lg bg-muted/50 p-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "总销售额", value: "¥128.5万" },
                  { label: "总订单", value: "3,842" },
                  { label: "内容发布", value: "156" },
                  { label: "粉丝增长", value: "+12.3%" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-background p-4 text-left shadow-sm">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-lg font-bold">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="h-32 rounded-lg bg-background shadow-sm" />
                <div className="h-32 rounded-lg bg-background shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">六大核心模块，覆盖品牌运营全链路</h2>
            <p className="mt-3 text-muted-foreground">从 0 到 1，从产品到品牌，AI 全程陪跑</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold">简单透明的定价</h2>
            <p className="mt-3 text-muted-foreground">选择适合你的方案，随时升级或降级</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlighted ? "border-primary shadow-lg shadow-primary/10 relative" : ""}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">最受欢迎</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold">准备好开始了吗？</h2>
          <p className="mt-3 text-muted-foreground">
            免费注册，立即体验 AI 品牌运营的力量
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-6 gap-2")}>
            免费开始使用
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 BrandMind AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
