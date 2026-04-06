"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupabase } from "@/hooks/use-supabase";
import { getContents, getContentKPIs } from "@/lib/supabase-queries";
import { deleteContent } from "@/lib/supabase-mutations";
import { ContentTaskCard } from "@/components/content/content-task-card";
import { ContentEditor } from "@/components/content/content-editor";
import type { ContentSuggestion } from "@/lib/content-planner";
import type { Platform } from "@/lib/types";

import {
  Sparkles,
  Eye,
  Heart,
  MessageSquare,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  PenLine,
  Lightbulb,
  FileText,
  RefreshCw,
} from "lucide-react";
interface ContentRow {
  id: string;
  title: string;
  body?: string;
  platform: Platform;
  content_type?: string;
  status: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  tags?: string[];
  thumbnail_url?: string;
  published_at?: string;
  created_at: string;
}

const PLATFORMS = [
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

// ========== Main Page ==========

export default function ContentPage() {
  // Data
  const [contents, setContents] = useState<ContentRow[]>([]);
  const fetchContents = async () => {
    try {
      const data = await getContents();
      setContents(data || []);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchContents(); }, []);
  const { data: kpis } = useSupabase(getContentKPIs, { total: 0, published: 0, pending: 0, avgEngagement: 0 });

  // AI Suggestions
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Editor state
  const [editorContent, setEditorContent] = useState<{
    title: string;
    body: string;
    hashtags?: string[];
    image_prompt?: string;
    cta?: string;
    platform: string;
    content_type: string;
    tags: string[];
  } | null>(null);

  // Manual create form
  const [manualPlatform, setManualPlatform] = useState("shopify");
  const [manualTone, setManualTone] = useState("professional");
  const [manualTopic, setManualTopic] = useState("");
  const [manualGenerating, setManualGenerating] = useState(false);

  // Content library toggle
  const [showLibrary, setShowLibrary] = useState(false);

  // Fetch suggestions
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch("/api/content-plan");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("获取建议失败:", err);
    }
    setSuggestionsLoading(false);
  };

  // Generate from suggestion
  const handleGenerateFromSuggestion = async (suggestion: ContentSuggestion) => {
    setGeneratingId(suggestion.id);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic: suggestion.description,
          platform: suggestion.target_platforms[0] || "shopify",
          product_name: suggestion.product_name,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setEditorContent({
          title: data.content.title || suggestion.title,
          body: data.content.body || "",
          hashtags: data.content.hashtags,
          image_prompt: data.content.image_prompt,
          cta: data.content.cta,
          platform: suggestion.target_platforms[0] || "shopify",
          content_type: suggestion.content_type || "image_post",
          tags: data.content.hashtags || [],
        });
      }
    } catch (err) {
      console.error("生成失败:", err);
    }
    setGeneratingId(null);
  };

  // Manual generate
  const handleManualGenerate = async () => {
    if (!manualTopic.trim()) return;
    setManualGenerating(true);
    try {
      const res = await fetch("/api/content-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic: manualTopic,
          platform: manualPlatform,
          tone: manualTone,
        }),
      });
      const data = await res.json();
      if (data.content) {
        setEditorContent({
          title: data.content.title || manualTopic,
          body: data.content.body || "",
          hashtags: data.content.hashtags,
          image_prompt: data.content.image_prompt,
          cta: data.content.cta,
          platform: manualPlatform,
          content_type: "image_post",
          tags: data.content.hashtags || [],
        });
        setManualTopic("");
      }
    } catch (err) {
      console.error("生成失败:", err);
    }
    setManualGenerating(false);
  };

  // Delete content
  const handleDelete = async (id: string) => {
    try {
      await deleteContent(id);
      fetchContents();
    } catch (err) {
      console.error("删除失败:", err);
    }
  };

  // Content stats
  const draftContents = contents.filter((c) => c.status === "draft" || c.status === "pending");
  const publishedContents = contents.filter((c) => c.status === "published");

  return (
    <div className="space-y-6">
      <PageHeader
        title="内容工厂"
        description="AI 驱动的内容制作中心 — 自动提案、智能生成、审批发布"
      />

      {/* KPI Cards */}
      <KPICardGrid>
        <KPICard label="内容总数" value={kpis.total} icon="FileText" format="number" trend="flat" />
        <KPICard label="已发布" value={kpis.published} icon="CheckCircle" format="number" trend="flat" />
        <KPICard label="待审核" value={kpis.pending} icon="Clock" format="number" trend="flat" />
        <KPICard label="互动率" value={kpis.avgEngagement} icon="TrendingUp" format="percent" trend="flat" />
      </KPICardGrid>

      {/* Main layout: 2 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: Task panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: AI Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-sm font-medium">AI 内容建议</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={fetchSuggestions}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestionsLoading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <ContentTaskCard
                    key={s.id}
                    suggestion={s}
                    onGenerate={handleGenerateFromSuggestion}
                    generating={generatingId === s.id}
                  />
                ))
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p>暂无 AI 建议</p>
                  <p className="text-xs mt-1">运行店铺诊断可获取内容建议</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Manual Create */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">手动创建</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Select value={manualPlatform} onValueChange={(v) => v && setManualPlatform(v)}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={manualTone} onValueChange={(v) => v && setManualTone(v)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                placeholder="描述你想创建的内容，例如：为夏季新品系列创建 Instagram 推广图文..."
                className="text-sm min-h-[80px]"
              />
              <Button
                className="w-full h-8 text-xs"
                onClick={handleManualGenerate}
                disabled={manualGenerating || !manualTopic.trim()}
              >
                {manualGenerating ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    AI 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    AI 生成内容
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Section 3: In-progress tasks */}
          {draftContents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-medium">
                    草稿 & 待审核 ({draftContents.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {draftContents.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <PlatformIcon platform={c.platform} size="sm" />
                    <span className="flex-1 text-xs truncate">{c.title}</span>
                    <StatusBadge status={c.status} />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Editor/Preview */}
        <div className="lg:col-span-3">
          {editorContent ? (
            <Card className="sticky top-6">
              <CardContent className="p-4">
                <ContentEditor
                  content={editorContent}
                  onClose={() => setEditorContent(null)}
                  onSaved={() => {
                    fetchContents();
                    // Keep editor open so user can see success state
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <Sparkles className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  选择 AI 建议或手动创建
                  <br />
                  AI 将生成完整内容方案供你编辑和发布
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom: Published content library */}
      <Card>
        <CardHeader className="pb-3">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setShowLibrary(!showLibrary)}
          >
            <CardTitle className="text-sm font-medium">
              已发布内容库 ({publishedContents.length})
            </CardTitle>
            {showLibrary ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showLibrary && (
          <CardContent>
            {publishedContents.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {publishedContents.map((c) => (
                  <Card key={c.id} className="overflow-hidden">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={c.platform} size="sm" />
                        <span className="text-xs text-muted-foreground">{c.platform}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{c.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.body}</p>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" /> {formatNumber(c.views || 0)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" /> {formatNumber(c.likes || 0)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageSquare className="h-3 w-3" /> {formatNumber(c.comments || 0)}
                        </span>
                        <span className="ml-auto">{formatDate(c.published_at || c.created_at)}</span>
                      </div>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                暂无已发布内容
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
