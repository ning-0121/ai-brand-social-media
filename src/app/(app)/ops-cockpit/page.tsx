"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ActionImpactList } from "@/components/analytics/action-impact-list";
import { WeeklyReportView } from "@/components/analytics/weekly-report-view";
import { AuditLogViewer } from "@/components/analytics/audit-log-viewer";
import { TaskResultRenderer } from "@/components/ops/task-result-renderer";
import { DailyReportPanel } from "@/components/ops/daily-report-panel";
import { AIInspectorPanel } from "@/components/ops/ai-inspector-panel";
import { OutcomesPanel } from "@/components/ops/outcomes-panel";
import {
  Target,
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Play,
  Brain,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DataSyncBar } from "@/components/ops/data-sync-bar";

interface Goal {
  id: string;
  module: string;
  metric: string;
  target_value: number;
  current_value: number;
  baseline_value: number;
  unit: string;
  deadline: string | null;
  status: string;
}

interface DailyTask {
  id: string;
  module: string;
  task_type: string;
  title: string;
  description: string | null;
  auto_executable: boolean;
  execution_status: string;
  execution_result: Record<string, unknown> | null;
  target_product_name: string | null;
  target_platform: string | null;
}

interface WeeklyPlan {
  id: string;
  module: string;
  week_start: string;
  strategy: Record<string, unknown> | null;
  review: Record<string, unknown> | null;
  performance_score: number | null;
  status: string;
}

interface AuditIssue {
  severity: "critical" | "warning" | "info";
  message: string;
  affected_count?: number;
}

interface AuditDimension {
  name: string;
  score: number;
  maxScore: number;
  issues: AuditIssue[];
}

interface StoreAudit {
  overall_score: number;
  grade: string;
  dimensions: AuditDimension[];
  ai_diagnosis: string;
  recommended_phase: string;
  phase_rationale: string;
}

interface ProposedGoal {
  module: string;
  metric: string;
  current_value: number;
  target_value: number;
  unit: string;
  deadline: string;
  rationale: string;
  execution_plan: string;
  estimated_effort: string;
  phase: string;
}

interface GoalProposal {
  audit: StoreAudit;
  current_phase: string;
  phase_description: string;
  proposed_goals: ProposedGoal[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "待执行", color: "text-gray-400", icon: Clock },
  running: { label: "执行中", color: "text-blue-500", icon: Loader2 },
  auto_executed: { label: "已自动执行", color: "text-green-500", icon: CheckCircle2 },
  awaiting_approval: { label: "等审批", color: "text-amber-500", icon: AlertCircle },
  completed: { label: "已完成", color: "text-green-600", icon: CheckCircle2 },
  failed: { label: "失败", color: "text-red-500", icon: AlertCircle },
  skipped: { label: "跳过", color: "text-gray-300", icon: Clock },
};

const METRIC_OPTIONS = [
  { value: "revenue", label: "营收", unit: "元" },
  { value: "orders", label: "订单数", unit: "单" },
  { value: "aov", label: "客单价", unit: "元" },
  { value: "seo_score", label: "平均 SEO 分", unit: "分" },
  { value: "customers", label: "客户数", unit: "人" },
  { value: "published_posts", label: "社媒发布数", unit: "条" },
];

