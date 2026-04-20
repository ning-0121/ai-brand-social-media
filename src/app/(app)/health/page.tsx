"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import {
  Loader2, RefreshCw, CheckCircle2, AlertTriangle, XCircle, MinusCircle,
  Shield, Database, Server, Link2, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Check {
  key: string;
  category: "env" | "db_schema" | "db_data" | "integration" | "activity";
  label: string;
  status: "ok" | "warn" | "fail" | "skip";
  detail: string;
  fix_hint?: string;
  impact?: string;
}

interface HealthData {
  score: number;
  total: number;
  ok: number;
  warn: number;
  fail: number;
  critical_blockers: string[];
  checks: Check[];
}

const CATEGORY_META: Record<Check["category"], { label: string; icon: React.ReactNode }> = {
  env: { label: "环境变量", icon: <Shield className="h-4 w-4 text-amber-500" /> },
  db_schema: { label: "数据库表 / RPC", icon: <Database className="h-4 w-4 text-purple-500" /> },
  db_data: { label: "数据种子", icon: <Server className="h-4 w-4 text-blue-500" /> },
  integration: { label: "外部集成", icon: <Link2 className="h-4 w-4 text-green-500" /> },
  activity: { label: "实际运转", icon: <Activity className="h-4 w-4 text-rose-500" /> },
};

const STATUS_ICON: Record<Check["status"], React.ReactNode> = {
  ok: <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
  fail: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
  skip: <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0" />,
};

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health/check");
      const d = await res.json();
      setData(d);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  }
  if (!data) return null;

  const grouped: Record<Check["category"], Check[]> = { env: [], db_schema: [], db_data: [], integration: [], activity: [] };
  for (const c of data.checks) grouped[c.category].push(c);

  const scoreColor = data.score >= 85 ? "text-green-600" : data.score >= 60 ? "text-amber-600" : "text-red-600";
  const scoreBg = data.score >= 85 ? "from-green-50 to-emerald-50 border-green-200"
    : data.score >= 60 ? "from-amber-50 to-yellow-50 border-amber-200"
    : "from-red-50 to-rose-50 border-red-200";

  return (
    <div className="space-y-4">
      <PageHeader
        title="系统自检"
        description="逐项探测：哪些功能真的在跑 / 哪些卡在前置条件 / 如何快速解除"
        actions={
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            重新探测
          </Button>
        }
      />

      {/* 总览卡 */}
      <Card className={cn("border-2 bg-gradient-to-br", scoreBg)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">自检得分</div>
              <div className={cn("text-5xl font-bold tabular-nums", scoreColor)}>{data.score}</div>
              <div className="text-[10px] text-muted-foreground">{data.ok}/{data.total} 项正常</div>
            </div>
            <div className="grid grid-cols-3 gap-4 flex-1 min-w-0">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="h-3 w-3 text-green-500" />正常</div>
                <div className="text-2xl font-bold text-green-600 tabular-nums">{data.ok}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><AlertTriangle className="h-3 w-3 text-amber-500" />警告</div>
                <div className="text-2xl font-bold text-amber-600 tabular-nums">{data.warn}</div>
              </div>
              <div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><XCircle className="h-3 w-3 text-red-500" />阻塞</div>
                <div className="text-2xl font-bold text-red-600 tabular-nums">{data.fail}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 严重阻塞顶部高亮 */}
      {data.critical_blockers.length > 0 && (
        <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              {data.critical_blockers.length} 个阻塞项必须解决
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-xs space-y-0.5 text-red-700 dark:text-red-400">
              {data.critical_blockers.map((b, i) => <li key={i}>✗ {b}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 分类清单 */}
      {(Object.keys(CATEGORY_META) as Check["category"][]).map(cat => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const meta = CATEGORY_META[cat];
        const catFails = items.filter(i => i.status === "fail").length;
        const catWarns = items.filter(i => i.status === "warn").length;

        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {meta.icon}
                {meta.label}
                <span className="text-[11px] text-muted-foreground font-normal">
                  ({items.length} 项 {catFails > 0 && <span className="text-red-600">· {catFails} 阻塞</span>}{catWarns > 0 && <span className="text-amber-600">· {catWarns} 警告</span>})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {items.map(c => (
                <div key={c.key} className={cn(
                  "flex items-start gap-2 rounded p-2 border text-xs",
                  c.status === "fail" && "border-red-200 bg-red-50/30 dark:bg-red-950/10",
                  c.status === "warn" && "border-amber-200 bg-amber-50/30 dark:bg-amber-950/10",
                  c.status === "ok" && "border-muted",
                  c.status === "skip" && "border-muted opacity-60",
                )}>
                  {STATUS_ICON[c.status]}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{c.label}</span>
                      <code className="text-[10px] text-muted-foreground font-mono">{c.key}</code>
                    </div>
                    <p className={cn(
                      "text-[11px] mt-0.5",
                      c.status === "fail" ? "text-red-700 dark:text-red-400" :
                      c.status === "warn" ? "text-amber-700 dark:text-amber-400" :
                      "text-muted-foreground"
                    )}>{c.detail}</p>
                    {c.impact && c.status !== "ok" && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        <span className="font-medium">影响：</span>{c.impact}
                      </p>
                    )}
                    {c.fix_hint && c.status !== "ok" && (
                      <div className="mt-1 rounded bg-background/60 border border-dashed p-1.5">
                        <span className="text-[10px] font-medium text-primary">修复：</span>
                        <span className="text-[11px] ml-1">{c.fix_hint}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[9px] shrink-0",
                    c.status === "fail" && "border-red-300 text-red-700",
                    c.status === "warn" && "border-amber-300 text-amber-700",
                    c.status === "ok" && "border-green-300 text-green-700",
                  )}>{c.status.toUpperCase()}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
