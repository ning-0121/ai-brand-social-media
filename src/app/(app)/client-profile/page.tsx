"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon, Mic, Check, X, Sparkles, Lock, Unlock, ArrowRight,
  CheckCircle2, SkipForward, Loader2, FileText, Target, Brain, Store, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTask {
  id: string;
  task_key: string;
  display_order: number;
  title: string;
  description: string;
  task_type: string;
  estimated_seconds: number;
  unlocks_feature: string | null;
  input_schema: Record<string, unknown>;
  status: string;
}

interface Inference {
  id: string;
  dimension: string;
  source: string;
  inferred_value: Record<string, unknown>;
  confidence: number;
  confirmed: boolean;
  rejected: boolean;
  created_at: string;
}

interface Completion {
  percentage: number;
  completed_dimensions: string[];
  missing_dimensions: string[];
  unlocked_features: string[];
}

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  image_upload: ImageIcon,
  voice_note: Mic,
  text_input: FileText,
  single_select: Target,
  multi_select: Target,
  shopify_sync: Store,
};

const FEATURE_LABELS: Record<string, string> = {
  basic_skills: "基础 Skill",
  weekly_plan_generation: "周计划生成",
  ad_creative_brief: "广告创意 Brief",
  landing_page: "承接页生成",
  auto_executed_workflows: "自动执行工作流",
  full_autonomous_mode: "全自动模式",
};

