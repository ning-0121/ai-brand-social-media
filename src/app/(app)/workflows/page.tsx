"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import * as Icons from "lucide-react";
import { Sparkles, Play, CheckCircle2, XCircle, Clock, Loader2, FileText, Image as ImageIcon, Video, Link2, ArrowRight } from "lucide-react";

interface PlaybookMeta {
  id: string;
  name: string;
  description: string;
  objective: string;
  when_to_use: string;
  category: string;
  icon: string;
  color: string;
  estimated_duration_seconds: number;
  step_count: number;
  required_inputs: Array<{
    key: string;
    label: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
    placeholder?: string;
  }>;
}

interface RunLogEntry {
  step_id: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  output_summary?: string;
}

interface WorkflowResult {
  run_id: string;
  playbook_id: string;
  status: string;
  steps_completed: number;
  steps_total: number;
  duration_seconds: number;
  summary: string;
  deliverables: Array<{ type: string; label: string; url?: string; preview?: string }>;
  context: {
    log: RunLogEntry[];
    artifacts: Array<{ type: string; label: string; url?: string }>;
    decisions: Record<string, unknown>;
  };
}

interface HistoricalRun {
  run_id: string;
  playbook_id: string;
  playbook_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  growth: "增长",
  optimization: "优化",
  campaign: "活动",
  content: "内容",
  inventory: "库存",
};

const CATEGORY_COLORS: Record<string, string> = {
  growth: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
  optimization: "bg-blue-500/10 text-blue-600 border-blue-200",
  campaign: "bg-orange-500/10 text-orange-600 border-orange-200",
  content: "bg-pink-500/10 text-pink-600 border-pink-200",
  inventory: "bg-amber-500/10 text-amber-600 border-amber-200",
};

function getIcon(name: string) {
  const icons = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[name] || Icons.Workflow;
}

