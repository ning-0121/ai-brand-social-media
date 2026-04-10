"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Play,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiagnosticFinding } from "@/lib/diagnostic-types";

interface FindingCardProps {
  finding: DiagnosticFinding;
  onExecute?: (findingId: string) => Promise<unknown>;
  onDismiss?: (findingId: string) => Promise<void>;
}

const SEVERITY_CONFIG = {
  critical: {
    label: "紧急",
    color: "bg-red-500/10 text-red-600 border-red-200",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
  high: {
    label: "重要",
    color: "bg-orange-500/10 text-orange-600 border-orange-200",
    icon: AlertCircle,
    iconColor: "text-orange-500",
  },
  medium: {
    label: "建议",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    icon: Info,
    iconColor: "text-yellow-500",
  },
  low: {
    label: "提示",
    color: "bg-gray-500/10 text-gray-600 border-gray-200",
    icon: Info,
    iconColor: "text-gray-400",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  seo: "SEO",
  product: "商品",
  inventory: "库存",
  sales: "销售",
  content: "内容",
};

function GeneratedContentPreview({ content }: { content: Record<string, unknown> }) {
  const c = content;
  const lines: { label: string; value: string }[] = [];

  if (c.title) lines.push({ label: "标题", value: String(c.title) });
  if (c.meta_title) lines.push({ label: "Meta 标题", value: String(c.meta_title) });
  if (c.meta_description) lines.push({ label: "Meta 描述", value: String(c.meta_description) });
  if (c.body) lines.push({ label: "正文", value: String(c.body).slice(0, 200) });
  if (c.body_html && !c.body) lines.push({ label: "描述", value: String(c.body_html).slice(0, 200) });
  if (c.tags) lines.push({ label: "标签", value: String(c.tags) });
  if (c.cta) lines.push({ label: "CTA", value: String(c.cta) });
  if (c.hashtags && Array.isArray(c.hashtags)) lines.push({ label: "话题", value: c.hashtags.join(" ") });

  const actions = c.priority_actions as { title: string; description?: string }[] | undefined;

  if (lines.length === 0 && !actions?.length) {
    // 显示原始 JSON 摘要
    const raw = JSON.stringify(c, null, 2).slice(0, 300);
    return (
      <div className="rounded-md bg-blue-50 border border-blue-100 p-2.5 text-xs">
        <p className="font-medium text-blue-700 mb-1">AI 生成方案:</p>
        <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">{raw}</pre>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-blue-50 border border-blue-100 p-2.5 text-xs space-y-1">
      <p className="font-medium text-blue-700">AI 生成方案:</p>
      {lines.map((l, i) => (
        <p key={i} className="line-clamp-2">
          <span className="text-muted-foreground">{l.label}:</span> {l.value}
        </p>
      ))}
      {actions && actions.length > 0 && (
        <div>
          <span className="text-muted-foreground">行动建议:</span>
          <ul className="list-disc list-inside mt-0.5">
            {actions.slice(0, 3).map((a, i) => (
              <li key={i}>{a.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FindingCard({ finding, onExecute, onDismiss }: FindingCardProps) {
  const [executing, setExecuting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [localStatus, setLocalStatus] = useState(finding.status);
  const [generatedContent, setGeneratedContent] = useState<Record<string, unknown> | null>(
    (finding.execution_ref as Record<string, unknown>)?.generated_content as Record<string, unknown> || null
  );

  const config = SEVERITY_CONFIG[finding.severity];
  const Icon = config.icon;
  const isActionable = finding.recommended_action.action_type !== "info_only";

  const handleExecute = async () => {
    if (!onExecute) return;
    setExecuting(true);
    try {
      const result = await onExecute(finding.id);
      // Only update status if backend actually succeeded
      if (result && typeof result === "object" && "success" in result && result.success) {
        setLocalStatus("in_progress");
        if ("generated_content" in result) {
          setGeneratedContent((result as { generated_content: Record<string, unknown> }).generated_content);
        }
      } else {
        const errorMsg = (result as { error?: string })?.error || "执行失败";
        alert(`执行失败: ${errorMsg}`);
      }
    } catch (err) {
      console.error("执行失败:", err);
      alert("执行失败，请重试");
    }
    setExecuting(false);
  };

  const handleDismiss = async () => {
    if (!onDismiss) return;
    setDismissing(true);
    try {
      await onDismiss(finding.id);
      setLocalStatus("dismissed");
    } catch (err) {
      console.error("忽略失败:", err);
    }
    setDismissing(false);
  };

  if (localStatus === "dismissed") return null;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 transition-colors",
        localStatus === "in_progress" && "bg-blue-50/50 border-blue-200",
        localStatus === "resolved" && "bg-green-50/50 border-green-200 opacity-60"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", config.iconColor)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">{finding.title}</p>
            {finding.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {finding.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
              {config.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {CATEGORY_LABELS[finding.category] || finding.category}
            </Badge>
          </div>
        </div>

        {finding.affected_entities.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            影响 {finding.affected_entities.length} 个{finding.affected_entities[0]?.entity_type === "product" ? "商品" : "项目"}
            {finding.affected_entities.length <= 3 && (
              <>：{finding.affected_entities.map((e) => e.name).join(", ")}</>
            )}
          </p>
        )}

        {localStatus === "open" && isActionable && (
          <div className="flex gap-2 pt-0.5">
            <Button
              size="sm"
              variant="default"
              className="h-6 px-2 text-[11px]"
              onClick={handleExecute}
              disabled={executing}
            >
              {executing ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Play className="mr-1 h-3 w-3" />
              )}
              {finding.recommended_action.display_label}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px] text-muted-foreground"
              onClick={handleDismiss}
              disabled={dismissing}
            >
              <X className="mr-1 h-3 w-3" />
              忽略
            </Button>
          </div>
        )}

        {localStatus === "in_progress" && (
          <div className="space-y-2 pt-1">
            {generatedContent && Object.keys(generatedContent).length > 0 && (
              <GeneratedContentPreview content={generatedContent} />
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-500" />
              <span className="text-[11px] text-blue-600">已提交审批 · 前往审批中心查看</span>
            </div>
          </div>
        )}

        {localStatus === "resolved" && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span className="text-[11px] text-green-600">已解决</span>
          </div>
        )}
      </div>
    </div>
  );
}
