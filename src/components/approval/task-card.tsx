"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { DiffView } from "./diff-view";
import {
  APPROVAL_TYPE_LABELS,
  type ApprovalTask,
} from "@/lib/approval-types";
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Package,
  FileText,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, typeof Sparkles> = {
  seo_update: Sparkles,
  product_edit: ShoppingBag,
  price_update: DollarSign,
  inventory_update: Package,
  content_publish: FileText,
  social_post: Share2,
};

interface TaskCardProps {
  task: ApprovalTask;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
}

export function TaskCard({ task, onApprove, onReject, onRetry }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const Icon = TYPE_ICONS[task.type] || FileText;
  const hasOldNew =
    task.payload.old_values && task.payload.new_values;

  const handleAction = async (
    action: "approve" | "reject" | "retry",
    handler: (id: string) => Promise<void>
  ) => {
    setLoading(action);
    try {
      await handler(task.id);
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-lg shrink-0",
            task.type === "seo_update"
              ? "bg-purple-500/10 text-purple-600"
              : task.type === "price_update"
                ? "bg-amber-500/10 text-amber-600"
                : "bg-blue-500/10 text-blue-600"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{task.title}</span>
            <StatusBadge status={task.status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{APPROVAL_TYPE_LABELS[task.type] || task.type}</span>
            <span>{formatDate(task.created_at)}</span>
            {task.created_by === "ai" && (
              <span className="text-purple-500">AI 生成</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction("reject", onReject);
                }}
                disabled={loading !== null}
              >
                {loading === "reject" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">拒绝</span>
              </Button>
              <Button
                size="sm"
                className="h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction("approve", onApprove);
                }}
                disabled={loading !== null}
              >
                {loading === "approve" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span className="ml-1">批准执行</span>
              </Button>
            </>
          )}
          {task.status === "failed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={(e) => {
                e.stopPropagation();
                handleAction("retry", onRetry);
              }}
              disabled={loading !== null}
            >
              {loading === "retry" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1">重试</span>
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/10">
          {task.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {task.description}
            </p>
          )}

          {hasOldNew && (
            <DiffView
              oldValues={task.payload.old_values as Record<string, unknown>}
              newValues={task.payload.new_values as Record<string, unknown>}
            />
          )}

          {task.execution_result && (
            <div className="mt-3 rounded-lg border border-border p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                执行结果
              </div>
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap">
                {JSON.stringify(task.execution_result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