function deliverableIcon(type: string) {
  switch (type) {
    case "page_url": return <Link2 className="w-4 h-4" />;
    case "image_url": return <ImageIcon className="w-4 h-4" />;
    case "video_url": return <Video className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

export default function WorkflowsPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookMeta[]>([]);
  const [history, setHistory] = useState<HistoricalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookMeta | null>(null);
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WorkflowResult | null>(null);

  // AI planner state
  const [objective, setObjective] = useState("");
  const [planning, setPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<{
    matched_playbook_id: string | null;
    confidence: string;
    reasoning: string;
    suggested_inputs: Record<string, unknown>;
    clarifying_questions?: string[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/orchestrator?action=list").then(r => r.json()),
      fetch("/api/orchestrator?action=runs&limit=10").then(r => r.json()),
    ]).then(([listRes, runsRes]) => {
      setPlaybooks(listRes.playbooks || []);
      setHistory(runsRes.runs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePlan = async () => {
    if (!objective.trim()) return;
    setPlanning(true);
    setPlanResult(null);
    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "plan", objective }),
      });
      const data = await res.json();
      setPlanResult(data);
      if (data.matched_playbook_id) {
        const match = playbooks.find(p => p.id === data.matched_playbook_id);
        if (match) {
          setSelectedPlaybook(match);
          setInputs(data.suggested_inputs || {});
        }
      }
    } finally {
      setPlanning(false);
    }
  };

  const handleRun = async () => {
    if (!selectedPlaybook) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run",
          playbook_id: selectedPlaybook.id,
          inputs,
        }),
      });
      const data = await res.json();
      setResult(data);
      // Refresh history
      fetch("/api/orchestrator?action=runs&limit=10").then(r => r.json()).then(d => setHistory(d.runs || []));
    } catch (err) {
      alert("执行失败：" + (err instanceof Error ? err.message : "unknown"));
    } finally {
      setRunning(false);
    }
  };

  const closeDialog = () => {
    setSelectedPlaybook(null);
    setInputs({});
    setResult(null);
    setRunning(false);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="工作流中心"
        description="把散装 Skill 变成完整任务：AI 指挥官一键调度多个 skill 并行协作"
      />

      {/* AI Planner */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-lg">AI 指挥官 — 用自然语言描述你的目标</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="例如：把那条滞销的褪色连衣裙库存清掉 / 推新品 / 优化整站转化率"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlan()}
              className="flex-1"
              disabled={planning}
            />
            <Button onClick={handlePlan} disabled={planning || !objective.trim()}>
              {planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span className="ml-1">规划</span>
            </Button>
          </div>

          {planResult && (
            <div className="rounded-lg border bg-white p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={planResult.confidence === "high" ? "default" : "secondary"}>
                  置信度：{planResult.confidence}
                </Badge>
                {planResult.matched_playbook_id && (
                  <Badge variant="outline">
                    推荐：{playbooks.find(p => p.id === planResult.matched_playbook_id)?.name}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{planResult.reasoning}</p>
              {planResult.clarifying_questions && planResult.clarifying_questions.length > 0 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="font-medium text-amber-900 mb-1">需要补充信息：</p>
                  <ul className="list-disc list-inside text-amber-800 text-xs space-y-1">
                    {planResult.clarifying_questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Playbook Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">可用工作流</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {playbooks.map(pb => {
              const Icon = getIcon(pb.icon);
              const categoryClass = CATEGORY_COLORS[pb.category] || "";
              return (
                <Card
                  key={pb.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedPlaybook(pb)}
                >
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${categoryClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[pb.category] || pb.category}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{pb.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{pb.description}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <Icons.Workflow className="w-3 h-3" />
                        {pb.step_count} 步
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{Math.round(pb.estimated_duration_seconds / 60)} 分钟
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">最近运行</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {history.map(run => (
                  <div key={run.run_id} className="p-4 flex items-center justify-between hover:bg-muted/40">
                    <div className="flex items-center gap-3">
                      {run.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                       run.status === "failed" ? <XCircle className="w-4 h-4 text-red-600" /> :
                       run.status === "awaiting_approval" ? <Clock className="w-4 h-4 text-amber-600" /> :
                       <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-sm">{run.playbook_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Run Dialog */}
      <Dialog open={!!selectedPlaybook} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPlaybook && !result && !running && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => { const Icon = getIcon(selectedPlaybook.icon); return <Icon className="w-5 h-5" />; })()}
                  {selectedPlaybook.name}
                </DialogTitle>
                <DialogDescription>{selectedPlaybook.objective}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                  <span className="font-medium">何时使用：</span>{selectedPlaybook.when_to_use}
                </div>
                {selectedPlaybook.required_inputs.map(inp => (
                  <div key={inp.key} className="space-y-1">
                    <label className="text-sm font-medium">
                      {inp.label}
                      {inp.required && <span className="text-red-500">*</span>}
                    </label>
                    {inp.type === "product" || inp.type === "products" ? (
                      <Input
                        placeholder={inp.type === "products" ? "输入商品 ID（逗号分隔多个）" : "输入商品 ID（UUID）"}
                        value={String(inputs[inp.key] || "")}
                        onChange={(e) => {
                          if (inp.type === "products") {
                            const ids = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                            setInputs({ ...inputs, [inp.key]: ids.map(id => ({ id, name: id })) });
                          } else {
                            setInputs({ ...inputs, [inp.key]: { id: e.target.value, name: e.target.value } });
                          }
                        }}
                      />
                    ) : inp.type === "select" && inp.options ? (
                      <select
                        className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                        value={String(inputs[inp.key] || inp.options[0]?.value || "")}
                        onChange={(e) => setInputs({ ...inputs, [inp.key]: e.target.value })}
                      >
                        {inp.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : inp.type === "number" ? (
                      <Input
                        type="number"
                        placeholder={inp.placeholder}
                        value={String(inputs[inp.key] || "")}
                        onChange={(e) => setInputs({ ...inputs, [inp.key]: e.target.value })}
                      />
                    ) : inp.type === "date" ? (
                      <Input
                        type="date"
                        value={String(inputs[inp.key] || "")}
                        onChange={(e) => setInputs({ ...inputs, [inp.key]: e.target.value })}
                      />
                    ) : (
                      <Input
                        placeholder={inp.placeholder}
                        value={String(inputs[inp.key] || "")}
                        onChange={(e) => setInputs({ ...inputs, [inp.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>取消</Button>
                <Button onClick={handleRun}>
                  <Play className="w-4 h-4 mr-1" />
                  开始执行（预计 {Math.round(selectedPlaybook.estimated_duration_seconds / 60)} 分钟）
                </Button>
              </DialogFooter>
            </>
          )}

          {running && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="font-medium">工作流执行中...</p>
              <p className="text-sm text-muted-foreground">
                AI 正在调度多个 skill 并行协作，请稍候
              </p>
            </div>
          )}

          {result && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {result.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                   result.status === "failed" ? <XCircle className="w-5 h-5 text-red-600" /> :
                   <Clock className="w-5 h-5 text-amber-600" />}
                  {result.summary}
                </DialogTitle>
                <DialogDescription>
                  用时 {result.duration_seconds}s · 完成 {result.steps_completed}/{result.steps_total} 步
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Step log */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">执行日志</h4>
                  <div className="space-y-1 text-xs max-h-48 overflow-y-auto bg-muted/50 p-3 rounded">
                    {result.context.log.map((entry, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        {entry.status === "completed" ? <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" /> :
                         entry.status === "failed" ? <XCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" /> :
                         entry.status === "skipped" ? <Icons.SkipForward className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" /> :
                         <Clock className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className="font-medium">{entry.step_id} {entry.duration_ms && `(${Math.round(entry.duration_ms / 1000)}s)`}</p>
                          {entry.output_summary && <p className="text-muted-foreground truncate">{entry.output_summary}</p>}
                          {entry.error && <p className="text-red-600">{entry.error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deliverables */}
                {result.deliverables.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">交付物（{result.deliverables.length}）</h4>
                    <div className="space-y-2">
                      {result.deliverables.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div className="flex items-center gap-2">
                            {deliverableIcon(d.type)}
                            <span>{d.label}</span>
                          </div>
                          {d.url && (
                            <a href={d.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">
                              查看 ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {Object.keys(result.context.decisions).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">AI 决策</h4>
                    <div className="bg-muted/50 p-3 rounded text-xs space-y-1">
                      {Object.entries(result.context.decisions).map(([k, v]) => (
                        <div key={k}>
                          <span className="font-medium">{k}:</span> {typeof v === "object" ? JSON.stringify(v).slice(0, 100) : String(v)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={closeDialog}>关闭</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
