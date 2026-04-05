"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AgentAvatar } from "@/components/workflow/agent-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  XCircle,
  ArrowLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowInstance, WorkflowTask } from "@/lib/agent-types";

const TASK_STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground/30", label: "等待" },
  queued: { icon: Clock, color: "text-muted-foreground", label: "排队" },
  running: { icon: Loader2, color: "text-primary", label: "执行中" },
  awaiting_approval: { icon: Clock, color: "text-amber-500", label: "待审批" },
  completed: { icon: CheckCircle2, color: "text-emerald-500", label: "已完成" },
  failed: { icon: XCircle, color: "text-destructive", label: "失败" },
  skipped: { icon: Circle, color: "text-muted-foreground/50", label: "跳过" },
  cancelled: { icon: X, color: "text-muted-foreground/50", label: "取消" },
};

export default function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowInstance | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [progress, setProgress] = useState(0);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/workflows/${params.id}`);
      const data = await res.json();
      setWorkflow(data.workflow);
      setTasks(data.tasks || []);
      setProgress(data.progress || 0);
    } catch (err) {
      console.error(err);
    }
  }, [params.id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleApprove = async (task: WorkflowTask) => {
    if (!task.approval_task_id) {
      console.error("No approval_task_id on task", task.id);
      return;
    }
    setActionLoading(task.id);
    try {
      const res = await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id: task.approval_task_id }),
      });
      const data = await res.json();
      console.log("Approve result:", data);
    } catch (err) {
      console.error("Approve failed:", err);
    }
    setActionLoading(null);
    await loadData();
  };

  const handleReject = async (task: WorkflowTask) => {
    if (!task.approval_task_id) return;
    setActionLoading(task.id);
    try {
      await fetch("/api/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", id: task.approval_task_id }),
      });
    } catch (err) {
      console.error("Reject failed:", err);
    }
    setActionLoading(null);
    await loadData();
  };

  if (!workflow) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/mission-control")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{workflow.name}</h1>
          <p className="text-xs text-muted-foreground">
            {workflow.status === "completed"
              ? "工作流已完成"
              : `进度 ${progress}% — ${tasks.filter((t) => t.status === "completed").length}/${tasks.length} 步`}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            workflow.status === "active" && "bg-emerald-500/10 text-emerald-600",
            workflow.status === "completed" && "bg-blue-500/10 text-blue-600",
            workflow.status === "failed" && "bg-destructive/10 text-destructive"
          )}
        >
          {workflow.status === "active" ? "运行中" : workflow.status === "completed" ? "已完成" : workflow.status}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            workflow.status === "completed" ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {tasks.map((task, idx) => {
          const config = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.pending;
          const StatusIcon = config.icon;
          const isExpanded = expandedTask === task.id;
          const isLast = idx === tasks.length - 1;

          return (
            <div key={task.id} className="flex gap-4">
              {/* Timeline line + icon */}
              <div className="flex flex-col items-center">
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2", config.color,
                  task.status === "completed" && "border-emerald-500 bg-emerald-500/10",
                  task.status === "running" && "border-primary bg-primary/10",
                  task.status === "awaiting_approval" && "border-amber-500 bg-amber-500/10",
                  task.status === "failed" && "border-destructive bg-destructive/10",
                  !["completed", "running", "awaiting_approval", "failed"].includes(task.status) && "border-border"
                )}>
                  <StatusIcon className={cn("h-4 w-4", config.color, task.status === "running" && "animate-spin")} />
                </div>
                {!isLast && (
                  <div className={cn("w-0.5 flex-1 min-h-[2rem]",
                    task.status === "completed" ? "bg-emerald-500/30" : "bg-border"
                  )} />
                )}
              </div>

              {/* Task content */}
              <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
                <Card
                  className={cn("cursor-pointer transition-shadow hover:shadow-sm",
                    task.status === "awaiting_approval" && "border-amber-500/30 shadow-amber-500/5"
                  )}
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  <CardContent className="p-3">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <AgentAvatar agentName={task.agent_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{task.title}</div>
                        <div className="text-[10px] text-muted-foreground">{task.description}</div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0",
                        task.status === "completed" && "bg-emerald-500/10 text-emerald-600",
                        task.status === "running" && "bg-primary/10 text-primary",
                        task.status === "awaiting_approval" && "bg-amber-500/10 text-amber-600",
                        task.status === "failed" && "bg-destructive/10 text-destructive"
                      )}>
                        {config.label}
                      </Badge>
                    </div>

                    {/* Approval buttons */}
                    {task.status === "awaiting_approval" && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          disabled={actionLoading === task.id}
                          onClick={(e) => { e.stopPropagation(); handleApprove(task); }}
                        >
                          {actionLoading === task.id ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          {actionLoading === task.id ? "执行中..." : "批准执行"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive"
                          disabled={actionLoading === task.id}
                          onClick={(e) => { e.stopPropagation(); handleReject(task); }}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                          拒绝
                        </Button>
                      </div>
                    )}

                    {/* Output preview (expanded) */}
                    {isExpanded && task.output_data && (
                      <div className="mt-3 rounded-lg bg-muted/50 p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Agent 产出</div>
                        <pre className="text-xs text-foreground/80 whitespace-pre-wrap overflow-auto max-h-60">
                          {JSON.stringify(task.output_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {isExpanded && task.error_message && (
                      <div className="mt-3 rounded-lg bg-destructive/5 p-3 text-xs text-destructive">
                        {task.error_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
