"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentAvatar } from "./agent-avatar";
import { Pause, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowInstance, WorkflowTask } from "@/lib/agent-types";

interface WorkflowCardProps {
  workflow: WorkflowInstance;
  tasks: WorkflowTask[];
  onView: (id: string) => void;
  onPause?: (id: string) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "运行中", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  paused: { label: "已暂停", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "已完成", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  failed: { label: "失败", color: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "已取消", color: "bg-muted text-muted-foreground border-border" },
};

export function WorkflowCard({ workflow, tasks, onView, onPause }: WorkflowCardProps) {
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const currentTask = tasks.find(
    (t) => t.status === "running" || t.status === "awaiting_approval"
  );
  const statusInfo = STATUS_MAP[workflow.status] || STATUS_MAP.active;

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{workflow.name}</h3>
            <Badge variant="outline" className={cn("text-[10px]", statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {completedCount}/{tasks.length} 步
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              workflow.status === "completed" ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current task */}
        {currentTask && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
            <AgentAvatar
              agentName={currentTask.agent_name}
              size="sm"
              status={currentTask.status === "running" ? "busy" : "idle"}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{currentTask.title}</div>
              <div className="text-[10px] text-muted-foreground">
                {currentTask.status === "awaiting_approval" ? "等待审批..." : "执行中..."}
              </div>
            </div>
            {currentTask.status === "awaiting_approval" && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse">
                需审批
              </Badge>
            )}
          </div>
        )}

        {/* Agent icons */}
        <div className="flex items-center gap-1">
          {tasks.map((task) => (
            <AgentAvatar
              key={task.id}
              agentName={task.agent_name}
              size="sm"
              status={
                task.status === "completed"
                  ? "done"
                  : task.status === "running"
                    ? "busy"
                    : task.status === "failed"
                      ? "error"
                      : "idle"
              }
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => onView(workflow.id)}>
            <Eye className="mr-1.5 h-3 w-3" />
            查看详情
          </Button>
          {workflow.status === "active" && onPause && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onPause(workflow.id)}>
              <Pause className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