export default function OpsCockpitPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [storePlan, setStorePlan] = useState<WeeklyPlan | null>(null);
  const [socialPlan, setSocialPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingModule, setGeneratingModule] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  // Goal creation
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ module: "store", metric: "revenue", target_value: "", unit: "元", deadline: "" });

  // AI goal proposal
  const [proposing, setProposing] = useState(false);
  const [proposal, setProposal] = useState<GoalProposal | null>(null);

  // 引导流程：tracks what just happened so we can show next-step prompts
  const [guidanceStep, setGuidanceStep] = useState<"idle" | "goals_adopted" | "plan_generated" | "tasks_executed">("idle");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [goalsRes, tasksRes, storePlanRes, socialPlanRes] = await Promise.all([
        fetch("/api/ops-director?type=goals").then(r => r.json()),
        fetch("/api/ops-director?type=daily_tasks").then(r => r.json()),
        fetch("/api/ops-director?type=weekly_plan&module=store").then(r => r.json()),
        fetch("/api/ops-director?type=weekly_plan&module=social").then(r => r.json()),
      ]);
      setGoals(goalsRes.goals || []);
      setTasks(tasksRes.tasks || []);
      setStorePlan(storePlanRes.plan);
      setSocialPlan(socialPlanRes.plan);
    } catch { toast.error("加载数据失败"); }
    setLoading(false);
  };

  // metric 改变时自动设置 unit
  const handleMetricChange = (metric: string) => {
    const opt = METRIC_OPTIONS.find(o => o.value === metric);
    setGoalForm({ ...goalForm, metric, unit: opt?.unit || "" });
  };

  const handleCreateGoal = async () => {
    if (!goalForm.target_value) { toast.error("请输入目标值"); return; }
    try {
      await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_goal", ...goalForm, target_value: parseFloat(goalForm.target_value) }),
      });
      toast.success("目标已创建");
      setShowGoalForm(false);
      setGoalForm({ module: "store", metric: "revenue", target_value: "", unit: "元", deadline: "" });
      fetchAll();
    } catch { toast.error("创建失败"); }
  };

  // AI 诊断建议目标
  const handleProposeGoals = async () => {
    setProposing(true);
    setProposal(null);
    try {
      const res = await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "propose_goals" }),
      });
      const data = await res.json();
      if (data.proposal) {
        setProposal(data.proposal);
      } else {
        toast.error(data.error || "AI 诊断失败");
      }
    } catch { toast.error("AI 诊断失败"); }
    setProposing(false);
  };

  // 采纳 AI 建议的目标
  const handleAdoptGoals = async (goalsToAdopt: ProposedGoal[]) => {
    try {
      await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adopt_goals", goals: goalsToAdopt }),
      });
      toast.success(`已采纳 ${goalsToAdopt.length} 个目标`);
      setProposal(null);
      setGuidanceStep("goals_adopted");
      fetchAll();
    } catch { toast.error("采纳失败"); }
  };

  const handleGeneratePlan = async (module: string) => {
    setGeneratingModule(module);
    try {
      const res = await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_plan", module }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${module === "store" ? "店铺" : "社媒"}周计划已生成`);
        setGuidanceStep("plan_generated");
        setActiveTab("today"); // 自动跳到今日任务
      } else {
        toast.error(`生成失败: ${data.error || "未知错误"}`);
      }
      fetchAll();
    } catch (err) {
      toast.error(`生成失败: ${err instanceof Error ? err.message : "网络错误"}`);
    }
    setGeneratingModule(null);
  };

  const handleExecuteToday = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "execute_today" }),
      });
      const data = await res.json();
      toast.success(`执行完成: ${data.executed || 0} 自动执行, ${data.approval || 0} 等审批, ${data.failed || 0} 失败`);
      setGuidanceStep("tasks_executed");
      fetchAll();
    } catch { toast.error("执行失败"); }
    setExecuting(false);
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 运营驾驶舱"
        description="AI 操盘手：诊断店铺 → 定目标 → 排计划 → 自动执行 → 追踪效果"
        actions={
          <div className="flex gap-2">
            <DailyReportPanel />
            <Button size="sm" variant="outline" onClick={() => handleGeneratePlan("store")} disabled={!!generatingModule}>
              {generatingModule === "store" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              {generatingModule === "store" ? "生成中..." : "生成店铺周计划"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleGeneratePlan("social")} disabled={!!generatingModule}>
              {generatingModule === "social" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              {generatingModule === "social" ? "生成中..." : "生成社媒周计划"}
            </Button>
            <Button size="sm" onClick={handleExecuteToday} disabled={executing}>
              {executing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
              执行今日任务
            </Button>
          </div>
        }
      />

      {/* Shopify data sync status */}
      <DataSyncBar />

      {/* ═══ Task Execution Progress ═══ */}
      {tasks.length > 0 && (() => {
        const done = tasks.filter(t => t.execution_status === "auto_executed" || t.execution_status === "completed").length;
        const failed = tasks.filter(t => t.execution_status === "failed").length;
        const running = tasks.filter(t => t.execution_status === "running").length;
        const pending = tasks.filter(t => t.execution_status === "pending").length;
        const approval = tasks.filter(t => t.execution_status === "awaiting_approval").length;
        const total = tasks.length;
        const progressPct = total > 0 ? Math.round(((done + failed) / total) * 100) : 0;
        // All tasks still pending = likely never executed (credit exhaustion)
        const allPending = pending === total && total > 0;

        return (
          <Card>
            <CardContent className="p-4 space-y-3">
              {allPending && (
                <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <div>
                    <span className="font-medium">任务从未执行</span> — 最常见原因：
                    <span className="font-medium"> OpenRouter 或 Anthropic API 余额不足</span>。
                    请前往 <a href="https://openrouter.ai/credits" target="_blank" rel="noopener" className="underline">openrouter.ai/credits</a> 充值后再点击「执行今日任务」。
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">任务执行进度</span>
                  <span className="text-xs text-muted-foreground">{done + failed}/{total} 已处理</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {done > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />{done} 完成</span>}
                  {running > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />{running} 执行中</span>}
                  {pending > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300" />{pending} 待执行</span>}
                  {approval > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />{approval} 待审批</span>}
                  {failed > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{failed} 失败</span>}
                </div>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                {done > 0 && <div className="h-full bg-green-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />}
                {running > 0 && <div className="h-full bg-blue-500 animate-pulse transition-all" style={{ width: `${(running / total) * 100}%` }} />}
                {approval > 0 && <div className="h-full bg-amber-400 transition-all" style={{ width: `${(approval / total) * 100}%` }} />}
                {failed > 0 && <div className="h-full bg-red-500 transition-all" style={{ width: `${(failed / total) * 100}%` }} />}
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">{progressPct}% 完成</span>
                {pending > 0 && <span className="text-[10px] text-muted-foreground">剩余 {pending} 个任务将自动执行</span>}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* AI 督察 */}
      <AIInspectorPanel />

      {/* 效果回传 */}
      <OutcomesPanel />

      {/* ═══ Main Tabs — 页面核心导航 ═══ */}
      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="today">今日任务 ({tasks.length})</TabsTrigger>
          <TabsTrigger value="goals">运营目标</TabsTrigger>
          <TabsTrigger value="store_plan">店铺周计划</TabsTrigger>
          <TabsTrigger value="social_plan">社媒周计划</TabsTrigger>
          <TabsTrigger value="ai_impact">AI 效果</TabsTrigger>
          <TabsTrigger value="weekly_report">周报</TabsTrigger>
          <TabsTrigger value="audit_logs">操作日志</TabsTrigger>
        </TabsList>

        {/* ═══ Tab: 今日任务 ═══ */}
        <TabsContent value="today" className="space-y-3 mt-4">
          {/* Guidance Banners */}
          {guidanceStep === "plan_generated" && tasks.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 shrink-0">
                  <span className="text-lg font-bold text-blue-600">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">计划已生成，今日有 {tasks.length} 个任务待执行</p>
                  <p className="text-xs text-muted-foreground">点击执行，AI 将自动完成任务（修复 SEO、生成内容等），结果会推送到 Shopify</p>
                </div>
                <Button size="sm" onClick={handleExecuteToday} disabled={executing}>
                  {executing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                  执行今日任务
                </Button>
              </CardContent>
            </Card>
          )}

          {guidanceStep === "tasks_executed" && (
            <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">任务已执行完成</p>
                  <p className="text-xs text-muted-foreground">查看下方执行结果，明天系统会自动继续执行剩余任务。</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setGuidanceStep("idle")}>
                  知道了
                </Button>
              </CardContent>
            </Card>
          )}

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 px-6">
                <p className="text-sm font-semibold mb-5 text-center">今日没有任务 — 按以下步骤启动</p>
                <div className="space-y-4">
                  {[
                    {
                      step: "1",
                      title: "同步店铺数据",
                      desc: "先从上方同步条同步 Shopify 订单，确保 AI 有真实数据可分析",
                      color: "bg-orange-100 text-orange-600",
                    },
                    {
                      step: "2",
                      title: "AI 诊断 → 设定目标",
                      desc: "切换到「运营目标」标签 → 点击「AI 诊断建议目标」→ 采纳目标",
                      color: "bg-purple-100 text-purple-600",
                    },
                    {
                      step: "3",
                      title: "生成本周执行计划",
                      desc: "点击上方「生成店铺周计划」或「生成社媒周计划」，AI 会按目标排任务",
                      color: "bg-blue-100 text-blue-600",
                    },
                    {
                      step: "4",
                      title: "执行今日任务",
                      desc: "点击「执行今日任务」，AI 自动写 SEO、生成内容、推送到 Shopify",
                      color: "bg-green-100 text-green-600",
                    },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.color}`}>
                        {s.step}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("goals")}>
                    <Brain className="mr-1.5 h-3.5 w-3.5" /> 去设定目标
                  </Button>
                  <Button size="sm" onClick={() => handleGeneratePlan("store")} disabled={!!generatingModule}>
                    {generatingModule === "store" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                    生成店铺周计划
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => {
              const cfg = STATUS_CONFIG[task.execution_status] || STATUS_CONFIG.pending;
              const StatusIcon = cfg.icon;
              return (
                <Card key={task.id}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color, task.execution_status === "running" && "animate-spin")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium">{task.title}</span>
                        <Badge variant="outline" className="text-[9px]">{task.module}</Badge>
                        <Badge variant="outline" className="text-[9px]">{task.task_type}</Badge>
                        {task.auto_executable ? (
                          <Badge className="text-[9px] bg-green-100 text-green-700 border-green-200">自动</Badge>
                        ) : (
                          <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">需审批</Badge>
                        )}
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                      {task.target_product_name && <p className="text-[10px] text-muted-foreground">商品: {task.target_product_name}</p>}
                      {/* Show error reason for failed tasks */}
                      {task.execution_status === "failed" && task.execution_result && (
                        <div className="mt-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-1.5 text-[11px] text-red-700">
                          <span className="font-medium">失败原因：</span>
                          {typeof task.execution_result.error === "string"
                            ? task.execution_result.error
                            : typeof task.execution_result.message === "string"
                              ? task.execution_result.message
                              : "AI 调用失败（可能是 API 余额不足，请检查 OpenRouter/Anthropic 账户）"}
                        </div>
                      )}
                      {task.execution_result && task.execution_status !== "failed" && (
                        <div className="mt-2">
                          <TaskResultRenderer
                            taskType={task.task_type}
                            result={task.execution_result}
                            targetProductName={task.target_product_name}
                          />
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.color)}>{cfg.label}</Badge>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ═══ Tab: 运营目标 ═══ */}
        <TabsContent value="goals" className="mt-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">运营目标</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={handleProposeGoals} disabled={proposing}>
                {proposing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Brain className="mr-1 h-3 w-3" />}
                {proposing ? "AI 诊断中..." : "AI 诊断建议目标"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowGoalForm(!showGoalForm)}>
                <Plus className="mr-1 h-3 w-3" /> 手动添加
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* AI Audit + Goal Proposal */}
          {proposal && (
            <div className="rounded-lg border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-4">
              {/* Close button */}
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setProposal(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Audit Score + Phase */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "text-2xl font-bold",
                    proposal.audit.overall_score >= 70 ? "text-emerald-600" : proposal.audit.overall_score >= 40 ? "text-amber-600" : "text-red-600"
                  )}>
                    {proposal.audit.overall_score}
                  </div>
                  <span className="text-[10px] text-muted-foreground">总分/100</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-xs",
                      proposal.audit.recommended_phase === "foundation" ? "bg-red-100 text-red-700 border-red-200"
                      : proposal.audit.recommended_phase === "traffic" ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-green-100 text-green-700 border-green-200"
                    )}>
                      {proposal.current_phase === "foundation" ? "阶段一：修地基"
                       : proposal.current_phase === "traffic" ? "阶段二：引流量"
                       : "阶段三：做转化"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{proposal.audit.grade} 级</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{proposal.phase_description}</p>
                </div>
              </div>

              {/* AI Diagnosis */}
              <div className="rounded-lg bg-white dark:bg-background border p-3">
                <div className="flex items-start gap-2">
                  <Brain className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                  <p className="text-xs">{proposal.audit.ai_diagnosis}</p>
                </div>
              </div>

              {/* Dimension Scores */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">审计维度</p>
                {proposal.audit.dimensions.map((dim) => (
                  <div key={dim.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>{dim.name}</span>
                      <span className={cn("font-mono font-bold",
                        dim.score / dim.maxScore >= 0.7 ? "text-emerald-600" : dim.score / dim.maxScore >= 0.4 ? "text-amber-600" : "text-red-600"
                      )}>
                        {dim.score}/{dim.maxScore}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full",
                          dim.score / dim.maxScore >= 0.7 ? "bg-emerald-500" : dim.score / dim.maxScore >= 0.4 ? "bg-amber-500" : "bg-red-500"
                        )}
                        style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                      />
                    </div>
                    {dim.issues.filter(i => i.severity !== "info").slice(0, 2).map((issue, j) => (
                      <p key={j} className={cn("text-[10px] pl-2",
                        issue.severity === "critical" ? "text-red-600" : "text-amber-600"
                      )}>
                        {issue.severity === "critical" ? "!!" : "!"} {issue.message}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Proposed Goals */}
              {proposal.proposed_goals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">建议目标</p>
                  {proposal.proposed_goals.map((g, i) => (
                    <div key={i} className="rounded-lg bg-white dark:bg-background border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{g.module}</Badge>
                          <span className="text-sm font-medium">
                            {METRIC_OPTIONS.find(o => o.value === g.metric)?.label || g.metric}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {g.current_value} → <span className="font-bold text-foreground">{g.target_value}</span> {g.unit}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">截止 {g.deadline}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{g.rationale}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">{g.execution_plan}</p>
                      <span className="text-[10px] text-muted-foreground">{g.estimated_effort}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setProposal(null)}>
                  暂不采纳
                </Button>
                <Button size="sm" onClick={() => handleAdoptGoals(proposal.proposed_goals)}>
                  <Check className="mr-1 h-3 w-3" />
                  全部采纳 ({proposal.proposed_goals.length} 个目标)
                </Button>
              </div>
            </div>
          )}

          {/* Manual Goal Form */}
          {showGoalForm && (
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="flex gap-2 flex-wrap">
                <Select value={goalForm.module} onValueChange={(v) => v && setGoalForm({ ...goalForm, module: v })}>
                  <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">店铺</SelectItem>
                    <SelectItem value="social">社媒</SelectItem>
                    <SelectItem value="ads">广告</SelectItem>
                    <SelectItem value="overall">整体</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={goalForm.metric} onValueChange={(v) => v && handleMetricChange(v)}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METRIC_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}（{o.unit}）</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="h-8 text-xs w-24" placeholder="目标值" type="number" value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })} />
                <Input className="h-8 text-xs w-16" placeholder="单位" value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} />
                <Input className="h-8 text-xs w-36" type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} />
                <Button size="sm" className="h-8" onClick={handleCreateGoal}>创建</Button>
              </div>
            </div>
          )}

          {/* Existing Goals */}
          {goals.length === 0 && !proposal ? (
            <div className="text-center py-8 space-y-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 mx-auto">
                <span className="text-xl font-bold text-purple-600">1</span>
              </div>
              <p className="text-sm font-medium">第一步：让 AI 诊断你的店铺</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">AI 会全面审计产品数据、SEO、定价、社媒等维度，找出最紧迫的问题，并建议运营目标</p>
              <Button onClick={handleProposeGoals} disabled={proposing}>
                {proposing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Brain className="mr-1.5 h-4 w-4" />}
                {proposing ? "AI 诊断中..." : "开始 AI 店铺诊断"}
              </Button>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = goal.baseline_value !== goal.target_value
                ? Math.min(100, Math.max(0, ((goal.current_value - goal.baseline_value) / (goal.target_value - goal.baseline_value)) * 100))
                : goal.current_value >= goal.target_value ? 100 : 0;
              const metricLabel = METRIC_OPTIONS.find(o => o.value === goal.metric)?.label || goal.metric;
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] shrink-0">{goal.module}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{metricLabel}</span>
                      <span className="text-muted-foreground">{goal.current_value} / {goal.target_value} {goal.unit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-green-500" : progress >= 50 ? "bg-blue-500" : "bg-amber-500")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold tabular-nums w-12 text-right">{Math.round(progress)}%</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

          {/* Guidance after goals adopted */}
          {guidanceStep === "goals_adopted" && (
            <Card className="border-2 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 shrink-0">
                  <span className="text-lg font-bold text-emerald-600">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">目标已设定，下一步：生成执行计划</p>
                  <p className="text-xs text-muted-foreground">AI 会围绕你的目标，为本周每天安排具体的执行任务</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => handleGeneratePlan("store")} disabled={!!generatingModule}>
                    {generatingModule === "store" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    生成店铺周计划
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleGeneratePlan("social")} disabled={!!generatingModule}>
                    {generatingModule === "social" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    生成社媒周计划
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Tab: 店铺周计划 ═══ */}
        <TabsContent value="store_plan" className="mt-4">
          <PlanCard plan={storePlan} onGenerate={() => handleGeneratePlan("store")} generating={generatingModule === "store"} />
        </TabsContent>

        {/* ═══ Tab: 社媒周计划 ═══ */}
        <TabsContent value="social_plan" className="mt-4">
          <PlanCard plan={socialPlan} onGenerate={() => handleGeneratePlan("social")} generating={generatingModule === "social"} />
        </TabsContent>

        {/* ═══ Tab: AI 效果 ═══ */}
        <TabsContent value="ai_impact" className="mt-4">
          <ActionImpactList />
        </TabsContent>

        {/* ═══ Tab: 周报 ═══ */}
        <TabsContent value="weekly_report" className="mt-4">
          <WeeklyReportView />
        </TabsContent>

        {/* ═══ Tab: 操作日志 ═══ */}
        <TabsContent value="audit_logs" className="mt-4">
          <AuditLogViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlanCard({ plan, onGenerate, generating }: { plan: WeeklyPlan | null; onGenerate: () => void; generating: boolean }) {
  if (!plan) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">暂无周计划</p>
          <Button size="sm" className="mt-3" onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
            AI 生成本周计划
          </Button>
        </CardContent>
      </Card>
    );
  }

  const strategy = plan.strategy as Record<string, unknown> | null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">周计划: {plan.week_start}</CardTitle>
            {plan.performance_score !== null && (
              <p className="text-xs text-muted-foreground mt-0.5">得分: {plan.performance_score}/100</p>
            )}
          </div>
          <Badge variant="outline">{plan.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 诊断官结论 */}
        {strategy?.diagnosis ? (() => {
          const diag = strategy.diagnosis as Record<string, unknown>;
          const d = diag.diagnosis as Record<string, unknown> | undefined;
          const rf = diag.recommended_focus as Record<string, unknown> | undefined;
          return (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 p-3 space-y-2">
              <p className="text-[10px] font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">诊断官结论</p>
              {Boolean(d?.headline) && <p className="text-sm font-semibold">{String(d?.headline)}</p>}
              {Boolean(d?.primary_constraint) && (
                <Badge className="bg-red-600 hover:bg-red-600 text-[10px]">
                  主要瓶颈: {String(d?.primary_constraint)}
                </Badge>
              )}
              {Array.isArray(d?.evidence) && (d.evidence as string[]).length > 0 && (
                <ul className="text-[11px] space-y-0.5 text-muted-foreground">
                  {(d.evidence as string[]).map((e, i) => <li key={i}>· {e}</li>)}
                </ul>
              )}
              {Boolean(rf?.primary_lever) && (
                <div className="pt-1 border-t border-red-100 dark:border-red-900">
                  <p className="text-[10px] font-medium text-red-700 dark:text-red-400">最大杠杆</p>
                  <p className="text-xs mt-0.5">{String(rf?.primary_lever)}</p>
                  {Boolean(rf?.success_threshold) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">成功阈值: {String(rf?.success_threshold)}</p>
                  )}
                </div>
              )}
            </div>
          );
        })() : null}

        {/* Thesis（战略一句话 + anti-thesis） */}
        {strategy?.thesis ? (() => {
          const t = strategy.thesis as Record<string, unknown>;
          return (
            <div className="rounded-lg bg-primary/5 border-2 border-primary/20 p-3 space-y-2">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wide">本周 Thesis</p>
              {Boolean(t.one_liner) && <p className="text-sm font-semibold">{String(t.one_liner)}</p>}
              {Boolean(t.hypothesis) && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground">假设</p>
                  <p className="text-xs">{String(t.hypothesis)}</p>
                </div>
              )}
              {Boolean(t.success_threshold) && (
                <p className="text-[11px]">🎯 <span className="font-medium">{String(t.success_threshold)}</span></p>
              )}
              {Array.isArray(t.anti_thesis) && (t.anti_thesis as string[]).length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-red-600 mt-1">本周明确不做</p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5">
                    {(t.anti_thesis as string[]).map((a, i) => <li key={i}>✗ {a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          );
        })() : (
          // Fallback to legacy format
          <>
            {typeof strategy?.strategy === "string" && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <p className="text-xs font-medium text-primary mb-1">本周策略</p>
                <p className="text-xs">{strategy.strategy}</p>
              </div>
            )}
            {typeof strategy?.rationale === "string" && (
              <p className="text-xs text-muted-foreground">{strategy.rationale}</p>
            )}
            {Array.isArray(strategy?.key_focus) && (
              <div className="flex flex-wrap gap-1">
                {(strategy.key_focus as string[]).map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            )}
          </>
        )}

        {/* KPI daily watch */}
        {Array.isArray(strategy?.kpi_watch_daily) && (strategy.kpi_watch_daily as string[]).length > 0 && (
          <div className="rounded bg-muted/30 p-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-1">每日必盯</p>
            <div className="flex flex-wrap gap-1">
              {(strategy.kpi_watch_daily as string[]).map((k, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>
              ))}
            </div>
          </div>
        )}
        {plan.review && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 p-3 space-y-1">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">AI 周复盘</p>
            {(plan.review as { summary?: string }).summary && (
              <p className="text-xs">{String((plan.review as { summary?: string }).summary)}</p>
            )}
            {(plan.review as { wins?: string[] }).wins && (
              <div className="text-[10px]">
                <span className="text-green-600">有效: </span>
                {((plan.review as { wins: string[] }).wins || []).join(", ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
