"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contentKPIs, mockContents, mockTemplates } from "@/modules/content/mock-data";
import { Platform } from "@/lib/types";

import {
  Plus,
  Sparkles,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  CalendarDays,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  short_video: "短视频",
  image_post: "图文",
  article: "文章",
  carousel: "轮播图",
  story: "故事",
  live: "直播",
};

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "xiaohongshu", label: "小红书" },
  { value: "amazon", label: "Amazon" },
  { value: "shopify", label: "Shopify" },
  { value: "independent", label: "独立站" },
];

const TONES = [
  { value: "professional", label: "专业" },
  { value: "casual", label: "轻松" },
  { value: "humorous", label: "幽默" },
  { value: "inspiring", label: "激励" },
];

const QUANTITIES = [
  { value: "1", label: "1 篇" },
  { value: "3", label: "3 篇" },
  { value: "5", label: "5 篇" },
  { value: "10", label: "10 篇" },
];

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return num.toString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function ContentPage() {
  const [platform, setPlatform] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("3");
  const [topic, setTopic] = useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        title="内容工厂"
        description="AI 驱动的内容批量生成与管理"
        actions={
          <Button>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            批量生成
          </Button>
        }
      />

      <KPICardGrid>
        {contentKPIs.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">内容列表</TabsTrigger>
          <TabsTrigger value="generate">批量生成</TabsTrigger>
          <TabsTrigger value="templates">模板库</TabsTrigger>
        </TabsList>

        {/* 内容列表 */}
        <TabsContent value="list">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockContents.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={item.platform} />
                      <Badge variant="secondary" className="text-xs">
                        {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                      </Badge>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <CardTitle className="mt-2 text-sm font-medium leading-snug line-clamp-2">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Engagement stats */}
                  {item.status === "published" && (
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div>
                        <Eye className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium tabular-nums">
                          {formatNumber(item.engagement.views)}
                        </span>
                      </div>
                      <div>
                        <Heart className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium tabular-nums">
                          {formatNumber(item.engagement.likes)}
                        </span>
                      </div>
                      <div>
                        <MessageSquare className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium tabular-nums">
                          {formatNumber(item.engagement.comments)}
                        </span>
                      </div>
                      <div>
                        <Share2 className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium tabular-nums">
                          {formatNumber(item.engagement.shares)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {item.published_at
                      ? `发布于 ${formatDate(item.published_at)}`
                      : item.scheduled_at
                        ? `排期 ${formatDate(item.scheduled_at)}`
                        : `创建于 ${formatDate(item.created_at)}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 批量生成 */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 内容批量生成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* 平台选择 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">目标平台</label>
                  <Select value={platform} onValueChange={(v) => v && setPlatform(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择平台" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 语气选择 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">内容语气</label>
                  <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择语气" />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 数量选择 */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">生成数量</label>
                  <Select value={quantity} onValueChange={(v) => v && setQuantity(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择数量" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITIES.map((q) => (
                        <SelectItem key={q.value} value={q.value}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 主题输入 */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">内容主题</label>
                <textarea
                  className={cn(
                    "flex min-h-[100px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                  )}
                  placeholder="请输入内容主题或关键词，例如：春季新品发布、户外运动装备推荐..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <Button className="w-full sm:w-auto">
                <Zap className="h-4 w-4" data-icon="inline-start" />
                开始生成
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 模板库 */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockTemplates.map((template) => (
              <Card key={template.id} className="transition-shadow hover:shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <PlatformIcon platform={template.platform} showLabel />
                    <Badge variant="secondary" className="text-xs">
                      {CONTENT_TYPE_LABELS[template.content_type] || template.content_type}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 text-sm font-medium">
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {template.description}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">语气:</span>
                      <Badge variant="outline" className="text-xs font-normal">
                        {template.tone}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span>结构: </span>
                      <span className="text-foreground/80">{template.structure}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.example_tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    使用模板
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
