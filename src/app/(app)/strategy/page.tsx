"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  User,
  Check,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { KPIData } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const kpis: KPIData[] = [
  {
    label: "品牌健康指数",
    value: 85,
    trend: "up",
    trendPercent: 3.2,
    icon: "Heart",
    format: "number",
  },
  {
    label: "用户画像完成度",
    value: "72%",
    trend: "up",
    trendPercent: 5.1,
    icon: "Users",
  },
  {
    label: "竞品数",
    value: 8,
    trend: "flat",
    trendPercent: 0,
    icon: "Swords",
    format: "number",
  },
  {
    label: "品牌一致性得分",
    value: 91,
    trend: "up",
    trendPercent: 1.8,
    icon: "ShieldCheck",
    format: "number",
  },
];

const brandPositioning = {
  品牌名称: "BrandMind",
  一句话定位: "AI 驱动的智能社媒与品牌运营平台，让每一个品牌都能高效增长",
  核心价值: "数据驱动、智能高效、一站式品牌管理",
  目标市场: "中小型电商品牌、DTC 出海品牌、新消费品牌创业者",
  价格带: "¥299 - ¥1,999 / 月",
  差异化优势: "AI 内容生成 + 全渠道社媒管理 + 数据分析一体化，降低品牌运营门槛",
};

const personas = [
  {
    name: "小美",
    age: 24,
    occupation: "美妆博主 / 小红书创作者",
    avatar: "bg-pink-100 text-pink-600",
    painPoints: [
      "内容创作效率低，每天需要花 4+ 小时制作内容",
      "缺乏数据分析能力，不知道什么内容更受欢迎",
      "多平台管理混乱，容易漏发或重复发布",
    ],
    motivation: "希望用更少时间产出更多优质内容，快速涨粉变现",
    platforms: ["小红书", "抖音", "Instagram"],
  },
  {
    name: "李明",
    age: 32,
    occupation: "电商运营经理",
    avatar: "bg-blue-100 text-blue-600",
    painPoints: [
      "多店铺多平台运营效率低下",
      "竞品动态难以持续追踪",
      "品牌调性在不同渠道难以统一",
    ],
    motivation: "需要一站式工具提升团队协作效率，降低运营成本",
    platforms: ["淘宝", "京东", "拼多多", "抖音"],
  },
  {
    name: "张雪",
    age: 20,
    occupation: "大三学生 / 兼职代运营",
    avatar: "bg-purple-100 text-purple-600",
    painPoints: [
      "运营经验不足，不知道如何制定品牌策略",
      "预算有限，无法使用高价工具",
      "需要快速学习行业最佳实践",
    ],
    motivation: "希望借助 AI 工具弥补经验不足，建立个人品牌运营能力",
    platforms: ["小红书", "B站", "微博"],
  },
];

const competitors = [
  {
    name: "Hootsuite",
    platform: "全球社媒",
    pricing: "$99 - $739/月",
    strength: "全球市场占有率高，功能全面",
    weakness: "不支持中国社媒平台，价格偏高",
    threat: "低" as const,
  },
  {
    name: "Buffer",
    platform: "海外社媒",
    pricing: "$6 - $120/月",
    strength: "界面简洁易用，性价比高",
    weakness: "分析功能较弱，不支持国内平台",
    threat: "低" as const,
  },
  {
    name: "蝉妈妈",
    platform: "抖音/快手",
    pricing: "¥399 - ¥2,999/月",
    strength: "抖音数据分析领先，达人资源丰富",
    weakness: "仅覆盖短视频平台，缺少内容生成",
    threat: "高" as const,
  },
  {
    name: "新榜",
    platform: "全渠道",
    pricing: "¥500 - ¥5,000/月",
    strength: "内容数据全面，行业报告丰富",
    weakness: "工具化程度不够，缺乏 AI 能力",
    threat: "中" as const,
  },
  {
    name: "Later",
    platform: "Instagram/TikTok",
    pricing: "$25 - $80/月",
    strength: "视觉排期优秀，UGC 管理强",
    weakness: "仅支持海外平台，中文支持弱",
    threat: "低" as const,
  },
  {
    name: "有赞",
    platform: "微信/小程序",
    pricing: "¥6,800 - ¥26,800/年",
    strength: "私域运营完善，电商闭环成熟",
    weakness: "社媒管理功能弱，AI 能力有限",
    threat: "中" as const,
  },
  {
    name: "千瓜数据",
    platform: "小红书",
    pricing: "¥299 - ¥1,999/月",
    strength: "小红书数据分析深入，达人匹配精准",
    weakness: "平台覆盖单一，缺少内容创作工具",
    threat: "高" as const,
  },
  {
    name: "Sprout Social",
    platform: "海外社媒",
    pricing: "$249 - $499/月",
    strength: "企业级功能强大，客户服务整合好",
    weakness: "价格昂贵，不适合中小品牌",
    threat: "低" as const,
  },
];

