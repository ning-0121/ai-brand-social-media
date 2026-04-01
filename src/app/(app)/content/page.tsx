"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { mockContents, mockTemplates } from "@/modules/content/mock-data";
import { useSupabase } from "@/hooks/use-supabase";
import { getContents, getContentTemplates, getContentKPIs } from "@/lib/supabase-queries";
import { createContent, deleteContent } from "@/lib/supabase-mutations";
import { Platform, KPIData } from "@/lib/types";
import { ContentPreview } from "@/components/content/content-preview";
import { ImageGenerator } from "@/components/content/image-generator";

import {
  Plus,
  Sparkles,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  CalendarDays,
  Zap,
  Loader2,
  Trash2,
  Image as ImageIcon,
  FileText as FileTextIcon,
  Send,
  Save,
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

function ContentCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="mt-2 h-4 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function TemplateCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="mt-2 h-4 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

export default function ContentPage() {
  const { data: kpiData } = useSupabase(getContentKPIs, { total: 0, published: 0, pending: 0, avgEngagement: 0 });
  const contentKPIs: KPIData[] = [
    { label: "内容总数", value: kpiData.total, trend: "up", trendPercent: 12, icon: "FileText", format: "number" },
    { label: "已发布", value: kpiData.published, trend: "up", trendPercent: 8, icon: "CheckCircle", format: "number" },
    { label: "待审核", value: kpiData.pending, trend: "flat", trendPercent: 0, icon: "Clock", format: "number" },
    { label: "平均互动率", value: kpiData.avgEngagement, trend: "up", trendPercent: 2.1, icon: "Heart", format: "percent" },
  ];

  const { data: initialContents, loading: loadingContents } = useSupabase(getContents, mockContents);
  const { data: templates, loading: loadingTemplates } = useSupabase(getContentTemplates, mockTemplates);
  const [localContents, setLocalContents] = useState<typeof mockContents | null>(null);
  const contents = localContents ?? initialContents;

  const [platform, setPlatform] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("3");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<{ title: string; body: string }[]>([]);
  const [genError, setGenError] = useState("");

  // Content package state
  const [genMode, setGenMode] = useState<"text" | "package">("package");
  const [packageResult, setPackageResult] = useState<{
    title: string;
    body: string;
    hashtags: string[];
    image_prompt: string;
    cta: string;
    image_url?: string;
  } | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // CRUD state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({ title: "", body: "", platform: "xiaohongshu", content_type: "image_post", tags: "" });
  const [saving, setSaving] = useState(false);

  const refreshContents = async () => {
    const fresh = await getContents();
    setLocalContents(fresh);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createContent({
        title: formData.title,
        body: formData.body,
        platform: formData.platform,
        content_type: formData.content_type,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      setShowCreateDialog(false);
      setFormData({ title: "", body: "", platform: "xiaohongshu", content_type: "image_post", tags: "" });
      await refreshContents();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条内容吗？")) return;
    await deleteContent(id);
    await refreshContents();
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { setGenError("请输入内容主题"); return; }
    setGenerating(true);
    setGenError("");
    setGeneratedResults([]);
    setPackageResult(null);

    try {
      if (genMode === "package") {
        // Content package mode: generate text + image prompt
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scene: "content_package",
            platform: platform || "xiaohongshu",
            topic,
            tone: tone || "casual",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "生成失败");
        const result = data.results?.[0] || data.results;
        if (result) {
          setPackageResult({
            title: result.title || "",
            body: result.body || "",
            hashtags: result.hashtags || [],
            image_prompt: result.image_prompt || "",
            cta: result.cta || "",
          });
          // Auto-generate image
          if (result.image_prompt) {
            setGeneratingImage(true);
            try {
              const imgRes = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: result.image_prompt,
                  style: platform === "amazon" || platform === "shopify" ? "product_photo" : "social_media",
                  size: platform === "tiktok" || platform === "xiaohongshu" ? "1024x1792" : "1024x1024",
                  quantity: 1,
                }),
              });
              const imgData = await imgRes.json();
              if (imgData.images?.[0]) {
                setPackageResult((prev) =>
                  prev ? { ...prev, image_url: imgData.images[0].url } : prev
                );
              }
            } catch {
              // Image generation is optional
            }
            setGeneratingImage(false);
          }
        }
      } else {
        // Text-only mode
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: platform || "xiaohongshu", topic, tone: tone || "casual", quantity }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "生成失败");
        setGeneratedResults(data.results || []);
      }
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!packageResult) return;
    setSavingDraft(true);
    try {
      await createContent({
        title: packageResult.title,
        body: packageResult.body,
        platform: platform || "xiaohongshu",
        content_type: "image_post",
        tags: packageResult.hashtags,
      });
      await refreshContents();
      setPackageResult(null);
    } catch (err) {
      console.error(err);
    }
    setSavingDraft(false);
  };

  const handleSubmitApproval = async () => {
    if (!packageResult) return;
    setSubmittingApproval(true);
    try {
      const res = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          task: {
            type: "content_publish",
            entity_type: "contents",
            title: `内容发布: ${packageResult.title}`,
            description: `AI 生成的${platform || "xiaohongshu"}图文内容包，包含文案、配图和标签`,
            payload: {
              new_values: {
                title: packageResult.title,
                body: packageResult.body,
                platform: platform || "xiaohongshu",
                hashtags: packageResult.hashtags,
                image_url: packageResult.image_url || null,
                cta: packageResult.cta,
              },
            },
            created_by: "ai",
          },
        }),
      });
      if (res.ok) {
        setPackageResult(null);
      }
    } catch (err) {
      console.error(err);
    }
    setSubmittingApproval(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="内容工厂"
        description="AI 驱动的内容批量生成与管理"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              新建内容
            </Button>
            <Button>
              <Plus className="h-4 w-4" data-icon="inline-start" />
              批量生成
            </Button>
          </div>
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
          {loadingContents ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contents.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={item.platform} />
                      <Badge variant="secondary" className="text-xs">
                        {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={item.status} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
                    {item.tags.map((tag: string) => (
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
          )}
        </TabsContent>

        {/* 批量生成 */}
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" />
                AI 内容生成
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Generation mode selector */}
              <div className="flex gap-2">
                <Button
                  variant={genMode === "package" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGenMode("package")}
                >
                  <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
                  图文内容包
                </Button>
                <Button
                  variant={genMode === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGenMode("text")}
                >
                  <FileTextIcon className="mr-1.5 h-3.5 w-3.5" />
                  纯文案批量
                </Button>
              </div>

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

              {genError && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  {genError}
                </div>
              )}

              <Button className="w-full sm:w-auto" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
                    {genMode === "package" ? "AI 生成内容包中..." : "AI 生成中..."}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" data-icon="inline-start" />
                    {genMode === "package" ? "生成图文内容包" : "开始生成"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Content Package Result */}
          {packageResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI 生成内容包
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                  >
                    {savingDraft ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    保存草稿
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitApproval}
                    disabled={submittingApproval}
                  >
                    {submittingApproval ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    提交审批
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Preview */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    内容预览
                  </div>
                  <ContentPreview
                    platform={platform || "xiaohongshu"}
                    title={packageResult.title}
                    body={packageResult.body}
                    imageUrl={packageResult.image_url}
                    hashtags={packageResult.hashtags}
                    cta={packageResult.cta}
                  />
                  {generatingImage && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      正在生成配图...
                    </div>
                  )}
                </div>

                {/* Edit panel + Image generator */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      标题
                    </label>
                    <Input
                      value={packageResult.title}
                      onChange={(e) =>
                        setPackageResult({ ...packageResult, title: e.target.value })
                      }
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      正文
                    </label>
                    <textarea
                      className={cn(
                        "mt-1 flex min-h-[120px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
                        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      )}
                      value={packageResult.body}
                      onChange={(e) =>
                        setPackageResult({ ...packageResult, body: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      标签
                    </label>
                    <Input
                      value={packageResult.hashtags.join(", ")}
                      onChange={(e) =>
                        setPackageResult({
                          ...packageResult,
                          hashtags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                        })
                      }
                      className="mt-1 text-sm"
                      placeholder="用逗号分隔"
                    />
                  </div>

                  {/* Image generator */}
                  <div className="border-t border-border pt-4">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      配图生成（可重新生成或更换风格）
                    </div>
                    <ImageGenerator
                      initialPrompt={packageResult.image_prompt}
                      platform={platform || "xiaohongshu"}
                      selectedUrl={packageResult.image_url}
                      onImageSelected={(img) =>
                        setPackageResult({ ...packageResult, image_url: img.url })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text-only Generated results */}
          {generatedResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                生成结果（{generatedResults.length} 条）
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {generatedResults.map((item, idx) => (
                  <Card key={idx} className="transition-shadow hover:shadow-sm">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">#{idx + 1}</Badge>
                        <Badge variant="outline" className="text-xs text-primary border-primary/20">AI 生成</Badge>
                      </div>
                      <CardTitle className="mt-2 text-sm font-medium leading-snug">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
                        {item.body}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => navigator.clipboard.writeText(`${item.title}\n\n${item.body}`)}>
                          复制
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          编辑
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* 模板库 */}
        <TabsContent value="templates">
          {loadingTemplates ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <TemplateCardSkeleton key={i} />
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
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
                    {(template.example_tags || []).map((tag: string) => (
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
          )}
        </TabsContent>
      </Tabs>

      {/* 新建内容对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建内容</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">标题</label>
              <Input
                placeholder="请输入内容标题"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">正文</label>
              <textarea
                className={cn(
                  "flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                )}
                placeholder="请输入正文内容"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">平台</label>
                <Select value={formData.platform} onValueChange={(v) => v && setFormData({ ...formData, platform: v })}>
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium">内容类型</label>
                <Select value={formData.content_type} onValueChange={(v) => v && setFormData({ ...formData, content_type: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">标签</label>
              <Input
                placeholder="用逗号分隔多个标签，例如：护肤,美妆,推荐"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.title.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
