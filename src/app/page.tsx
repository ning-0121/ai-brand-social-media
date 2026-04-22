"use client";

import Link from "next/link";
import {
  Brain, ArrowRight, Check, Workflow, Rocket, Archive, Stethoscope, Calendar,
  Zap, Target, Layers, Sparkles, PlayCircle, ChevronRight,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLAYBOOKS = [
  {
    icon: Rocket,
    name: "新品上市全套",
    category: "增长",
    categoryColor: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    objective: "从验证到上市的完整闭环",
    steps: "9 步 · 调度 8 个 skill",
    duration: "~4 分钟",
    deliverables: ["PMF 诊断", "定价策略", "详情页 HTML", "产品图", "30s 视频脚本", "Meta+TikTok 广告 Brief", "承接页"],
  },
  {
    icon: Archive,
    name: "清仓去库存",
    category: "库存",
    categoryColor: "bg-amber-500/10 text-amber-600 border-amber-200",
    objective: "滞销品 30 天清完，最大化回收",
    steps: "7 步 · 4 个 skill 并行",
    duration: "~3 分钟",
    deliverables: ["清仓诊断", "套装定价公式", "四阶段活动蓝图", "承接页", "弃购挽回三步邮件", "再营销广告 Brief"],
  },
  {
    icon: Stethoscope,
    name: "独立站一键优化",
    category: "优化",
    categoryColor: "bg-blue-500/10 text-blue-600 border-blue-200",
    objective: "体检 + 动态修复，拉升 CVR/SEO/AOV",
    steps: "5 步 · 动态抓取最差商品",
    duration: "~5 分钟",
    deliverables: ["店铺健康分", "优先修复清单", "批量商品标题优化", "最差详情页重写", "首页 Hero 升级"],
  },
  {
    icon: Calendar,
    name: "一周社媒内容包",
    category: "内容",
    categoryColor: "bg-pink-500/10 text-pink-600 border-pink-200",
    objective: "按研究配比 40/40/20 生成一周素材",
    steps: "9 步 · 并行 3 个视频脚本",
    duration: "~3 分钟",
    deliverables: ["自动选品（热销+新品）", "内容日历", "BAB+钩子+试穿 3 个脚本", "图文帖子包", "标签策略", "配图"],
  },
];

const CAPABILITIES = [
  { icon: Target, title: "真实数据驱动", desc: "不是通用建议。用你店铺近30天销量/库存/复购真实数据做决策。" },
  { icon: Layers, title: "50+ 专业 Skill", desc: "从 SEO 到弃购挽回，每个 skill 内置研究验证的行业基准与公式。" },
  { icon: Workflow, title: "AI 编排并行执行", desc: "指挥官选择最优 Playbook，skill 之间传递上下文，并行执行节省 60% 时间。" },
  { icon: Sparkles, title: "生态工具接入", desc: "Shopify / Photoroom / Replicate / Shotstack / Klaviyo 等一键连通，产出直接落地。" },
];

const COMPARISON = [
  { item: "新品上市完整素材", traditional: "2-3 人团队 · 5-7 天", brandmind: "1 个人 · 4 分钟" },
  { item: "清仓活动策划", traditional: "活动策划 + 设计 · 3 天", brandmind: "AI 指挥官 · 3 分钟" },
  { item: "独立站健康诊断", traditional: "外包顾问 · $2000+", brandmind: "点击运行 · 5 分钟" },
  { item: "每周 5 条社媒内容", traditional: "内容团队 · 全周" , brandmind: "自动生成 · 3 分钟" },
];

const PRICING = [
  {
    name: "创业者",
    price: "¥0",
    period: "/月",
    desc: "试用全部 Playbook",
    features: ["每月 5 次工作流运行", "50+ Skill 只读访问", "基础数据诊断", "社区支持"],
    cta: "免费体验",
    highlighted: false,
  },
  {
    name: "主理人",
    price: "¥399",
    period: "/月",
    desc: "独立品牌操盘手首选",
    features: [
      "无限工作流运行",
      "50+ Skill 全部开放",
      "连接 Shopify 实盘操作",
      "图片处理 500 张/月",
      "AI 规划器无限调用",
      "优先客服",
    ],
    cta: "升级主理人",
    highlighted: true,
  },
  {
    name: "品牌军团",
    price: "¥999",
    period: "/月",
    desc: "多品牌 / 小团队",
    features: [
      "主理人全部权益",
      "多品牌管理 (最多 5 个)",
      "自定义 Playbook",
      "Klaviyo / Meta Ads API 自动触发",
      "专家 Prompt 自训练",
      "专属成功经理",
    ],
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
            <Badge variant="outline" className="ml-2 hidden sm:inline-flex text-xs">品牌指挥官</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              登录
            </Link>
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              进入指挥中心
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.08),_transparent_50%)]" />
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Sparkles className="h-3 w-3" />
            AI 品牌运营编排系统
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            一个人，
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              操盘一支品牌军团
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            BrandMind AI 是你的 <strong className="text-foreground">AI 品牌指挥官</strong>。
            用自然语言下达业务目标，AI 自动编排 50+ 专业 Skill，
            并行完成 <strong className="text-foreground">验证 → 策略 → 素材 → 部署</strong> 全链路。
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              进入指挥中心
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Button size="lg" variant="outline" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              看 3 分钟 Demo
            </Button>
          </div>

          {/* Sample AI command visualization */}
          <div className="relative mx-auto mt-16 max-w-3xl">
            <div className="rounded-xl border border-border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              {/* Terminal-like header */}
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-muted-foreground font-mono">BrandMind · 指挥中心</span>
              </div>
              {/* Chat */}
              <div className="p-6 space-y-4 text-left">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold">你</span>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted/40 p-3 text-sm">
                    &quot;把那条滞销的褪色连衣裙清掉，库存还有 50 件&quot;
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="text-muted-foreground">已匹配 <strong className="text-foreground">「清仓去库存」</strong> Playbook，正在并行执行：</p>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" />清仓诊断：sell-through 38%，建议强制清仓</div>
                      <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" />套装定价：绑核心款减 15%，保 52% 毛利</div>
                      <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" />四阶段活动蓝图：72h 闪购 + FOMO 机制</div>
                      <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" />承接页 + 弃购挽回三步邮件（并行）</div>
                      <div className="flex items-center gap-2"><Check className="h-3 w-3 text-green-500" />社媒帖子 + 再营销广告 Brief（并行）</div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2">✅ 完成 · 用时 2 分 47 秒 · 产出 11 个交付物</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">为什么它能替代一整个运营团队</h2>
            <p className="mt-3 text-muted-foreground">不是 ChatGPT 套壳，是真正的运营系统</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <Card key={c.title} className="border-border/60">
                <CardContent className="p-6 flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Playbooks */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Workflow className="h-3 w-3" />
              Playbook 作战手册
            </Badge>
            <h2 className="text-3xl font-bold">4 个开箱即用的作战方案</h2>
            <p className="mt-3 text-muted-foreground">
              每个 Playbook 都是一组 Skill 的协同编排。AI 指挥官选择最优路径，自动并行执行
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLAYBOOKS.map((pb) => (
              <Card key={pb.name} className="border-border/60 hover:border-primary/40 transition-all hover:shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", pb.categoryColor)}>
                      <pb.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="text-xs">{pb.category}</Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{pb.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{pb.objective}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Workflow className="w-3 h-3" />{pb.steps}</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{pb.duration}</span>
                  </div>
                  <div className="pt-3 border-t space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">产出交付物：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pb.deliverables.map((d) => (
                        <span key={d} className="text-xs px-2 py-0.5 rounded-md bg-muted text-foreground/80">{d}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-border bg-muted/20 py-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">传统方式 vs BrandMind AI</h2>
            <p className="mt-3 text-muted-foreground">同样的产出，不同的时间和成本</p>
          </div>
          <div className="mt-12 rounded-xl border overflow-hidden bg-card">
            <div className="grid grid-cols-3 bg-muted/30 px-6 py-3 text-sm font-semibold border-b">
              <div>运营任务</div>
              <div className="text-muted-foreground">传统方式</div>
              <div className="text-primary">BrandMind AI</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={row.item} className={cn(
                "grid grid-cols-3 px-6 py-4 text-sm items-center",
                i !== COMPARISON.length - 1 && "border-b",
              )}>
                <div className="font-medium">{row.item}</div>
                <div className="text-muted-foreground">{row.traditional}</div>
                <div className="font-semibold text-primary flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  {row.brandmind}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <Badge variant="secondary" className="mb-4">生态集成</Badge>
          <h2 className="text-3xl font-bold">真正能落地的运营系统</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            不是只给方案，产出直接进入你的工具链 — Shopify 上架、Klaviyo 触发、素材直接发 TikTok/Instagram
          </p>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {["Shopify", "Photoroom", "Replicate", "Shotstack", "Klaviyo", "TikTok / Meta"].map(name => (
              <div key={name} className="rounded-lg border bg-card px-4 py-3 text-sm font-medium hover:border-primary/40 transition-colors">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">定价</h2>
            <p className="mt-3 text-muted-foreground">按使用价值定价，不按用户数卡你</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 items-start">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative",
                  plan.highlighted && "border-primary shadow-lg shadow-primary/10 sm:-mt-4"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground shadow-md">主理人首选</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.08),_transparent_60%)]" />
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-4xl font-bold leading-tight">
            停止做<span className="line-through text-muted-foreground">孤军奋战</span>，
            <br />开始<span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">指挥军团</span>
          </h2>
          <p className="mt-6 text-muted-foreground">
            接入你的 Shopify，5 分钟看到第一个工作流产出
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }), "mt-8 gap-2")}>
            进入指挥中心
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            无需信用卡 · 免费版每月 5 次工作流
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 BrandMind AI. 让品牌操盘从「人力密集」变成「智能密集」。</p>
        </div>
      </footer>
    </div>
  );
}
