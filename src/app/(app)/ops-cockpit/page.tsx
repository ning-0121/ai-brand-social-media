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
}

interface GoalProposal {
  diagnosis: string;
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
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);

  // Goal creation
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ module: "store", metric: "revenue", target_value: "", unit: "元", deadline: "" });

  // AI goal proposal
  const [proposing, setProposing] = useState(false);
  const [proposal, setProposal] = useState<GoalProposal | null>(null);

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
      fetchAll();
    } catch { toast.error("采纳失败"); }
  };

  const handleGeneratePlan = async (module: string) => {
    setGenerating(true);
    try {
      await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_plan", module }),
      });
      toast.success(`${module === "store" ? "店铺" : "社媒"}周计划已生成`);
      fetchAll();
    } catch { toast.error("生成失败"); }
    setGenerating(false);
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
            <Button size="sm" variant="outline" onClick={() => handleGeneratePlan("store")} disabled={generating}>
              {generating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              生成店铺周计划
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleGeneratePlan("social")} disabled={generating}>
              {generating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
              生成社媒周计划
            </Button>
            <Button size="sm" onClick={handleExecuteToday} disabled={executing}>
              {executing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
              执行今日任务
            </Button>
          </div>
        }
      />

      {/* Goals */}
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
          {/* AI Goal Proposal */}
          {proposal && (
            <div className="rounded-lg border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Brain className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">AI 诊断结果</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">{proposal.diagnosis}</p>
                </div>
                <Button size="sm" variant="ghost" className="ml-auto h-6 w-6 p-0 shrink-0" onClick={() => setProposal(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>

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
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{g.estimated_effort}</span>
                  </div>
                </div>
              ))}

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
            <div className="text-center py-6 space-y-2">
              <Target className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">暂无目标</p>
              <p className="text-[10px] text-muted-foreground">点击「AI 诊断建议目标」让 AI 分析店铺数据后自动提出目标</p>
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

      {/* Weekly Plans + Today's Tasks */}
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">今日任务 ({tasks.length})</TabsTrigger>
          <TabsTrigger value="store_plan">店铺周计划</TabsTrigger>
          <TabsTrigger value="social_plan">社媒周计划</TabsTrigger>
          <TabsTrigger value="ai_impact">AI 效果</TabsTrigger>
          <TabsTrigger value="weekly_report">周报</TabsTrigger>
          <TabsTrigger value="audit_logs">操作日志</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-2 mt-4">
          {tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                今日没有计划任务<br />
                <span className="text-xs">点击上方生成周计划让 AI 制定运营方案</span>
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
                      {task.execution_result && (
                        <div className="mt-1 rounded bg-muted/50 px-2 py-1 text-[10px]">
                          {JSON.stringify(task.execution_result).slice(0, 150)}
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

        <TabsContent value="store_plan" className="mt-4">
          <PlanCard plan={storePlan} onGenerate={() => handleGeneratePlan("store")} generating={generating} />
        </TabsContent>

        <TabsContent value="social_plan" className="mt-4">
          <PlanCard plan={socialPlan} onGenerate={() => handleGeneratePlan("social")} generating={generating} />
        </TabsContent>

        <TabsContent value="ai_impact" className="mt-4">
          <ActionImpactList />
        </TabsContent>

        <TabsContent value="weekly_report" className="mt-4">
          <WeeklyReportView />
        </TabsContent>

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
