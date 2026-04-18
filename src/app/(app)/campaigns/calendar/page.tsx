"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Loader2, CalendarDays, Zap, ChevronLeft, ChevronRight, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  scheduled_date: string;
  campaign_name: string;
  status: string;
  holiday_tag?: string;
  notes?: string;
}

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  planned: { color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300", label: "已规划" },
  composing: { color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300", label: "生成中" },
  ready: { color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300", label: "已就绪" },
  deployed: { color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300", label: "已部署" },
  skipped: { color: "bg-gray-100 text-gray-500 border-gray-200", label: "跳过" },
};

export default function CalendarPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const { monthStart, monthEnd, monthLabel } = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 0);
    return {
      monthStart: target.toISOString().split("T")[0],
      monthEnd: end.toISOString().split("T")[0],
      monthLabel: `${target.getFullYear()} 年 ${target.getMonth() + 1} 月`,
    };
  }, [monthOffset]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/calendar?start=${monthStart}&end=${monthEnd}`);
      const d = await res.json();
      setEntries(d.entries || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [monthStart, monthEnd]); // eslint-disable-line

  const autoPlan = async () => {
    setPlanning(true);
    try {
      const res = await fetch("/api/campaigns/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto_plan", days: 90 }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success(`已规划 ${d.created} 个活动（跳过 ${d.skipped} 个已存在）`);
        await load();
      }
    } catch { toast.error("规划失败"); }
    setPlanning(false);
  };

  const runEntry = async (id: string) => {
    setRunningId(id);
    try {
      const res = await fetch("/api/campaigns/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", entry_id: id }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("活动套件已生成，状态切到「就绪」");
        await load();
      } else {
        toast.error(d.error || "失败");
      }
    } catch { toast.error("执行失败"); }
    setRunningId(null);
  };

  // 构建月历格子
  const daysGrid = useMemo(() => {
    const start = new Date(monthStart);
    const firstDow = start.getDay();
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const grid: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < firstDow; i++) grid.push({ date: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = new Date(start.getFullYear(), start.getMonth(), d).toISOString().split("T")[0];
      grid.push({ date: ds, day: d });
    }
    while (grid.length % 7 !== 0) grid.push({ date: null, day: null });
    return grid;
  }, [monthStart]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of entries) {
      if (!map[e.scheduled_date]) map[e.scheduled_date] = [];
      map[e.scheduled_date].push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="营销日历"
        description="基于节日/大促自动规划活动，点日期一键生成完整套件"
        actions={
          <Button onClick={autoPlan} disabled={planning}>
            {planning
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />规划中</>
              : <><Zap className="h-3.5 w-3.5 mr-1.5" />AI 自动规划未来 3 个月</>}
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              {monthLabel}
            </CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => setMonthOffset(monthOffset - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>本月</Button>
              <Button size="sm" variant="outline" onClick={() => setMonthOffset(monthOffset + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
                {["日", "一", "二", "三", "四", "五", "六"].map(d => (
                  <div key={d} className="bg-muted/50 text-center py-1.5 text-[10px] font-medium text-muted-foreground">{d}</div>
                ))}
                {daysGrid.map((cell, i) => {
                  const dayEntries = cell.date ? (entriesByDate[cell.date] || []) : [];
                  return (
                    <div key={i} className={cn(
                      "bg-background min-h-[84px] p-1 text-xs",
                      !cell.date && "opacity-30"
                    )}>
                      {cell.day && (
                        <>
                          <div className="text-[10px] text-muted-foreground font-medium">{cell.day}</div>
                          {dayEntries.map(e => {
                            const style = STATUS_STYLE[e.status] || STATUS_STYLE.planned;
                            return (
                              <div key={e.id} className={cn("rounded px-1 py-0.5 mt-0.5 border text-[10px] truncate", style.color)}
                                title={e.campaign_name}>
                                {e.holiday_tag ? "🎉 " : ""}{e.campaign_name}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 列表视图 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">本月所有规划（{entries.length}）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              暂无规划。点右上角「AI 自动规划未来 3 个月」基于节日一键填满日历。
            </p>
          ) : entries.map(e => {
            const style = STATUS_STYLE[e.status] || STATUS_STYLE.planned;
            return (
              <div key={e.id} className="flex items-center gap-2 border-b pb-2">
                <Badge variant="outline" className="text-[10px] shrink-0">{e.scheduled_date.slice(5)}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {e.holiday_tag && <span>🎉</span>}
                    {e.campaign_name}
                    <Badge className={cn("text-[9px]", style.color)}>{style.label}</Badge>
                  </div>
                  {e.notes && <p className="text-[11px] text-muted-foreground truncate">{e.notes}</p>}
                </div>
                {e.status === "planned" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0"
                    onClick={() => runEntry(e.id)} disabled={runningId === e.id}>
                    {runningId === e.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <><Play className="h-3 w-3 mr-1" />生成</>}
                  </Button>
                )}
                {e.status === "ready" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