export default function ClientProfilePage() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [inferences, setInferences] = useState<Inference[]>([]);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [activeTask, setActiveTask] = useState<OnboardingTask | null>(null);
  const [taskInput, setTaskInput] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const res = await fetch("/api/client-profile?action=overview");
    const data = await res.json();
    setTasks(data.tasks || []);
    setInferences(data.pending_inferences || []);
    setCompletion(data.completion);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitTask = async () => {
    if (!activeTask) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/client-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit_task",
          task_key: activeTask.task_key,
          input_data: taskInput,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert("提交失败: " + data.error);
      } else {
        setActiveTask(null);
        setTaskInput({});
        await loadData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const skipTask = async (taskKey: string) => {
    await fetch("/api/client-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "skip_task", task_key: taskKey }),
    });
    await loadData();
  };

  const confirmInference = async (inferenceId: string) => {
    await fetch("/api/client-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_inference", inference_id: inferenceId }),
    });
    await loadData();
  };

  const rejectInference = async (inferenceId: string) => {
    await fetch("/api/client-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject_inference", inference_id: inferenceId }),
    });
    await loadData();
  };

  const runShopifyInfer = async () => {
    setSubmitting(true);
    await fetch("/api/client-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run_shopify_inference" }),
    });
    await loadData();
    setSubmitting(false);
  };

  if (loading) {
    return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  }

  const pendingTasks = tasks.filter(t => t.status === "pending");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const pct = completion?.percentage || 0;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <PageHeader
        title="客户画像"
        description="碎片化 + AI 推理。每次 30 秒，随时可继续。你给的越多，AI 决策越精准"
      />

      {/* Completion Progress */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/40">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                画像完整度 <span className="text-2xl font-bold text-indigo-600 ml-2">{pct}%</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                完成度决定 AI 能做多自主的决策
              </p>
            </div>
          </div>
          <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {["basic_skills", "weekly_plan_generation", "ad_creative_brief", "landing_page", "auto_executed_workflows", "full_autonomous_mode"].map(f => {
              const unlocked = completion?.unlocked_features.includes(f);
              return (
                <Badge key={f} variant={unlocked ? "default" : "outline"} className={cn(
                  "gap-1",
                  unlocked ? "bg-indigo-600 hover:bg-indigo-700" : "opacity-60"
                )}>
                  {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {FEATURE_LABELS[f] || f}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Pending Inferences — need user confirmation */}
      {inferences.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-lg">AI 推理了 {inferences.length} 个信号，请确认</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              每个都是从你刚才提供的内容里推出的。点 ✓ 接受，✕ 拒绝。拒绝的不会影响后续决策
            </p>
            <div className="space-y-2">
              {inferences.map(inf => (
                <div key={inf.id} className="bg-white rounded-lg border p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{inf.dimension}</Badge>
                      <span className="text-xs text-muted-foreground">
                        置信度 {Math.round((inf.confidence || 0) * 100)}% · 来源 {inf.source}
                      </span>
                    </div>
                    <pre className="text-xs bg-muted/40 p-2 rounded whitespace-pre-wrap break-words">
                      {JSON.stringify(inf.inferred_value, null, 2).slice(0, 400)}
                    </pre>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-green-200 hover:bg-green-50" onClick={() => confirmInference(inf.id)}>
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-red-200 hover:bg-red-50" onClick={() => rejectInference(inf.id)}>
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shopify Auto-Infer */}
      <Card>
        <CardContent className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">从 Shopify 自动推理</h3>
              <p className="text-xs text-muted-foreground">从你的店铺价格、折扣、商品描述推出运营风格</p>
            </div>
          </div>
          <Button onClick={runShopifyInfer} disabled={submitting} size="sm" variant="outline">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Zap className="w-4 h-4 mr-1" />}
            扫描推理
          </Button>
        </CardContent>
      </Card>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            待完成任务
            <Badge variant="secondary">{pendingTasks.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTasks.map(task => {
              const Icon = TASK_ICONS[task.task_type] || FileText;
              return (
                <Card key={task.id} className="hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setActiveTask(task)}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        ~{task.estimated_seconds}s
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold">{task.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    </div>
                    {task.unlocks_feature && (
                      <div className="text-xs text-indigo-600 flex items-center gap-1 pt-2 border-t">
                        <Unlock className="w-3 h-3" />
                        完成后解锁：{task.unlocks_feature}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            已完成 <Badge variant="default">{completedTasks.length}</Badge>
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {completedTasks.map(task => (
                  <div key={task.id} className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{task.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">已完成</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Task Dialog — inline (simpler) */}
      {activeTask && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setActiveTask(null)}>
          <Card className="max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{activeTask.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{activeTask.description}</p>
              </div>

              {/* Input by type */}
              {activeTask.task_type === "image_upload" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">图片 URL（暂不支持直接上传，先粘贴 URL）</label>
                  <Input
                    placeholder="https://cdn.shopify.com/... 或任何图片链接"
                    value={(taskInput.image_url as string) || ""}
                    onChange={(e) => setTaskInput({ ...taskInput, image_url: e.target.value })}
                  />
                  <Textarea
                    placeholder="上下文（可选）：比如「这是我们的爆款连衣裙」"
                    value={(taskInput.context as string) || ""}
                    onChange={(e) => setTaskInput({ ...taskInput, context: e.target.value })}
                  />
                </div>
              )}

              {(activeTask.task_type === "voice_note" || activeTask.task_type === "text_input") && (
                <Textarea
                  placeholder={(activeTask.input_schema as { placeholder?: string })?.placeholder || "写下你的想法..."}
                  value={(taskInput.text as string) || ""}
                  onChange={(e) => setTaskInput({ ...taskInput, text: e.target.value })}
                  rows={5}
                />
              )}

              {activeTask.task_type === "single_select" && (
                <div className="space-y-2">
                  {((activeTask.input_schema as { options?: Array<{ value: string; label: string; desc?: string }> })?.options || []).map(opt => (
                    <label key={opt.value} className={cn(
                      "block p-3 border rounded-lg cursor-pointer transition-colors",
                      taskInput.value === opt.value ? "border-primary bg-primary/5" : "hover:border-primary/40"
                    )}>
                      <input
                        type="radio"
                        name="stance"
                        value={opt.value}
                        checked={taskInput.value === opt.value}
                        onChange={(e) => setTaskInput({ ...taskInput, value: e.target.value })}
                        className="sr-only"
                      />
                      <div className="font-medium">{opt.label}</div>
                      {opt.desc && <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => skipTask(activeTask.task_key)}>
                  <SkipForward className="w-4 h-4 mr-1" />
                  跳过
                </Button>
                <Button variant="outline" onClick={() => setActiveTask(null)}>取消</Button>
                <Button onClick={submitTask} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowRight className="w-4 h-4 mr-1" />}
                  提交 & 让 AI 推理
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
