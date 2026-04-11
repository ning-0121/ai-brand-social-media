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
import { Loader2, Sparkles, TrendingUp, AlertTriangle, Lightbulb, Target } from "lucide-react";
import { toast } from "sonner";

interface TrendAnalysisResult {
  market_summary: string;
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  hot_categories: string[];
  predicted_trend: string;
}

interface AITrendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: { name: string; category: string; sales_volume: number; growth_rate: number; trend: string }[];
  currentCategory?: string;
}

export function AITrendDialog({ open, onOpenChange, products, currentCategory }: AITrendDialogProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TrendAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setResult(null);
    try {
      const summary = products.slice(0, 10).map((p) =>
        `${p.name} (${p.category}): 销量${p.sales_volume}, 增长${p.growth_rate}%, 趋势${p.trend}`
      ).join("\n");

      const topic = `${currentCategory ? `品类焦点: ${currentCategory}\n` : ""}热门产品数据:\n${summary}\n\n请分析当前市场趋势，找出机会和风险。`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "trend_analysis", topic }),
      });
      const data = await res.json();
      const analysis = data.results?.[0] || data.results;
      if (analysis) setResult(analysis as TrendAnalysisResult);
    } catch {
      toast.error("趋势分析失败");
    }
    setAnalyzing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            AI 市场趋势分析
          </DialogTitle>
          <DialogDescription>
            {currentCategory ? `分析「${currentCategory}」品类的市场趋势` : "分析当前热门产品的市场趋势"}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              AI 将基于 {products.length} 个热门产品数据，分析市场趋势、机会和风险
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {analyzing ? "分析中..." : "开始分析"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium mb-1">市场概况</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.market_summary}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <TrendingUp className="h-4 w-4" /> 市场机会
              </div>
              {result.opportunities.map((o, i) => (
                <div key={i} className="text-xs bg-emerald-500/5 rounded px-2.5 py-1.5 text-muted-foreground">{o}</div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
                <AlertTriangle className="h-4 w-4" /> 潜在风险
              </div>
              {result.threats.map((t, i) => (
                <div key={i} className="text-xs bg-amber-500/5 rounded px-2.5 py-1.5 text-muted-foreground">{t}</div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
                <Lightbulb className="h-4 w-4" /> 行动建议
              </div>
              {result.recommendations.map((r, i) => (
                <div key={i} className="text-xs bg-blue-500/5 rounded px-2.5 py-1.5 text-muted-foreground">{r}</div>
              ))}
            </div>

            {result.hot_categories?.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target className="h-3.5 w-3.5" /> 值得关注的品类
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.hot_categories.map((c, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border p-3">
              <div className="text-xs font-medium text-muted-foreground">30天趋势预测</div>
              <p className="text-sm mt-1">{result.predicted_trend}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          {result && (
            <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              重新分析
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
