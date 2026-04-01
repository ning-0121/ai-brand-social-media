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
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Shield, Crosshair, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompetitorAnalysisResult {
  market_position: string;
  competitor_insights: { name: string; insight: string; threat_level: string }[];
  gaps: string[];
  strategy_suggestions: string[];
  differentiation_points: string[];
}

interface AICompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitors: { name: string; platform: string; followers: number; avg_engagement: number; growth_rate: number; top_category: string }[];
}

export function AICompetitorDialog({ open, onOpenChange, competitors }: AICompetitorDialogProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CompetitorAnalysisResult | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setResult(null);
    try {
      const summary = competitors.map((c) =>
        `${c.name} (${c.platform}): 粉丝${c.followers}, 互动率${c.avg_engagement}%, 增长${c.growth_rate}%, 品类${c.top_category}`
      ).join("\n");

      const topic = `竞品列表:\n${summary}\n\n请分析竞争格局，找出市场空白和差异化机会。`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: "competitor_analysis", topic }),
      });
      const data = await res.json();
      const analysis = data.results?.[0] || data.results;
      if (analysis) setResult(analysis as CompetitorAnalysisResult);
    } catch (err) {
      console.error("竞品分析失败:", err);
    }
    setAnalyzing(false);
  };

  const threatColor = (level: string) => {
    if (level === "high") return "bg-destructive/10 text-destructive border-destructive/20";
    if (level === "medium") return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            AI 竞品分析
          </DialogTitle>
          <DialogDescription>
            基于 {competitors.length} 个竞品数据的全面分析
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <p className="text-sm text-muted-foreground text-center">
              AI 将分析所有竞品的市场表现，找出竞争格局和差异化机会
            </p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              {analyzing ? "分析中..." : "开始竞品分析"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium mb-1">市场格局</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.market_position}</p>
            </div>

            {/* Competitor insights */}
            {result.competitor_insights?.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">竞品洞察</div>
                {result.competitor_insights.map((ci, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ci.name}</span>
                          <Badge variant="outline" className={cn("text-[10px]", threatColor(ci.threat_level))}>
                            {ci.threat_level === "high" ? "高威胁" : ci.threat_level === "medium" ? "中等" : "低威胁"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{ci.insight}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Market gaps */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Crosshair className="h-4 w-4" /> 市场空白
              </div>
              {result.gaps.map((g, i) => (
                <div key={i} className="text-xs bg-emerald-500/5 rounded px-2.5 py-1.5 text-muted-foreground">{g}</div>
              ))}
            </div>

            {/* Strategy suggestions */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
                <Zap className="h-4 w-4" /> 策略建议
              </div>
              {result.strategy_suggestions.map((s, i) => (
                <div key={i} className="text-xs bg-blue-500/5 rounded px-2.5 py-1.5 text-muted-foreground">{s}</div>
              ))}
            </div>

            {/* Differentiation */}
            {result.differentiation_points?.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">差异化切入点</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.differentiation_points.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </div>
            )}
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
