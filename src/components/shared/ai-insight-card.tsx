"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIInsightCardProps {
  title: string;
  description?: string;
  scene: string;
  topic: string;
  autoLoad?: boolean;
  className?: string;
  formatResult?: (result: Record<string, unknown>) => React.ReactNode;
}

// Default result formatter — handles common patterns from AI responses
function DefaultFormatter({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        // Skip internal fields
        if (key === "error") return null;

        // Format label
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        // String value
        if (typeof value === "string") {
          return (
            <div key={key} className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">
                {label}
              </div>
              <p className="text-sm leading-relaxed">{value}</p>
            </div>
          );
        }

        // Array of strings
        if (
          Array.isArray(value) &&
          value.every((v) => typeof v === "string")
        ) {
          return (
            <div key={key} className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                {label}
              </div>
              <div className="space-y-1">
                {(value as string[]).map((item, i) => (
                  <div
                    key={i}
                    className="text-xs bg-muted/50 rounded px-2.5 py-1.5 text-foreground/80"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Array of objects
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
          return (
            <div key={key} className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">
                {label}
              </div>
              {(value as Record<string, unknown>[]).map((item, i) => (
                <div
                  key={i}
                  className="text-xs border border-border rounded-lg p-2.5 space-y-1"
                >
                  {Object.entries(item).map(([k, v]) => (
                    <div key={k}>
                      <span className="font-medium text-muted-foreground">
                        {k}:
                      </span>{" "}
                      <span className="text-foreground/80">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        }

        // Number
        if (typeof value === "number") {
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export function AIInsightCard({
  title,
  description,
  scene,
  topic,
  autoLoad = false,
  className,
  formatResult,
}: AIInsightCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState("");

  const fetchInsight = useCallback(async () => {
    if (!topic) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失败");
      const parsed = data.results?.[0] || data.results;
      if (parsed && typeof parsed === "object") {
        setResult(parsed as Record<string, unknown>);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "分析失败");
    }
    setLoading(false);
  }, [scene, topic]);

  useEffect(() => {
    if (autoLoad && topic) {
      fetchInsight();
    }
  }, [autoLoad, topic, fetchInsight]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-purple-500" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {result && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={fetchInsight}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : result ? (
                <RefreshCw className="mr-1 h-3 w-3" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {loading ? "分析中..." : result ? "刷新" : "AI 分析"}
            </Button>
          </div>
        </div>
        {description && !result && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent>
          {loading && !result && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}

          {error && (
            <div className="text-xs text-destructive bg-destructive/5 rounded p-2">
              {error}
            </div>
          )}

          {result && !loading && (
            <>
              {formatResult ? (
                formatResult(result)
              ) : (
                <DefaultFormatter data={result} />
              )}
              <div className="mt-2 flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="text-[10px] text-purple-500 border-purple-200"
                >
                  AI 生成
                </Badge>
              </div>
            </>
          )}

          {!result && !loading && !error && (
            <p className="text-xs text-muted-foreground py-2">
              点击「AI 分析」获取智能洞察
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
