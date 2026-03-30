"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Copy, Pencil, Sparkles, Loader2 } from "lucide-react";
import type { KPIData } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  KPI 数据                                                          */
/* ------------------------------------------------------------------ */

const kpis: KPIData[] = [
  { label: "活跃广告", value: 8, trend: "up", trendPercent: 14.3, icon: "Megaphone" },
  { label: "总花费", value: "¥4.2万", trend: "up", trendPercent: 8.6, icon: "Wallet" },
  { label: "总ROAS", value: "3.6x", trend: "up", trendPercent: 5.1, icon: "TrendingUp" },
  { label: "总转化数", value: "1,245", trend: "up", trendPercent: 12.7, icon: "ShoppingCart" },
];

/* ------------------------------------------------------------------ */
/*  广告管理 mock 数据                                                 */
/* ------------------------------------------------------------------ */

type AdStatus = "投放中" | "暂停" | "已结束";

interface AdRow {
  id: string;
  name: string;
  platform: string;
  status: AdStatus;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  conversions: number;
  roas: number;
}

const ads: AdRow[] = [
  { id: "1", name: "春季新品推广 - A组", platform: "抖音", status: "投放中", spend: "¥8,500", impressions: "320,000", clicks: "9,600", ctr: "3.0%", conversions: 286, roas: 4.2 },
  { id: "2", name: "品牌曝光 - 小红书种草", platform: "小红书", status: "投放中", spend: "¥6,200", impressions: "185,000", clicks: "7,400", ctr: "4.0%", conversions: 198, roas: 3.8 },
  { id: "3", name: "618大促预热视频", platform: "抖音", status: "投放中", spend: "¥12,300", impressions: "540,000", clicks: "16,200", ctr: "3.0%", conversions: 412, roas: 3.1 },
  { id: "4", name: "Instagram Reels 海外推广", platform: "Instagram", status: "投放中", spend: "¥5,800", impressions: "220,000", clicks: "6,160", ctr: "2.8%", conversions: 145, roas: 2.6 },
  { id: "5", name: "老客召回 - 短信+信息流", platform: "抖音", status: "暂停", spend: "¥3,400", impressions: "95,000", clicks: "3,325", ctr: "3.5%", conversions: 89, roas: 2.1 },
  { id: "6", name: "新品测款 - 轮播素材", platform: "小红书", status: "投放中", spend: "¥2,100", impressions: "68,000", clicks: "2,380", ctr: "3.5%", conversions: 52, roas: 1.8 },
  { id: "7", name: "品牌词搜索竞价", platform: "抖音", status: "已结束", spend: "¥1,600", impressions: "42,000", clicks: "2,100", ctr: "5.0%", conversions: 38, roas: 1.5 },
  { id: "8", name: "KOL合作联名投放", platform: "Instagram", status: "投放中", spend: "¥4,500", impressions: "156,000", clicks: "5,460", ctr: "3.5%", conversions: 125, roas: 3.4 },
];

function getStatusStyle(status: AdStatus) {
  switch (status) {
    case "投放中":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "暂停":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "已结束":
      return "bg-muted text-muted-foreground border-border";
  }
}

function getRoasColor(roas: number) {
  if (roas >= 3) return "text-emerald-600";
  if (roas >= 2) return "text-amber-600";
  return "text-destructive";
}

/* ------------------------------------------------------------------ */
/*  创意库 mock 数据                                                   */
/* ------------------------------------------------------------------ */

type CreativeFormat = "图片" | "视频" | "轮播";
type PerformanceGrade = "A" | "B" | "C";

interface Creative {
  id: string;
  title: string;
  platform: string;
  format: CreativeFormat;
  grade: PerformanceGrade;
  ctr: string;
  usageCount: number;
}

