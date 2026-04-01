"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfluencerInfo {
  id: string;
  name: string;
  platform: string;
  followers: number;
  engagement_rate: number;
  category: string;
  price_min: number;
  price_max: number;
}

interface AnalysisResult {
  match_score: number;
  strengths: string[];
  risks: string[];
  recommendation: string;
  estimated_roi: string;
  suggested_content_types: string[];
  budget_suggestion: string;
}

interface AIAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  influencer: InfluencerInfo | null;
  onScoreUpdate?: (id: string, score: number, analysis: AnalysisResult | object) => void;
}

export function AIAnalysisDialog({
  open,
  onOpenChange,
  influencer,
  onScoreUpdate,
}: AIAnalysisDialogProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!influencer) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const topic = `达人信息：
- 名称: ${influencer.name}
- 平台: ${influencer.platform}
- 粉丝数: ${influencer.followers.toLocaleString()}
- 互动率: ${influencer.engagement_rate}%
- 品类: ${influencer.category}
- 报价: ¥${influencer.price_min}-¥${influencer.price_max}

请分析该达人与品牌的匹配度。`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "influencer_analysis", topic }),
      });
      const data = await res.json();
      const analysis = data.results?.[0] || data.results;
      if (analysis && typeof analysis === "object") {
        setResult(analysis as AnalysisResult);
        onScoreUpdate?.(influencer.id, analysis.match_score || 0, analysis);
      }
    } catch (err) {
      console.error("AI 分析失败:", err);
    }
    setAnalyzing(false);
  };

  const scoreColor = (score: number) =>
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI 达人匹配分析
          </DialogTitle>
          <DialogDescription>
            {influencer ? `分析「${influencer.name}」与品牌的匹配度` : ""}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              AI 将从粉丝画像、互动质量、品类匹配度、性价比等维度分析该达人
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              {analyzing ? "AI 分析中..." : "开始分析"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score ring */}
            <div className="flex items-center justify-center">
              <div className="relative flex items-center justify-center">
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    strokeDashoffset={2 * Math.PI * 42 * (1 - result.match_score / 100)}
                    className={cn("transition-all duration-700", scoreColor(result.match_score))}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={cn("text-2xl font-bold tabular-nums", scoreColor(result.match_score))}>
                    {result.match_score}
                  </span>
                  <span className="text-[10px] text-muted-foreground">匹配度</span>
                </div>
              </div>
            </div>

            {/* Strengths */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                优势
              </div>
              <div className="space-y-1">
                {result.strengths.map((s, i) => (
                  <div key={i} className="text-xs text-muted-foreground bg-emerald-500/5 rounded px-2.5 py-1.5">
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Risks */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                风险
              </div>
              <div className="space-y-1">
                {result.risks.map((r, i) => (
                  <div key={i} className="text-xs text-muted-foreground bg-amber-500/5 rounded px-2.5 py-1.5">
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-sm font-medium">AI 推荐意见</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.recommendation}</p>
            </div>

            {/* ROI & Content Types */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  预估 ROI
                </div>
                <div className="text-lg font-bold mt-1">{result.estimated_roi}x</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs font-medium text-muted-foreground">建议预算</div>
                <div className="text-sm font-medium mt-1">{result.budget_suggestion}</div>
              </div>
            </div>

            {/* Content types */}
            {result.suggested_content_types?.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">适合的内容形式</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.suggested_content_types.map((t, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {result && (
            <Button onClick={handleAnalyze} disabled={analyzing} variant="outline">
              {analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              重新分析
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
