"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { toast } from "sonner";
import type { PilotRun } from "@/lib/pilot-data";

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  draft: { variant: "secondary", label: "Draft" },
  active: { variant: "default", label: "Active" },
  completed: { variant: "outline", label: "Completed" },
  archived: { variant: "secondary", label: "Archived" },
};

export default function PilotRunsPage() {
  const [runs, setRuns] = useState<PilotRun[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(() => {
    fetch("/api/pilot?type=runs")
      .then((r) => r.json())
      .then((data) => setRuns(data.runs || []))
      .catch(() => toast.error("加载试跑记录失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="试跑记录"
        description="查看所有试跑的历史记录与状态"
        actions={
          <Link href="/pilot">
            <Badge variant="outline" className="cursor-pointer gap-1.5 px-3 py-1.5 text-sm">
              <Play className="h-3.5 w-3.5" />
              返回 Pilot Center
            </Badge>
          </Link>
        }
      />

      {runs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            暂无试跑记录 — 前往 Pilot Center 开始第一次试跑
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">试跑名称</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">开始日期</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">结束日期</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const badge = STATUS_BADGE[run.status] || STATUS_BADGE.draft;
                    return (
                      <tr key={run.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href="/pilot" className="font-medium text-primary hover:underline">
                            {run.run_name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{run.start_date}</td>
                        <td className="px-4 py-3 text-muted-foreground">{run.end_date}</td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant} className="text-[10px]">
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(run.created_at).toLocaleDateString("zh-CN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
