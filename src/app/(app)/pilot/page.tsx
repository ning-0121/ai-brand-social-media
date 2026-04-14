"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PilotTaskCard } from "@/components/pilot/pilot-task-card";
import { Rocket, Play, CheckCircle2, AlertTriangle, BarChart3, MessageSquare, BookOpen, Bug } from "lucide-react";
import { toast } from "sonner";
import type { PilotRun, PilotTask, PilotIssue } from "@/lib/pilot-data";

export default function PilotCenterPage() {
  const [run, setRun] = useState<PilotRun | null>(null);
  const [tasks, setTasks] = useState<PilotTask[]>([]);
  const [issues, setIssues] = useState<PilotIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(() => {
    fetch("/api/pilot")
      .then((r) => r.json())
      .then((data) => {
        setRun(data.run || null);
        setTasks(data.tasks || []);
        setIssues(data.issues || []);
      })
      .catch(() => toast.error("加载试跑数据失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStartRun = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_run", name: "7 天内部试跑" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("试跑已开始，7 天任务已生成");
        fetchData();
      } else {
        toast.error(data.error || "启动失败，请检查控制台");
        console.error("Start run failed:", data);
      }
    } catch (err) {
      toast.error("网络错误，启动失败");
      console.error("Start run error:", err);
    }
    setStarting(false);
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_task", task_id: taskId, status }),
      });
      fetchData();
    } catch {
      toast.error("更新失败");
    }
  };

  const handleCompleteRun = async () => {
    if (!run) return;
    try {
      await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_run", run_id: run.id }),
      });
      toast.success("试跑已结束");
      fetchData();
    } catch {
      toast.error("操作失败");
    }
  };

  if (loading) return null;

  // Calculate KPIs
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const blockedTasks = tasks.filter((t) => t.status === "blocked").length;
  const passRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const openIssues = issues.filter((i) => i.status === "open").length;

  // Today's tasks
  const dayNumber = run
    ? Math.min(7, Math.max(1, Math.ceil((Date.now() - new Date(run.start_date).getTime()) / 86400000) + 1))
    : 1;
  const todayTasks = tasks.filter((t) => t.day_number === dayNumber);

  // Navigation links
  const navLinks = [
    { href: "/pilot/runs", icon: Play, label: "试跑记录", count: null },
    { href: "/pilot/issues", icon: Bug, label: "问题池", count: openIssues },
    { href: "/pilot/feedback", icon: MessageSquare, label: "反馈", count: null },
    { href: "/pilot/metrics", icon: BarChart3, label: "Metrics", count: null },
    { href: "/pilot/sops", icon: BookOpen, label: "SOP", count: null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pilot Center"
        description="内部试跑中心 — 验证系统价值、收集反馈、发现问题"
        actions={
          <div className="flex gap-2">
            {!run ? (
              <Button onClick={handleStartRun} disabled={starting}>
                <Rocket className="mr-1.5 h-4 w-4" />
                {starting ? "启动中..." : "开始 7 天试跑"}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCompleteRun}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                结束试跑
              </Button>
            )}
          </div>
        }
      />

      {/* Quick nav */}
      <div className="flex gap-2 flex-wrap">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
              {link.count !== null && link.count > 0 && (
                <Badge variant="destructive" className="h-4 min-w-4 text-[10px] px-1">
                  {link.count}
                </Badge>
              )}
            </Button>
          </Link>
        ))}
      </div>

      {/* KPI Cards */}
      <KPICardGrid>
        <KPICard
          label={run ? `试跑进度 (Day ${dayNumber}/7)` : "试跑进度"}
          value={run ? `${completedTasks}/${tasks.length}` : "未开始"}
          trend="flat"
          icon="Activity"
        />
        <KPICard
          label="通过率"
          value={passRate}
          trend={passRate >= 70 ? "up" : passRate >= 40 ? "flat" : "down"}
          icon="CheckCircle2"
          format="percent"
        />
        <KPICard
          label="待解决问题"
          value={openIssues}
          trend={openIssues > 5 ? "down" : "flat"}
          icon="AlertTriangle"
        />
        <KPICard
          label="阻塞任务"
          value={blockedTasks}
          trend={blockedTasks > 0 ? "down" : "flat"}
          icon="XCircle"
        />
      </KPICardGrid>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              今日任务
              {run && <Badge variant="outline" className="text-[10px]">Day {dayNumber}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!run ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                点击上方「开始 7 天试跑」生成任务
              </div>
            ) : todayTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                今日无计划任务
              </div>
            ) : (
              <div className="space-y-2">
                {todayTasks.map((task) => (
                  <PilotTaskCard key={task.id} task={task} onStatusChange={handleTaskStatus} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Issues */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                最近问题
              </CardTitle>
              <Link href="/pilot/issues">
                <Button variant="ghost" size="sm" className="text-xs">查看全部</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {issues.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                暂无问题 — 发现问题请前往问题池记录
              </div>
            ) : (
              <div className="space-y-2">
                {issues.slice(0, 5).map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border">
                    <Badge variant={issue.severity === "P0" ? "destructive" : "outline"} className="text-[10px] shrink-0">
                      {issue.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{issue.title}</div>
                      <div className="text-xs text-muted-foreground">{issue.module_name}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{issue.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
