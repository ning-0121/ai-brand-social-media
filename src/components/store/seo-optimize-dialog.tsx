"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Sparkles,
  Send,
  Zap,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Globe,
  Target,
  TrendingUp,
  Code,
} from "lucide-react";
import { toast } from "sonner";
import { calculateSEOScore, type SEOScoreResult } from "@/lib/seo-scoring";

// ─── Types ─────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  body_html?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string;
  handle?: string;
  image_url?: string;
  shopify_product_id?: number;
}

interface SEOAnalysis {
  detected_language: string;
  primary_keyword: string;
  secondary_keywords: string[];
  long_tail_keywords: string[];
  search_intent: string;
  market_strategy?: string;
  optimization_priorities?: string[];
  optimization_reasoning?: string;
}

interface SEOOptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  integrationId: string | null;
  onSubmitted: () => void;
}

type DialogStep = "initial" | "analysis" | "generation";

// ─── Helpers ───────────────────────────────────────────────────

function ScoreCircle({
  score,
  label,
  size = "md",
}: {
  score: number;
  label: string;
  size?: "sm" | "md";
}) {
  const radius = size === "md" ? 36 : 24;
  const stroke = size === "md" ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dim = (radius + stroke) * 2;

  const color =
    score >= 70
      ? "text-emerald-500"
      : score >= 40
        ? "text-amber-500"
        : "text-red-500";
  const strokeColor =
    score >= 70
      ? "stroke-emerald-500"
      : score >= 40
        ? "stroke-amber-500"
        : "stroke-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/20"
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={strokeColor}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center font-bold ${color} ${size === "md" ? "text-lg" : "text-sm"}`}
        >
          {score}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">
        {label}
      </span>
    </div>
  );
}

function CharCount({
  current,
  max,
  optimal,
}: {
  current: number;
  max: number;
  optimal?: [number, number];
}) {
  const [lo, hi] = optimal || [0, max];
  const color =
    current >= lo && current <= hi
      ? "text-emerald-600"
      : current > max
        ? "text-red-600"
        : "text-amber-600";
  return (
    <span className={`text-[10px] font-mono ${color}`}>
      {current}/{max}
    </span>
  );
}

const INTENT_LABELS: Record<string, string> = {
  transactional: "交易型",
  commercial: "商业调研",
  informational: "信息型",
};

// ─── Main Component ────────────────────────────────────────────

export function SEOOptimizeDialog({
  open,
  onOpenChange,
  product,
  integrationId,
  onSubmitted,
}: SEOOptimizeDialogProps) {
  const [step, setStep] = useState<DialogStep>("initial");
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);

  // Step 1 data
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [editableKeywords, setEditableKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");

  // Step 2 data
  const [newValues, setNewValues] = useState<Record<string, string> | null>(
    null
  );
  const [generatedAnalysis, setGeneratedAnalysis] =
    useState<SEOAnalysis | null>(null);
  const [handleSuggestion, setHandleSuggestion] = useState("");
  const [jsonLdPreview, setJsonLdPreview] = useState("");
  const [showJsonLd, setShowJsonLd] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // ─── Computed scores ───

  const beforeScore = useMemo<SEOScoreResult | null>(() => {
    if (!product) return null;
    return calculateSEOScore({
      name: product.name,
      body_html: product.body_html,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      tags: product.tags,
      image_url: product.image_url,
      handle: product.handle,
    });
  }, [product]);

  const afterScore = useMemo<SEOScoreResult | null>(() => {
    if (!newValues || !product) return null;
    return calculateSEOScore({
      name: newValues.title || product.name,
      body_html: newValues.body_html,
      meta_title: newValues.meta_title,
      meta_description: newValues.meta_description,
      tags: newValues.tags,
      image_url: product.image_url,
      handle: handleSuggestion || product.handle,
    });
  }, [newValues, product, handleSuggestion]);

  // ─── Reset on close ───

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep("initial");
      setSeoAnalysis(null);
      setEditableKeywords([]);
      setNewValues(null);
      setGeneratedAnalysis(null);
      setHandleSuggestion("");
      setJsonLdPreview("");
      setShowJsonLd(false);
      setShowBreakdown(false);
    }
    onOpenChange(open);
  };

  // ─── Step 1: Analyze ───

  const handleAnalyze = async () => {
    if (!product) return;
    setAnalyzing(true);

    try {
      const topic = [
        `商品名称: ${product.name}`,
        product.body_html ? `当前描述: ${product.body_html.slice(0, 500)}` : "",
        product.meta_title ? `当前 SEO 标题: ${product.meta_title}` : "",
        product.meta_description
          ? `当前 SEO 描述: ${product.meta_description}`
          : "",
        product.tags ? `当前标签: ${product.tags}` : "",
        product.handle ? `当前 URL Handle: ${product.handle}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "seo_analyze", topic }),
      });
      const data = await res.json();
      const result = data.results?.[0] || data.results;

      if (result && typeof result === "object") {
        const analysis: SEOAnalysis = {
          detected_language: result.detected_language || "en",
          primary_keyword: result.primary_keyword || "",
          secondary_keywords: result.secondary_keywords || [],
          long_tail_keywords: result.long_tail_keywords || [],
          search_intent: result.search_intent || "transactional",
          market_strategy: result.market_strategy || "",
          optimization_priorities: result.optimization_priorities || [],
        };
        setSeoAnalysis(analysis);
        setEditableKeywords([
          analysis.primary_keyword,
          ...analysis.secondary_keywords,
          ...analysis.long_tail_keywords,
        ]);
        setStep("analysis");
      }
    } catch {
      toast.error("SEO 分析失败，请重试");
    }
    setAnalyzing(false);
  };

  // ─── Step 2: Generate ───

  const handleGenerate = async () => {
    if (!product) return;
    setGenerating(true);

    try {
      const keywordContext =
        editableKeywords.length > 0
          ? `\n\n确认的目标关键词（必须使用）：${editableKeywords.join(", ")}`
          : "";

      const topic = [
        `商品名称: ${product.name}`,
        product.body_html ? `当前描述: ${product.body_html}` : "",
        product.meta_title ? `当前 SEO 标题: ${product.meta_title}` : "",
        product.meta_description
          ? `当前 SEO 描述: ${product.meta_description}`
          : "",
        product.tags ? `当前标签: ${product.tags}` : "",
        product.handle ? `当前 URL Handle: ${product.handle}` : "",
      ]
        .filter(Boolean)
        .join("\n") + keywordContext;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "seo_apply", topic }),
      });
      const data = await res.json();
      const result = data.results?.[0] || data.results;

      if (result && typeof result === "object") {
        setNewValues({
          title: result.title || product.name,
          body_html: result.body_html || product.body_html || "",
          meta_title: result.meta_title || "",
          meta_description: result.meta_description || "",
          tags: result.tags || product.tags || "",
        });
        setHandleSuggestion(result.handle_suggestion || "");
        setGeneratedAnalysis(result.seo_analysis || null);

        // Extract JSON-LD from body_html for preview
        const jsonLdMatch = (result.body_html || "").match(
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
        );
        if (jsonLdMatch) {
          try {
            const parsed = JSON.parse(jsonLdMatch[1]);
            setJsonLdPreview(JSON.stringify(parsed, null, 2));
          } catch {
            setJsonLdPreview(jsonLdMatch[1]);
          }
        }

        setStep("generation");
      }
    } catch {
      toast.error("AI SEO 生成失败，请重试");
    }
    setGenerating(false);
  };

  // ─── Submit / Apply ───

  const handleSubmitForApproval = async () => {
    if (!product || !newValues) return;
    setSubmitting(true);

    try {
      const oldValues: Record<string, string> = {
        title: product.name,
        body_html: product.body_html || "",
        meta_title: product.meta_title || "",
        meta_description: product.meta_description || "",
        tags: product.tags || "",
      };

      const res = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          task: {
            type: "seo_update",
            entity_id: product.id,
            entity_type: "products",
            title: `SEO 优化: ${product.name}`,
            description:
              "AI 顶级 SEO 专家优化方案 — 含关键词策略、E-E-A-T 信号、结构化数据和 URL 优化",
            payload: {
              old_values: oldValues,
              new_values: {
                title: newValues.title || oldValues.title,
                body_html: newValues.body_html || oldValues.body_html,
                meta_title: newValues.meta_title || oldValues.meta_title,
                meta_description:
                  newValues.meta_description || oldValues.meta_description,
                tags: newValues.tags || oldValues.tags,
                handle: handleSuggestion || undefined,
              },
              shopify_product_id: product.shopify_product_id || null,
              integration_id: integrationId,
              seo_analysis: generatedAnalysis,
            },
            created_by: "ai",
          },
        }),
      });

      if (res.ok) {
        toast.success("SEO 优化方案已提交审批");
        handleOpenChange(false);
        onSubmitted();
      }
    } catch {
      toast.error("提交审批失败，请重试");
    }
    setSubmitting(false);
  };

  const handleQuickApply = async () => {
    if (
      !product ||
      !newValues ||
      !integrationId ||
      !product.shopify_product_id
    )
      return;
    setApplying(true);
    try {
      const res = await fetch("/api/store/seo-quick-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          integration_id: integrationId,
          shopify_product_id: product.shopify_product_id,
          product_id: product.id,
          new_values: {
            title: newValues.title || product.name,
            body_html: newValues.body_html || product.body_html || "",
            meta_title: newValues.meta_title || product.meta_title || "",
            meta_description:
              newValues.meta_description || product.meta_description || "",
            tags: newValues.tags || product.tags || "",
            handle: handleSuggestion || undefined,
          },
        }),
      });
      if (res.ok) {
        toast.success("SEO 已更新到 Shopify");
        handleOpenChange(false);
        onSubmitted();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "SEO 更新失败");
      }
    } catch {
      toast.error("网络错误，SEO 更新失败");
    }
    setApplying(false);
  };

  const canQuickApply = !!integrationId && !!product?.shopify_product_id;

  const handleFieldChange = (field: string, value: string) => {
    if (!newValues) return;
    setNewValues({ ...newValues, [field]: value });
  };

  const addKeyword = () => {
    const kw = newKeywordInput.trim();
    if (kw && !editableKeywords.includes(kw)) {
      setEditableKeywords([...editableKeywords, kw]);
      setNewKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setEditableKeywords(editableKeywords.filter((k) => k !== kw));
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI SEO 专家优化
          </DialogTitle>
          <DialogDescription>
            {product
              ? `为「${product.name}」进行专业 SEO 优化`
              : "选择商品后开始优化"}
          </DialogDescription>
        </DialogHeader>

        {/* ═══ STEP: Initial ═══ */}
        {step === "initial" && (
          <div className="space-y-4">
            {/* Current SEO Score */}
            {beforeScore && (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <ScoreCircle score={beforeScore.overall} label="当前 SEO 分" />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">
                    当前评级：
                    <span
                      className={
                        beforeScore.grade === "A" || beforeScore.grade === "B"
                          ? "text-emerald-600"
                          : beforeScore.grade === "C"
                            ? "text-amber-600"
                            : "text-red-600"
                      }
                    >
                      {beforeScore.grade}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {beforeScore.breakdown
                      .filter((b) => b.issues.length > 0)
                      .slice(0, 3)
                      .map((b) => (
                        <div key={b.category}>
                          {b.category}: {b.issues[0]}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center py-4 gap-3">
              <p className="text-sm text-muted-foreground text-center">
                AI 将先分析关键词策略，再生成优化内容
              </p>
              <Button onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                {analyzing ? "分析中..." : "第一步：分析 SEO"}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: Analysis ═══ */}
        {step === "analysis" && seoAnalysis && (
          <div className="space-y-4">
            {/* Score + Language + Intent */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              {beforeScore && (
                <ScoreCircle
                  score={beforeScore.overall}
                  label="当前分"
                  size="sm"
                />
              )}
              <div className="flex-1 flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Globe className="h-3 w-3" />
                  {seoAnalysis.detected_language === "cn" ? "中文" : "English"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Target className="h-3 w-3" />
                  {INTENT_LABELS[seoAnalysis.search_intent] ||
                    seoAnalysis.search_intent}
                </Badge>
              </div>
            </div>

            {/* Market Strategy */}
            {seoAnalysis.market_strategy && (
              <div className="text-sm text-muted-foreground p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                <TrendingUp className="h-3.5 w-3.5 inline mr-1.5 text-blue-500" />
                {seoAnalysis.market_strategy}
              </div>
            )}

            {/* Editable Keywords */}
            <div className="space-y-2">
              <div className="text-sm font-medium">
                关键词策略（可编辑，确认后用于内容生成）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editableKeywords.map((kw, i) => (
                  <Badge
                    key={kw}
                    variant={i === 0 ? "default" : "secondary"}
                    className="gap-1 pr-1"
                  >
                    {i === 0 && (
                      <span className="text-[9px] opacity-70 mr-0.5">主</span>
                    )}
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="ml-0.5 rounded-full hover:bg-background/50 p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder="添加关键词..."
                  className="h-8 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addKeyword}
                  className="h-8"
                >
                  添加
                </Button>
              </div>
            </div>

            {/* Optimization Priorities */}
            {seoAnalysis.optimization_priorities &&
              seoAnalysis.optimization_priorities.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-sm font-medium">优化优先级</div>
                  <div className="space-y-1">
                    {seoAnalysis.optimization_priorities.map((p, i) => (
                      <div
                        key={i}
                        className="text-sm text-muted-foreground flex gap-2"
                      >
                        <span className="text-amber-500 font-medium">
                          {i + 1}.
                        </span>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* ═══ STEP: Generation ═══ */}
        {step === "generation" && newValues && (
          <div className="space-y-4">
            {/* Score Comparison */}
            {beforeScore && afterScore && (
              <div className="flex items-center justify-center gap-8 p-4 rounded-lg bg-muted/50">
                <ScoreCircle score={beforeScore.overall} label="优化前" />
                <div className="flex flex-col items-center">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600">
                    +{afterScore.overall - beforeScore.overall}
                  </span>
                </div>
                <ScoreCircle score={afterScore.overall} label="优化后" />
              </div>
            )}

            {/* Score Breakdown (collapsible) */}
            {afterScore && (
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full"
              >
                {showBreakdown ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                评分明细
              </button>
            )}
            {showBreakdown && afterScore && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {afterScore.breakdown.map((b) => (
                  <div
                    key={b.category}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <span>{b.category}</span>
                    <span
                      className={`font-mono font-bold ${b.score >= b.maxScore * 0.7 ? "text-emerald-600" : b.score >= b.maxScore * 0.4 ? "text-amber-600" : "text-red-600"}`}
                    >
                      {b.score}/{b.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Keyword Strategy Badge */}
            {generatedAnalysis && (
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Target className="h-2.5 w-2.5" />
                  {generatedAnalysis.primary_keyword}
                </Badge>
                {generatedAnalysis.secondary_keywords?.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {kw}
                  </Badge>
                ))}
              </div>
            )}

            {/* Editable fields with char counts */}
            {[
              {
                key: "title",
                label: "商品标题",
                max: 70,
                optimal: [50, 60] as [number, number],
              },
              {
                key: "meta_title",
                label: "SEO 标题",
                max: 60,
                optimal: [50, 60] as [number, number],
              },
              {
                key: "meta_description",
                label: "SEO 描述",
                max: 160,
                optimal: [140, 160] as [number, number],
              },
              { key: "tags", label: "标签", max: 500 },
            ].map(({ key, label, max, optimal }) => (
              <div
                key={key}
                className="rounded-lg border border-border overflow-hidden"
              >
                <div className="px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>{label}</span>
                  <CharCount
                    current={(newValues[key] || "").length}
                    max={max}
                    optimal={optimal}
                  />
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="p-3">
                    <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                      当前
                    </div>
                    <div className="text-sm text-muted-foreground break-words">
                      {key === "title"
                        ? product?.name || "（空）"
                        : product?.[key as keyof Product]
                          ? String(product[key as keyof Product])
                          : "（空）"}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                      优化后
                    </div>
                    <Input
                      value={newValues[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className="text-sm h-auto py-1 border-emerald-200 focus-visible:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Body HTML - textarea */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground">
                商品描述（含结构化数据）
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="p-3">
                  <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                    当前
                  </div>
                  <div className="text-sm text-muted-foreground break-words max-h-32 overflow-y-auto">
                    {product?.body_html || "（空）"}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] font-medium text-muted-foreground/60 mb-1">
                    优化后
                  </div>
                  <textarea
                    value={newValues.body_html || ""}
                    onChange={(e) =>
                      handleFieldChange("body_html", e.target.value)
                    }
                    className="w-full min-h-[80px] rounded-md border border-emerald-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 resize-y"
                  />
                </div>
              </div>
            </div>

            {/* Handle suggestion */}
            {handleSuggestion && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground">
                  URL Handle 建议
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">
                      /products/
                    </span>
                    <Input
                      value={handleSuggestion}
                      onChange={(e) => setHandleSuggestion(e.target.value)}
                      className="text-sm h-8 font-mono border-emerald-200 focus-visible:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* JSON-LD Preview (collapsible) */}
            {jsonLdPreview && (
              <div className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setShowJsonLd(!showJsonLd)}
                  className="w-full px-3 py-1.5 bg-muted text-xs font-medium text-muted-foreground flex items-center gap-1 hover:bg-muted/80"
                >
                  <Code className="h-3 w-3" />
                  {showJsonLd ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  JSON-LD 结构化数据
                </button>
                {showJsonLd && (
                  <pre className="p-3 text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-40 bg-muted/30">
                    {jsonLdPreview}
                  </pre>
                )}
              </div>
            )}

            {/* Optimization Reasoning */}
            {generatedAnalysis?.optimization_reasoning && (
              <div className="text-xs text-muted-foreground p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                <Sparkles className="h-3 w-3 inline mr-1 text-purple-500" />
                {generatedAnalysis.optimization_reasoning}
              </div>
            )}
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>

          {step === "analysis" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("initial")}
              >
                返回
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                {generating ? "生成中..." : "第二步：生成优化内容"}
              </Button>
            </>
          )}

          {step === "generation" && newValues && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("analysis")}
              >
                返回修改关键词
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                重新生成
              </Button>
              <Button
                variant="default"
                onClick={handleQuickApply}
                disabled={applying || !canQuickApply}
                title={
                  canQuickApply
                    ? "跳过审批，直接推送到 Shopify"
                    : "请先连接 Shopify"
                }
              >
                {applying ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-1.5 h-4 w-4" />
                )}
                {applying ? "应用中..." : "快速应用"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSubmitForApproval}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                {submitting ? "提交中..." : "提交审批"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