const creatives: Creative[] = [
  { id: "c1", title: "春日氛围感穿搭合集", platform: "小红书", format: "轮播", grade: "A", ctr: "4.2%", usageCount: 12 },
  { id: "c2", title: "新品开箱15秒短视频", platform: "抖音", format: "视频", grade: "A", ctr: "3.8%", usageCount: 8 },
  { id: "c3", title: "限时折扣主图", platform: "抖音", format: "图片", grade: "B", ctr: "2.9%", usageCount: 15 },
  { id: "c4", title: "海外生活方式短片", platform: "Instagram", format: "视频", grade: "B", ctr: "2.5%", usageCount: 6 },
  { id: "c5", title: "用户好评截图合集", platform: "小红书", format: "轮播", grade: "C", ctr: "1.8%", usageCount: 4 },
  { id: "c6", title: "品牌故事竖版海报", platform: "Instagram", format: "图片", grade: "A", ctr: "3.5%", usageCount: 10 },
];

function getFormatStyle(format: CreativeFormat) {
  switch (format) {
    case "图片":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "视频":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "轮播":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
  }
}

function getGradeStyle(grade: PerformanceGrade) {
  switch (grade) {
    case "A":
      return "bg-emerald-500/10 text-emerald-600";
    case "B":
      return "bg-amber-500/10 text-amber-600";
    case "C":
      return "bg-red-500/10 text-red-600";
  }
}

/* ------------------------------------------------------------------ */
/*  转化漏斗 mock 数据                                                 */
/* ------------------------------------------------------------------ */

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

const funnelSteps: FunnelStep[] = [
  { label: "展示", value: 1_000_000, color: "bg-blue-500" },
  { label: "点击", value: 35_000, color: "bg-indigo-500" },
  { label: "加购", value: 8_200, color: "bg-violet-500" },
  { label: "下单", value: 2_450, color: "bg-purple-500" },
  { label: "完成", value: 1_245, color: "bg-emerald-500" },
];

function formatFunnelNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ================================================================== */
/*  Page Component                                                     */
/* ================================================================== */

const AD_PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "tiktok", label: "TikTok" },
  { value: "xiaohongshu", label: "小红书" },
];

