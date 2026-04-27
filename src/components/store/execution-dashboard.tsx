"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { getApprovalTasks } from "@/lib/supabase-approval";
import type { ApprovalTask, ApprovalStatus } from "@/lib/approval-types";
import { APPROVAL_TYPE_LABELS } from "@/lib/approval-types";
import { toast } from "sonner";

// Extended type labels for types not in ApprovalTaskType
const EXTRA_TYPE_LABELS: Record<string, string> = {
  landing_page: "落地页优化",
  detail_page: "详情页优化",
  winback_email: "挽回邮件",
  post: "内容发布",
};

function getTypeLabel(type: string): string {
  if (type in APPROVAL_TYPE_LABELS) {
    return APPROVAL_TYPE_LABELS[type as keyof typeof APPROVAL_TYPE_LABELS];
  }
  return EXTRA_TYPE_LABELS[type] ?? type;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function statusOrder(status: ApprovalStatus): number {
  const order: Record<ApprovalStatus, number> = {
    approved: 0,
    pending: 1,
    executed: 2,
    failed: 3,
    rejected: 4,
  };
  return order[status] ?? 5;
}

function sortTasks(tasks: ApprovalTask[]): ApprovalTask[] {
  return [...tasks].sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface StatCardProps {
  label: string;
  count: number;
  colorClass: string;
  pulse?: boolean;
}

function StatCard({ label, count, colorClass, pulse }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          {pulse && count > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
          )}
        </div>
        <p className={cn("text-2xl font-bold tabular-nums mt-1", colorClass)}>{count}</p>
      </CardContent>
    </Card>
  );
}

interface TaskCardProps {
  task: ApprovalTask;
  onRetry: (id: string) => Promise<void>;
}

function TaskCard({ task, onRetry }: TaskCardProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry(task.id);
    setRetrying(false);
  };

  const newValues = task.payload?.new_values;
  const changedKeys = newValues ? Object.keys(newValues) : [];

  return (
    <Card className="border">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="mt-0.5 flex-shrink-0">
            {task.status === "approved" && (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            )}
            {task.status === "pending" && (
              <Clock className="h-4 w-4 text-gray-400" />
            )}
            {task.status === "executed" && (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            {task.status === "failed" && (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            {task.status === "rejected" && (
              <XCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {getTypeLabel(task.type)}
              </Badge>
              <span className="text-sm font-medium truncate">{task.title}</span>
            </div>

            {/* Time */}
            <p className="text-xs text-muted-foreground">
              {task.status === "executed" && task.reviewed_at
                ? `完成于 ${timeAgo(task.reviewed_at)}`
                : task.status === "approved" && task.reviewed_at
                ? `批准于 ${timeAgo(task.reviewed_at)}`
                : `创建于 ${timeAgo(task.created_at)}`}
            </p>

            {/* Executed: show changed values */}
            {task.status === "executed" && changedKeys.length > 0 && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                已更新：{changedKeys.map((k) => (
                  <span key={k} className="mr-2">
                    <span className="font-medium">{k}</span>
                    {" → "}
                    {String(newValues![k])}
                  </span>
                ))}
              </div>
            )}

            {/* Failed: show error */}
            {task.status === "failed" && (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <p className="text-xs text-destructive">
                  {(task.execution_result?.error as string) ?? "执行失败，请重试"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleRetry}
                  disabled={retrying}
                >
                  {retrying ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-1 h-3 w-3" />
                  )}
                  重试
                </Button>
              </div>
            )}

            {/* Pending: show waiting */}
            {task.status === "pending" && (
              <div className="flex items-center gap-1.5 mt-1">
                <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
                <span className="text-xs text-muted-foreground">等待执行...</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutionDashboard() {
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await getApprovalTasks();
      setTasks(data);
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Poll when there are active tasks
  const hasActive = tasks.some(
    (t) => t.status === "approved" || t.status === "pending"
  );

  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(fetchTasks, 8_000);
    return () => clearInterval(id);
  }, [hasActive, fetchTasks]);

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", id }),
      });
      if (!res.ok) throw new Error();
      toast.success("已重新提交执行");
      await fetchTasks();
    } catch {
      toast.error("重试失败，请稍后再试");
    }
  };

  const today = todayStr();
  const pending = tasks.filter((t) => t.status === "pending").length;
  const running = tasks.filter((t) => t.status === "approved").length;
  const doneToday = tasks.filter(
    (t) => t.status === "executed" && t.updated_at?.startsWith(today)
  ).length;
  const failed = tasks.filter((t) => t.status === "failed").length;

  const sorted = sortTasks(
    tasks.filter((t) => t.status !== "rejected")
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium">正在执行</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={fetchTasks}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          刷新
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="待执行" count={pending} colorClass="text-gray-600 dark:text-gray-400" />
        <StatCard label="正在执行" count={running} colorClass="text-blue-600" pulse />
        <StatCard label="今日完成" count={doneToday} colorClass="text-emerald-600" />
        <StatCard label="执行失败" count={failed} colorClass="text-destructive" />
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              暂无执行任务 — 在 AI 诊断中批准方案后，执行进度将显示在这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} onRetry={handleRetry} />
          ))}
        </div>
      )}
    </div>
  );
}
