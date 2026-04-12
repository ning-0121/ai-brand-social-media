"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Bug, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { PilotIssue } from "@/lib/pilot-data";

const SEVERITIES = ["all", "P0", "P1", "P2", "P3"] as const;

const SEVERITY_BADGE: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  P0: "destructive",
  P1: "default",
  P2: "secondary",
  P3: "outline",
};

const MODULES = [
  "store", "content", "social", "creative", "approvals",
  "dashboard", "settings", "analytics", "pilot",
];

export default function PilotIssuesPage() {
  const [issues, setIssues] = useState<PilotIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [severity, setSeverity] = useState("P2");
  const [moduleName, setModuleName] = useState("store");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reproSteps, setReproSteps] = useState("");
  const [affectsRevenue, setAffectsRevenue] = useState(false);
  const [affectsExecution, setAffectsExecution] = useState(false);
  const [suggestedFix, setSuggestedFix] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchIssues = useCallback(() => {
    fetch("/api/pilot?type=issues")
      .then((r) => r.json())
      .then((data) => setIssues(data.issues || []))
      .catch(() => toast.error("加载问题失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("请填写问题标题");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_issue",
          severity,
          module_name: moduleName,
          title: title.trim(),
          description: description.trim() || null,
          reproduction_steps: reproSteps.trim() || null,
          affects_revenue: affectsRevenue,
          affects_execution: affectsExecution,
          suggested_fix: suggestedFix.trim() || null,
        }),
      });
      if (res.ok) {
        toast.success("问题已创建");
        setShowCreate(false);
        setTitle("");
        setDescription("");
        setReproSteps("");
        setSuggestedFix("");
        setAffectsRevenue(false);
        setAffectsExecution(false);
        fetchIssues();
      } else {
        const data = await res.json();
        toast.error(data.error || "创建失败");
      }
    } catch {
      toast.error("创建失败");
    }
    setSubmitting(false);
  };

  const filtered = filter === "all" ? issues : issues.filter((i) => i.severity === filter);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="问题池"
        description="收集、分类、追踪试跑中发现的所有问题"
        actions={
          <div className="flex gap-2">
            <Link href="/pilot">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                返回
              </Button>
            </Link>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              新建问题
            </Button>
          </div>
        }
      />

      {/* Create Dialog */}
      {showCreate && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">严重程度</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {["P0", "P1", "P2", "P3"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">模块</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                >
                  {MODULES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">标题</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="简要描述问题" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">详细描述</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="问题的详细描述..." className="min-h-[80px]" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">复现步骤</label>
              <Textarea value={reproSteps} onChange={(e) => setReproSteps(e.target.value)} placeholder="1. 进入...\n2. 点击...\n3. 出现..." className="min-h-[60px]" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">建议修复方案</label>
              <Input value={suggestedFix} onChange={(e) => setSuggestedFix(e.target.value)} placeholder="可选: 你认为如何修复" />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={affectsRevenue} onChange={(e) => setAffectsRevenue(e.target.checked)} className="rounded" />
                影响营收
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={affectsExecution} onChange={(e) => setAffectsExecution(e.target.checked)} className="rounded" />
                影响执行
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting || !title.trim()}>
                {submitting ? "提交中..." : "创建问题"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {SEVERITIES.map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "全部" : s}
          </Button>
        ))}
      </div>

      {/* Issues Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <Bug className="mx-auto h-8 w-8 mb-2 text-muted-foreground/50" />
            暂无问题 {filter !== "all" && `(${filter})`}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">严重度</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">标题</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">模块</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">影响营收</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">影响执行</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((issue) => (
                    <tr key={issue.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant={SEVERITY_BADGE[issue.severity] || "outline"} className="text-[10px]">
                          {issue.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-xs truncate">{issue.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">{issue.module_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{issue.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {issue.affects_revenue && <Badge variant="destructive" className="text-[10px]">Yes</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {issue.affects_execution && <Badge variant="destructive" className="text-[10px]">Yes</Badge>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(issue.created_at).toLocaleDateString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
