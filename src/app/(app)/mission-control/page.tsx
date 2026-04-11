"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AgentAvatar } from "@/components/workflow/agent-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Rocket,
  Loader2,
  Play,
  Eye,
  Pause,
  Cpu,
} from "lucide-react";
import type { WorkflowTemplate, WorkflowInstance, WorkflowTask } from "@/lib/agent-types";
import { toast } from "sonner";

interface AgentInfo {
  name: string;
  display_name: string;
  icon: string;
  color: string;
}

export default function MissionControlPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [workflowTasks, setWorkflowTasks] = useState<Record<string, WorkflowTask[]>>({});
  const [activity, setActivity] = useState<{ agent_name: string; title: string; status: string; updated_at: string }[]>([]);

  const [launchDialog, setLaunchDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [launchInput, setLaunchInput] = useState({ product_name: "", category: "服饰时尚", platform: "shopify" });
  const [launching, setLaunching] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [agentRes, templateRes, workflowRes, activityRes] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()),
        fetch("/api/workflows?type=templates").then((r) => r.json()),
        fetch("/api/workflows?status=active").then((r) => r.json()),
        fetch("/api/agents?type=activity").then((r) => r.json()),
      ]);
      setAgents(agentRes.agents || []);
      setTemplates(templateRes.templates || []);
      setWorkflows(workflowRes.workflows || []);
      setActivity(activityRes.activity || []);

      // Load tasks for active workflows
      for (const wf of workflowRes.workflows || []) {
        const taskRes = await fetch(`/api/workflows/${wf.id}`).then((r) => r.json());
        setWorkflowTasks((prev) => ({ ...prev, [wf.id]: taskRes.tasks || [] }));
      }
    } catch {
      toast.error("加载数据失败，请刷新页面");
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLaunch = async () => {
    if (!selectedTemplate) return;
    setLaunching(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "launch",
          template_id: selectedTemplate.id,
          input_data: launchInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLaunchDialog(false);
        setLaunchInput({ product_name: "", category: "服饰时尚", platform: "shopify" });
        await loadData();
        router.push(`/mission-control/workflow/${data.workflow.id}`);
      }
    } catch {
      toast.error("启动工作流失败，请重试");
    }
    setLaunching(false);
  };

  const handlePause = async (workflowId: string) => {
    await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause", workflow_id: workflowId }),
    });
    await loadData();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 运营中心"
        description="7 个 AI Agent 协同工作，自动化品牌运营全流程"
      />

      {/* Agent Status Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {agents.map((agent) => (
          <AgentAvatar
            key={agent.name}
            agentName={agent.name}
            size="md"
            status="idle"
            showLabel
          />
        ))}
        {agents.length === 0 && (
          <div className="text-sm text-muted-foreground">加载 Agent 中...</div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Active Workflows (left 60%) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">活跃工作流</h2>
            <Badge variant="secondary" className="text-xs">
              {workflows.length} 个运行中
            </Badge>
          </div>

          {workflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Cpu className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">暂无运行中的工作流</p>
                <p className="text-xs mt-1">从下方选择一个工作流模板开始</p>
              </CardContent>
            </Card>
          ) : (
            workflows.map((wf) => {
              const tasks = workflowTasks[wf.id] || [];
              const completedCount = tasks.filter((t) => t.status === "completed").length;
              const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
              const currentTask = tasks.find(
                (t) => t.status === "running" || t.status === "awaiting_approval"
              );

              return (
                <Card key={wf.id} className="transition-shadow hover:shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{wf.name}</h3>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          运行中
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {completedCount}/{tasks.length} 步
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>

                    {currentTask && (
                      <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
                        <AgentAvatar agentName={currentTask.agent_name} size="sm" status="busy" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{currentTask.title}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {currentTask.status === "awaiting_approval" ? "等待审批" : "执行中..."}
                          </div>
                        </div>
                        {currentTask.status === "awaiting_approval" && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 animate-pulse">
                            需审批
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                        onClick={() => router.push(`/mission-control/workflow/${wf.id}`)}>
                        <Eye className="mr-1.5 h-3 w-3" />
                        查看详情
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => handlePause(wf.id)}>
                        <Pause className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Activity Feed (right 40%) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold">Agent 动态</h2>
          <Card>
            <CardContent className="p-0">
              {activity.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  暂无 Agent 活动
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activity.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3">
                      <AgentAvatar
                        agentName={item.agent_name}
                        size="sm"
                        status={
                          item.status === "completed"
                            ? "done"
                            : item.status === "running"
                              ? "busy"
                              : item.status === "failed"
                                ? "error"
                                : "idle"
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{item.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.status === "completed" ? "已完成" : item.status === "running" ? "执行中" : item.status === "awaiting_approval" ? "待审批" : item.status}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {formatTime(item.updated_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workflow Templates — Quick Launch */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">启动工作流</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => {
                setSelectedTemplate(template);
                setLaunchDialog(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{template.display_name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {(template.steps as unknown[]).length} 步
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {template.estimated_duration}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {templates.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-xs text-muted-foreground">
                请先执行 SQL 创建 Agent 和工作流模板
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Launch Dialog */}
      <Dialog open={launchDialog} onOpenChange={setLaunchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              启动「{selectedTemplate?.display_name}」
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">产品名称</label>
              <Input
                placeholder="例如：春季新款连衣裙"
                value={launchInput.product_name}
                onChange={(e) => setLaunchInput({ ...launchInput, product_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">品类</label>
                <Input
                  placeholder="服饰时尚"
                  value={launchInput.category}
                  onChange={(e) => setLaunchInput({ ...launchInput, category: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">平台</label>
                <Input
                  placeholder="shopify"
                  value={launchInput.platform}
                  onChange={(e) => setLaunchInput({ ...launchInput, platform: e.target.value })}
                />
              </div>
            </div>

            {/* Steps preview */}
            {selectedTemplate && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">工作流步骤</div>
                {(selectedTemplate.steps as { index: number; agent_name: string; title: string; requires_approval: boolean }[]).map((step) => (
                  <div key={step.index} className="flex items-center gap-2 text-xs">
                    <AgentAvatar agentName={step.agent_name} size="sm" />
                    <span className="text-muted-foreground">{step.title}</span>
                    {step.requires_approval && (
                      <Badge variant="outline" className="text-[9px] ml-auto">需审批</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLaunchDialog(false)}>
              取消
            </Button>
            <Button onClick={handleLaunch} disabled={launching || !launchInput.product_name.trim()}>
              {launching ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              {launching ? "启动中..." : "启动工作流"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