export default function AdsPage() {
  const [generating, setGenerating] = useState(false);
  const [adTopic, setAdTopic] = useState("");
  const [adPlatform, setAdPlatform] = useState("facebook");
  const [adAudience, setAdAudience] = useState("");
  const [generatedAds, setGeneratedAds] = useState<{title: string; body: string; cta?: string}[]>([]);
  const [genError, setGenError] = useState("");

  const handleGenerateAd = async () => {
    if (!adTopic.trim()) { setGenError("请输入产品或主题"); return; }
    setGenerating(true);
    setGenError("");
    setGeneratedAds([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scene: "ad_copy",
          topic: adTopic,
          ad_platform: adPlatform,
          audience: adAudience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      setGeneratedAds(Array.isArray(data.result) ? data.result : [data.result]);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <PageHeader
        title="广告投放中心"
        description="管理广告投放、创意素材与转化漏斗数据"
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            创建广告
          </Button>
        }
      />

      {/* ---------- KPI ---------- */}
      <KPICardGrid>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* ---------- Tabs ---------- */}
      <Tabs defaultValue="ads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ads">广告管理</TabsTrigger>
          <TabsTrigger value="creatives">创意库</TabsTrigger>
          <TabsTrigger value="funnel">转化漏斗</TabsTrigger>
        </TabsList>

        {/* ========== 广告管理 ========== */}
        <TabsContent value="ads">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[22%]">广告名称</TableHead>
                    <TableHead>平台</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">花费</TableHead>
                    <TableHead className="text-right">展示量</TableHead>
                    <TableHead className="text-right">点击量</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">转化数</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ads.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ad.platform}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusStyle(ad.status)}>
                          {ad.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{ad.spend}</TableCell>
                      <TableCell className="text-right tabular-nums">{ad.impressions}</TableCell>
                      <TableCell className="text-right tabular-nums">{ad.clicks}</TableCell>
                      <TableCell className="text-right tabular-nums">{ad.ctr}</TableCell>
                      <TableCell className="text-right tabular-nums">{ad.conversions}</TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${getRoasColor(ad.roas)}`}>
                        {ad.roas.toFixed(1)}x
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== 创意库 ========== */}
        <TabsContent value="creatives" className="space-y-6">
          {/* ---------- AI 广告文案生成 ---------- */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 广告文案生成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 产品/主题 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">产品 / 主题</label>
                  <Input
                    placeholder="例如：春季新款连衣裙"
                    value={adTopic}
                    onChange={(e) => setAdTopic(e.target.value)}
                  />
                </div>

                {/* 投放平台 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">投放平台</label>
                  <Select value={adPlatform} onValueChange={(v) => v && setAdPlatform(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择平台" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 目标受众 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">目标受众</label>
                  <Input
                    placeholder="例如：25-35岁女性，关注美妆"
                    value={adAudience}
                    onChange={(e) => setAdAudience(e.target.value)}
                  />
                </div>
              </div>

              {genError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {genError}
                </div>
              )}

              <Button onClick={handleGenerateAd} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                {generating ? "生成中..." : "AI 生成广告文案"}
              </Button>

              {/* 生成结果 */}
              {generatedAds.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                  {generatedAds.map((ad, idx) => (
                    <Card key={idx} className="transition-shadow hover:shadow-sm">
                      <CardContent className="p-4 space-y-3">
                        <h4 className="text-sm font-semibold leading-tight">{ad.title}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{ad.body}</p>
                        {ad.cta && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {ad.cta}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const text = `${ad.title}\n\n${ad.body}${ad.cta ? `\n\nCTA: ${ad.cta}` : ""}`;
                            navigator.clipboard.writeText(text);
                          }}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          复制
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---------- 创意素材列表 ---------- */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {creatives.map((c) => (
              <Card key={c.id} className="transition-shadow hover:shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{c.title}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{c.platform}</Badge>
                      <Badge variant="outline" className={getFormatStyle(c.format)}>
                        {c.format}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">表现评分</span>
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${getGradeStyle(c.grade)}`}>
                        {c.grade}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CTR </span>
                      <span className="font-medium tabular-nums">{c.ctr}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">使用 </span>
                      <span className="font-medium tabular-nums">{c.usageCount}次</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      复制
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      编辑
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========== 转化漏斗 ========== */}
        <TabsContent value="funnel">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-base font-semibold mb-6">广告转化漏斗</h3>

              <div className="space-y-3">
                {funnelSteps.map((step, idx) => {
                  const widthPercent = (step.value / funnelSteps[0].value) * 100;
                  const overallPercent = ((step.value / funnelSteps[0].value) * 100).toFixed(2);
                  const prevStep = idx > 0 ? funnelSteps[idx - 1] : null;
                  const dropOff = prevStep
                    ? (((prevStep.value - step.value) / prevStep.value) * 100).toFixed(1)
                    : null;
                  const stepConversion = prevStep
                    ? ((step.value / prevStep.value) * 100).toFixed(1)
                    : "100.0";

                  return (
                    <div key={step.label}>
                      {/* 步骤间转化率 */}
                      {idx > 0 && (
                        <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground">
                          <span>转化率 {stepConversion}%</span>
                          <span className="text-destructive/70">流失 {dropOff}%</span>
                        </div>
                      )}

                      {/* 漏斗条 */}
                      <div className="flex items-center gap-4">
                        <span className="w-12 shrink-0 text-right text-sm font-medium">
                          {step.label}
                        </span>
                        <div className="flex-1">
                          <div
                            className={`${step.color} h-10 rounded-md flex items-center transition-all`}
                            style={{
                              width: `${Math.max(widthPercent, 8)}%`,
                              marginLeft: `${(100 - Math.max(widthPercent, 8)) / 2}%`,
                            }}
                          >
                            <span className="px-3 text-sm font-semibold text-white whitespace-nowrap">
                              {formatFunnelNumber(step.value)}
                            </span>
                          </div>
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                          {overallPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 总体转化率摘要 */}
              <div className="mt-6 flex items-center justify-center gap-6 rounded-lg border bg-muted/50 p-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">整体转化率</p>
                  <p className="text-xl font-bold tabular-nums text-emerald-600">
                    {((funnelSteps[funnelSteps.length - 1].value / funnelSteps[0].value) * 100).toFixed(2)}%
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">点击到完成</p>
                  <p className="text-xl font-bold tabular-nums">
                    {((funnelSteps[funnelSteps.length - 1].value / funnelSteps[1].value) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">加购到完成</p>
                  <p className="text-xl font-bold tabular-nums">
                    {((funnelSteps[funnelSteps.length - 1].value / funnelSteps[2].value) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
