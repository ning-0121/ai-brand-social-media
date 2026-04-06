"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlatformIcon } from "@/components/shared/platform-icon";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentSuggestion } from "@/lib/content-planner";

interface ContentTaskCardProps {
  suggestion: ContentSuggestion;
  onGenerate: (suggestion: ContentSuggestion) => void;
  generating?: boolean;
}

const SOURCE_CONFIG = {
  diagnostic: { label: "诊断建议", icon: AlertCircle, color: "text-orange-500" },
  product_gap: { label: "内容缺口", icon: Package, color: "text-blue-500" },
  trending: { label: "热销推广", icon: TrendingUp, color: "text-green-500" },
};

const PRIORITY_CONFIG = {
  high: { label: "优先", color: "bg-red-500/10 text-red-600 border-red-200" },
  medium: { label: "建议", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  low: { label: "可选", color: "bg-gray-500/10 text-gray-600 border-gray-200" },
};

export function ContentTaskCard({ suggestion, onGenerate, generating }: ContentTaskCardProps) {
  const source = SOURCE_CONFIG[suggestion.source];
  const priority = PRIORITY_CONFIG[suggestion.priority];
  const SourceIcon = source.icon;

  return (
    <Card className="transition-all hover:shadow-sm hover:border-primary/20">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <SourceIcon className={cn("h-4 w-4 mt-0.5 shrink-0", source.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.color)}>
                {priority.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground">{source.label}</span>
            </div>
            <p className="text-sm font-medium leading-tight">{suggestion.title}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>

        {/* Platforms */}
        <div className="flex items-center gap-1.5">
          {suggestion.target_platforms.map((p) => (
            <div key={p} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <PlatformIcon platform={p as any} size="sm" />
              <span className="text-[10px]">{p}</span>
            </div>
          ))}
        </div>

        {/* Effect & Cost */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            {suggestion.expected_effect.slice(0, 30)}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-amber-500" />
            ~${suggestion.estimated_cost.total.toFixed(2)}
          </span>
        </div>

        {/* Action */}
        <Button
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onGenerate(suggestion)}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              AI 生成中...
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3 w-3" />
              生成内容方案
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
