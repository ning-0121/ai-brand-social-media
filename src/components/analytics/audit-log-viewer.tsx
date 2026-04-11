"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Loader2, User, Bot, Server, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string | null;
  source_agent: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  status: string;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
}

const ACTOR_ICONS: Record<string, typeof User> = {
  user: User,
  agent: Bot,
  system: Server,
  cron: Clock,
};

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rolled_back: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActor, setFilterActor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAction, setFilterAction] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "30" });
    if (filterActor !== "all") params.set("actor_type", filterActor);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterAction) params.set("action_type", filterAction);

    fetch(`/api/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => toast.error("加载日志失败"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [filterActor, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">操作日志</CardTitle>
          <Button size="sm" variant="outline" onClick={fetchLogs} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {/* Filters */}
        <div className="flex gap-2 mt-2">
          <Select value={filterActor} onValueChange={(v) => setFilterActor(v || "all")}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue placeholder="操作人" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="user">用户</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="cron">定时</SelectItem>
              <SelectItem value="system">系统</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "all")}>
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="partial">部分</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="搜索操作类型..."
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="h-8 text-xs flex-1"
          />
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            暂无操作日志
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => {
              const ActorIcon = ACTOR_ICONS[log.actor_type] || Server;

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-accent/30 transition-colors"
                >
                  <ActorIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">
                        {log.action_type}
                      </span>
                      {log.source_agent && (
                        <Badge variant="outline" className="text-[10px]">
                          {log.source_agent}
                        </Badge>
                      )}
                    </div>
                    {log.target_type && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {log.target_type}
                        {log.target_id && `:${log.target_id.slice(0, 8)}`}
                        {log.error && (
                          <span className="text-red-500 ml-2">{log.error.slice(0, 60)}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] shrink-0", STATUS_COLORS[log.status])}
                  >
                    {log.status === "success" ? "成功" : log.status === "failed" ? "失败" : log.status}
                  </Badge>
                  <div className="text-[10px] text-muted-foreground/60 shrink-0 w-16 text-right">
                    {log.duration_ms ? `${log.duration_ms}ms` : ""}
                  </div>
                  <div className="text-[10px] text-muted-foreground/60 shrink-0 w-14 text-right">
                    {new Date(log.created_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
