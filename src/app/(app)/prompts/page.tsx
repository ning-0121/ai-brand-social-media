"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileText, Trophy, Zap, Clock, CheckCircle2, AlertCircle,
  Plus, Loader2, ChevronRight, Code2, GitCompare, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Prompt {
  id: string;
  slug: string;
  version: number;
  title: string | null;
  description: string | null;
  template: string;
  system_prompt: string | null;
  model: string;
  tier: string;
  max_tokens: number;
  temperature: number;
  is_active: boolean;
  is_champion: boolean;
  created_at: string;
}

interface Run {
  id: string;
  prompt_version: number;
  latency_ms: number | null;
  model_used: string | null;
  score: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

function fmtMs(ms: number | null): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function PromptsPage() {
  const [grouped, setGrouped] = useState<Record<string, Prompt[]>>({});
  const [scores, setScores] = useState<Record<string, { avg: number | null; samples: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ versions: Prompt[]; recent_runs: Run[]; scores: Record<number, { avg: number | null; samples: number }> } | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts");
      const data = await res.json();
      setGrouped(data.grouped || {});
      setScores(data.scores || {});
    } catch {
      toast.error("加载 prompt 列表失败");
    }
    setLoading(false);
  };

  const loadDetail = async (slug: string) => {
    const res = await fetch(`/api/prompts?slug=${encodeURIComponent(slug)}`);
    const data = await res.json();
    setDetail(data);
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (selectedSlug) loadDetail(selectedSlug); }, [selectedSlug]);

  const setActive = async (slug: string, version: number) => {
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_active", slug, version }),
    });
    if (res.ok) {
      toast.success(`已切换 ${slug} v${version} 为生效版本`);
      await loadList();
      if (selectedSlug === slug) await loadDetail(slug);
    } else {
      toast.error("切换失败");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prompt Playground"
        description="版本化 prompt 模板 · 自动记录延迟/成本/质量分 · 督察根据滚动分晋升冠军版本"
      />

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm font-medium">prompts 表为空</p>
            <p className="text-xs text-muted-foreground">
              去 Supabase SQL Editor 执行 <code>seed_core_prompts_v1.sql</code> 导入核心 prompts
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: prompt list */}
          <div className="lg:col-span-1 space-y-2">
            {Object.entries(grouped).map(([slug, versions]) => {
              const active = versions.find((v) => v.is_active) || versions[0];
              const score = scores[slug];
              return (
                <Card
                  key={slug}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-sm",
                    selectedSlug === slug && "border-primary shadow-sm"
                  )}
                  onClick={() => setSelectedSlug(slug)}
                >
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono truncate">{slug}</code>
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                    {active.title && <p className="text-xs text-muted-foreground line-clamp-1">{active.title}</p>}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[9px]">v{active.version} 生效</Badge>
                      <Badge variant="secondary" className="text-[9px]">{versions.length} 版本</Badge>
                      {active.is_champion && (
                        <Badge className="text-[9px] bg-amber-500 hover:bg-amber-500">
                          <Trophy className="h-2.5 w-2.5 mr-0.5" />冠军
                        </Badge>
                      )}
                      {score?.avg != null && (
                        <span className={cn(
                          "text-[10px] font-medium tabular-nums",
                          score.avg >= 80 ? "text-green-600" : score.avg >= 60 ? "text-amber-600" : "text-red-600"
                        )}>
                          {score.avg.toFixed(1)}/100
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Right: detail */}
          <div className="lg:col-span-2">
            {!selectedSlug ? (
              <Card className="border-dashed h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground py-12">选择左侧 prompt 查看详情</p>
              </Card>
            ) : !detail ? (
              <Card><CardContent className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">{selectedSlug}</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Create new version based on active one
                      const active = detail.versions.find((v) => v.is_active) || detail.versions[0];
                      setEditingPrompt(active);
                    }}>
                      <Plus className="h-3 w-3 mr-1" />新建版本
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="versions">
                    <TabsList>
                      <TabsTrigger value="versions">版本（{detail.versions.length}）</TabsTrigger>
                      <TabsTrigger value="runs">执行记录（{detail.recent_runs.length}）</TabsTrigger>
                      {detail.versions.length >= 2 && <TabsTrigger value="compare">版本对比</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="versions" className="space-y-2 mt-3">
                      {detail.versions.map((v) => {
                        const s = detail.scores[v.version];
                        return (
                          <Card key={v.id} className={cn(v.is_active && "border-primary")}>
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="text-[10px]">v{v.version}</Badge>
                                  {v.is_active && <Badge className="text-[10px] bg-green-600 hover:bg-green-600">生效</Badge>}
                                  {v.is_champion && <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500"><Trophy className="h-2.5 w-2.5 mr-0.5" />冠军</Badge>}
                                  <span className="text-[10px] text-muted-foreground">{v.model} · {v.tier} · {v.max_tokens}t</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {s?.avg != null && (
                                    <span className={cn(
                                      "text-xs font-medium tabular-nums",
                                      s.avg >= 80 ? "text-green-600" : s.avg >= 60 ? "text-amber-600" : "text-red-600"
                                    )}>
                                      {s.avg.toFixed(1)} · {s.samples} 样本
                                    </span>
                                  )}
                                  {!v.is_active && (
                                    <Button size="sm" variant="outline" className="h-6 text-[10px]"
                                      onClick={() => setActive(selectedSlug!, v.version)}>
                                      设为生效
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {v.title && <p className="text-xs font-medium">{v.title}</p>}
                              {v.description && <p className="text-[11px] text-muted-foreground">{v.description}</p>}
                              <details className="text-[11px]">
                                <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
                                  <Code2 className="h-3 w-3" />查看模板
                                </summary>
                                <div className="mt-1.5 space-y-1.5">
                                  {v.system_prompt && (
                                    <div>
                                      <div className="text-[10px] font-medium text-muted-foreground mb-0.5">System</div>
                                      <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap max-h-32 overflow-auto">{v.system_prompt}</pre>
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-[10px] font-medium text-muted-foreground mb-0.5">User</div>
                                    <pre className="bg-muted/50 p-2 rounded text-[10px] whitespace-pre-wrap max-h-48 overflow-auto">{v.template}</pre>
                                  </div>
                                </div>
                              </details>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="runs" className="mt-3">
                      {detail.recent_runs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">暂无执行记录</p>
                      ) : (
                        <div className="space-y-1.5">
                          {detail.recent_runs.map((r) => (
                            <div key={r.id} className="flex items-center justify-between text-xs border-b py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {r.success
                                  ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                  : <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
                                <Badge variant="outline" className="text-[9px]">v{r.prompt_version}</Badge>
                                <span className="text-[10px] text-muted-foreground truncate">{r.model_used || "-"}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="flex items-center gap-1 text-[10px]"><Clock className="h-2.5 w-2.5" />{fmtMs(r.latency_ms)}</span>
                                {r.score != null && (
                                  <span className={cn("text-[10px] font-medium",
                                    r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-amber-600" : "text-red-600"
                                  )}>{r.score.toFixed(0)}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    {detail.versions.length >= 2 && (
                      <TabsContent value="compare" className="mt-3">
                        <CompareTab slug={selectedSlug!} versions={detail.versions} />
                      </TabsContent>
                    )}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Edit / New version dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={(o) => !o && setEditingPrompt(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建 prompt 版本 · {editingPrompt?.slug}</DialogTitle>
          </DialogHeader>
          {editingPrompt && (
            <EditPromptForm
              base={editingPrompt}
              onSaved={async () => {
                setEditingPrompt(null);
                await loadList();
                if (selectedSlug) await loadDetail(selectedSlug);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditPromptForm({ base, onSaved }: { base: Prompt; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: `${base.title || base.slug} v${base.version + 1}`,
    description: base.description || "",
    template: base.template,
    system_prompt: base.system_prompt || "",
    model: base.model,
    tier: base.tier,
    max_tokens: base.max_tokens,
    temperature: base.temperature,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_version",
          slug: base.slug,
          ...form,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      toast.success(`新版本已创建（未生效）。在版本列表里点"设为生效"来启用`);
      onSaved();
    } catch {
      toast.error("保存失败");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium">标题</label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
      </div>
      <div>
        <label className="text-xs font-medium">描述</label>
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-xs font-medium">模型</label>
          <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1 text-xs font-mono" />
        </div>
        <div>
          <label className="text-xs font-medium">档位</label>
          <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="mt-1 w-full h-9 rounded-md border px-2 text-sm">
            <option value="fast">fast</option>
            <option value="balanced">balanced</option>
            <option value="complex">complex</option>
            <option value="reasoning">reasoning</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">Max tokens</label>
          <Input type="number" value={form.max_tokens} onChange={(e) => setForm({ ...form, max_tokens: parseInt(e.target.value) })} className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium">温度</label>
          <Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })} className="mt-1" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium">System Prompt</label>
        <Textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} className="mt-1 font-mono text-xs" rows={6} />
      </div>
      <div>
        <label className="text-xs font-medium">User Template（支持 {"{{var}}"} 变量）</label>
        <Textarea value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} className="mt-1 font-mono text-xs" rows={12} />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />保存中</> : <><Zap className="h-3.5 w-3.5 mr-1.5" />创建新版本</>}
        </Button>
      </div>
    </div>
  );
}

function CompareTab({ slug, versions }: { slug: string; versions: Prompt[] }) {
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  const [leftV, setLeftV] = useState<number>(sorted[1]?.version ?? sorted[0].version);
  const [rightV, setRightV] = useState<number>(sorted[0].version);
  const [varsJson, setVarsJson] = useState("{}");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Array<{ version: number; output: Record<string, unknown> | null; latency_ms: number; error: string | null }> | null>(null);

  const run = async () => {
    let parsedVars: Record<string, unknown>;
    try { parsedVars = JSON.parse(varsJson); }
    catch { toast.error("变量 JSON 解析失败"); return; }
    setRunning(true);
    setResults(null);
    try {
      const res = await fetch("/api/prompts/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, versions: [leftV, rightV], vars: parsedVars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setResults(data.results);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "对比失败");
    }
    setRunning(false);
  };

  const winner = results && results[0]?.latency_ms && results[1]?.latency_ms
    ? results[0].latency_ms < results[1].latency_ms ? 0 : 1
    : null;

  return (
    <div className="space-y-3">
      <Card className="bg-muted/20">
        <CardContent className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">左侧版本</label>
              <select value={leftV} onChange={(e) => setLeftV(parseInt(e.target.value))}
                className="mt-0.5 w-full h-8 rounded-md border px-2 text-xs">
                {sorted.map((v) => <option key={v.version} value={v.version}>v{v.version} {v.is_active && "（生效中）"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground">右侧版本</label>
              <select value={rightV} onChange={(e) => setRightV(parseInt(e.target.value))}
                className="mt-0.5 w-full h-8 rounded-md border px-2 text-xs">
                {sorted.map((v) => <option key={v.version} value={v.version}>v{v.version} {v.is_active && "（生效中）"}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">变量（JSON 格式，按模板 {"{{var}}"} 填）</label>
            <Textarea value={varsJson} onChange={(e) => setVarsJson(e.target.value)}
              className="mt-0.5 font-mono text-xs" rows={5}
              placeholder='{"product": {"name": "Silk Cami"}, "keywords": "silk top"}' />
          </div>
          <Button size="sm" onClick={run} disabled={running || leftV === rightV} className="w-full">
            {running ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />并行执行中...</> : <><GitCompare className="h-3.5 w-3.5 mr-1.5" />并排跑两个版本</>}
          </Button>
          {leftV === rightV && <p className="text-[10px] text-amber-600">左右版本相同，选不同的版本对比</p>}
        </CardContent>
      </Card>

      {results && (
        <div className="grid grid-cols-2 gap-3">
          {results.map((r, i) => (
            <Card key={i} className={cn(winner === i && "border-green-500")}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px]">v{r.version}</Badge>
                    {winner === i && <Badge className="text-[10px] bg-green-600 hover:bg-green-600">更快 ⚡</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />{fmtMs(r.latency_ms)}
                  </span>
                </div>
                {r.error ? (
                  <div className="text-xs text-red-600">❌ {r.error}</div>
                ) : (
                  <pre className="text-[10px] bg-muted/30 p-2 rounded max-h-96 overflow-auto whitespace-pre-wrap">{JSON.stringify(r.output, null, 2)}</pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!results && !running && (
        <div className="text-center py-6 text-xs text-muted-foreground">
          <Play className="h-5 w-5 mx-auto mb-1 opacity-40" />
          选择两个版本 + 填入变量，点击上方按钮并行执行
        </div>
      )}
    </div>
  );
}
