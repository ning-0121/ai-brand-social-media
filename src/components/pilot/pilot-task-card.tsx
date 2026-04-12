"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, SkipForward, Play } from "lucide-react";

interface PilotTask {
  id: string;
  day_number: number;
  role_type: string;
  module_name: string;
  task_title: string;
  expected_result: string | null;
  actual_result: string | null;
  status: string;
  blocker: string | null;
  time_spent_minutes: number | null;
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "待开始" },
  in_progress: { icon: Play, color: "text-blue-500", label: "进行中" },
  completed: { icon: CheckCircle2, color: "text-emerald-500", label: "已完成" },
  blocked: { icon: AlertTriangle, color: "text-red-500", label: "阻塞" },
  skipped: { icon: SkipForward, color: "text-muted-foreground", label: "跳过" },
};

const ROLE_LABELS: Record<string, string> = {
  owner: "老板",
  operator: "运营",
  designer: "设计",
};

export function PilotTaskCard({
  task,
  onStatusChange,
}: {
  task: PilotTask;
  onStatusChange: (taskId: string, status: string) => void;
}) {
  const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
      <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{task.task_title}</span>
          <Badge variant="outline" className="text-[10px]">
            Day {task.day_number}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {ROLE_LABELS[task.role_type] || task.role_type}
          </Badge>
        </div>
        {task.expected_result && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            预期: {task.expected_result}
          </p>
        )}
        {task.blocker && (
          <p className="text-xs text-red-500 mt-0.5">
            阻塞: {task.blocker}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {task.time_spent_minutes && (
          <span className="text-[10px] text-muted-foreground">
            {task.time_spent_minutes}min
          </span>
        )}
        {task.status === "pending" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStatusChange(task.id, "in_progress")}>
            开始
          </Button>
        )}
        {task.status === "in_progress" && (
          <Button size="sm" className="h-7 text-xs" onClick={() => onStatusChange(task.id, "completed")}>
            完成
          </Button>
        )}
      </div>
    </div>
  );
}