const brandColors = [
  { name: "主色", hex: "#6366F1", className: "bg-[#6366F1]" },
  { name: "辅助色", hex: "#8B5CF6", className: "bg-[#8B5CF6]" },
  { name: "强调色", hex: "#EC4899", className: "bg-[#EC4899]" },
  { name: "中性色", hex: "#1E293B", className: "bg-[#1E293B]" },
];

const brandToneKeywords = [
  "专业",
  "温暖",
  "年轻",
  "可信赖",
  "创新",
  "简洁",
  "有活力",
  "亲和力",
];

const brandDos = [
  "使用积极、鼓励性的语言",
  "保持专业但不生硬的语气",
  "用数据说话，提供具体案例",
  "关注用户痛点，提供解决方案",
  "适当使用行业术语，体现专业度",
];

const brandDonts = [
  "避免过度使用网络流行语",
  "不使用负面或贬低竞品的表述",
  "不做无法兑现的承诺",
  "避免过于学术化或晦涩的表达",
  "不忽视用户反馈和社区声音",
];

/* ------------------------------------------------------------------ */
/*  Threat Badge                                                       */
/* ------------------------------------------------------------------ */

function ThreatBadge({ level }: { level: "高" | "中" | "低" }) {
  const variant =
    level === "高"
      ? "destructive"
      : level === "中"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{level}</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StrategyPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [brandInput, setBrandInput] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    positioning?: string;
    target_audience?: string;
    core_values?: string[];
    differentiators?: string[];
    tone_keywords?: string[];
    suggestions?: string[];
  } | null>(null);

  async function handleAnalyze() {
    if (!brandInput.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "brand_analysis", topic: brandInput }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const result = data.results?.[0] ?? null;
      setAnalysisResult(result);
    } catch (err) {
      console.error("品牌分析失败:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="品牌策略中心"
        description="全方位管理品牌定位、用户画像、竞品分析与品牌调性，构建统一的品牌战略体系"
      />

      {/* KPI Cards */}
      <KPICardGrid>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* Tabs */}
      <Tabs defaultValue="positioning" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positioning">品牌定位</TabsTrigger>
          <TabsTrigger value="personas">用户画像</TabsTrigger>
          <TabsTrigger value="competitors">竞品分析</TabsTrigger>
          <TabsTrigger value="tone">品牌调性</TabsTrigger>
        </TabsList>

        {/* ---- 品牌定位 ---- */}
        <TabsContent value="positioning" className="space-y-4">
          {/* AI 品牌定位分析 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI 品牌定位分析
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="描述你的品牌/产品，例如：我们是一个主打年轻女性的轻奢护肤品牌，主要在小红书和抖音销售..."
                rows={3}
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                disabled={analyzing}
              />
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !brandInput.trim()}
              >
                {analyzing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {analyzing ? "分析中..." : "AI 分析"}
              </Button>

              {analysisResult && (
                <div className="mt-6 space-y-4">
                  {/* 品牌定位 */}
                  {analysisResult.positioning && (
                    <div className="rounded-lg border-l-4 border-purple-500 bg-purple-50 p-4 dark:bg-purple-950/30">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        品牌定位
                      </p>
                      <p className="text-base font-semibold text-purple-700 dark:text-purple-300">
                        &ldquo;{analysisResult.positioning}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* 目标用户 */}
                    {analysisResult.target_audience && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">目标用户</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed text-foreground/80">
                            {analysisResult.target_audience}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* 核心价值 */}
                    {analysisResult.core_values && analysisResult.core_values.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">核心价值</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.core_values.map((v, i) => (
                              <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 差异化优势 */}
                    {analysisResult.differentiators && analysisResult.differentiators.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">差异化优势</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1.5">
                            {analysisResult.differentiators.map((d, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-500" />
                                {d}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {/* 品牌调性 */}
                    {analysisResult.tone_keywords && analysisResult.tone_keywords.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">品牌调性</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.tone_keywords.map((kw, i) => {
                              const colors = [
                                "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
                                "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
                                "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                                "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
                                "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
                              ];
                              return (
                                <span
                                  key={i}
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colors[i % colors.length]}`}
                                >
                                  {kw}
                                </span>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* 策略建议 */}
                  {analysisResult.suggestions && analysisResult.suggestions.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">策略建议</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ol className="space-y-2">
                          {analysisResult.suggestions.map((s, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                {i + 1}
                              </span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 品牌定位概览 (原有静态内容) */}
          <Card>
            <CardHeader>
              <CardTitle>品牌定位概览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {Object.entries(brandPositioning).map(([label, value]) => (
                  <div key={label} className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p className="text-sm font-medium leading-relaxed">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- 用户画像 ---- */}
        <TabsContent value="personas">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {personas.map((persona) => (
              <Card key={persona.name}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${persona.avatar}`}
                    >
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{persona.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {persona.age}岁 / {persona.occupation}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      痛点
                    </p>
                    <ul className="space-y-1">
                      {persona.painPoints.map((point, i) => (
                        <li
                          key={i}
                          className="text-sm leading-relaxed text-foreground/80"
                        >
                          - {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      购买动机
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {persona.motivation}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      常用平台
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {persona.platforms.map((platform) => (
                        <Badge key={platform} variant="secondary">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---- 竞品分析 ---- */}
        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>竞品对比分析</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>竞品名</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>定价范围</TableHead>
                    <TableHead>核心优势</TableHead>
                    <TableHead>劣势</TableHead>
                    <TableHead>威胁程度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.platform}</TableCell>
                      <TableCell>{c.pricing}</TableCell>
                      <TableCell className="max-w-[200px] whitespace-normal">
                        {c.strength}
                      </TableCell>
                      <TableCell className="max-w-[200px] whitespace-normal">
                        {c.weakness}
                      </TableCell>
                      <TableCell>
                        <ThreatBadge level={c.threat} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- 品牌调性 ---- */}
        <TabsContent value="tone" className="space-y-4">
          {/* 品牌色彩 */}
          <Card>
            <CardHeader>
              <CardTitle>品牌色彩</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {brandColors.map((color) => (
                  <div key={color.hex} className="flex flex-col items-center gap-2">
                    <div
                      className={`h-16 w-16 rounded-xl ${color.className} ring-1 ring-foreground/10`}
                    />
                    <p className="text-xs font-medium">{color.name}</p>
                    <p className="text-xs text-muted-foreground">{color.hex}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 品牌语气 */}
          <Card>
            <CardHeader>
              <CardTitle>品牌语气</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {brandToneKeywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="text-sm px-3 py-1">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 品牌视觉风格 */}
          <Card>
            <CardHeader>
              <CardTitle>品牌视觉风格</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground/80">
                采用现代简约的设计风格，以大量留白和清晰的信息层级为核心。视觉上偏向科技感与温暖感的平衡
                ——使用渐变紫色系作为主视觉，搭配圆润的卡片式布局和柔和的阴影效果。图标风格统一使用线性图标
                (Outline)，字体选择无衬线体，中文优先使用系统默认字体以保证阅读体验。整体视觉传递&ldquo;智能、可信赖、
                易上手&rdquo;的品牌印象。
              </p>
            </CardContent>
          </Card>

          {/* Do / Don't */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <Check className="h-4 w-4" />
                  Do - 品牌表达规范
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {brandDos.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <X className="h-4 w-4" />
                  Don&apos;t - 品牌表达禁忌
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {brandDonts.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
