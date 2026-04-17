"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileBarChart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyReport {
  date: string;
  tasks_executed: number;
  tasks_failed: number;
  tasks_pending: number;
  task_details: Array<{ title: string; status: string; result_summary: string }>;
  store_data: {
    revenue_30d: number;
    orders_30d: number;
    avg_seo_score: number;
    products_with_meta: number;
    products_total: number;
    social_posts_published: number;
  };
  changes: {
    seo_score_change: number;
    products_fixed_today: number;
    new_content_created: number;
  };
  ai_summary: string;
  tomorrow_plan: string;
}

export function DailyReportPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops-director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "daily_report" }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
      else toast.error(data.error || "生成日报失败");
    } catch {
      toast.error("生成日报失败");
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (!report) fetchReport();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen}>
        <FileBarChart className="mr-1 h-3 w-3" />
        今日日报
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-purple-500" />
              运营日报 · {report?.date || new Date().toISOString().split("T")[0]}
            </DialogTitle>
            <DialogDescription>
              AI 每日运营执行摘要 + 数据对比 + 明日计划
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2">AI 正在汇总今日数据...</p>
            </div>
          ) : report ? (
            <div className="space-y-4">
              {/* 今日执行概况 4 卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatCard
                  icon={CheckCircle2}
                  color="text-green-600"
                  bg="bg-green-50 dark:bg-green-950/30"
                  label="已执行"
                  value={report.tasks_executed}
                />
                <StatCard
                  icon={AlertCircle}
                  color="text-red-600"
                  bg="bg-red-50 dark:bg-red-950/30"
                  label="失败"
                  value={report.tasks_failed}
                />
                <StatCard
                  icon={Clock}
                  color="text-amber-600"
                  bg="bg-amber-50 dark:bg-amber-950/30"
                  label="待处理"
                  value={report.tasks_pending}
                />
                <StatCard
                  icon={Sparkles}
                  color="text-purple-600"
                  bg="bg-purple-50 dark:bg-purple-950/30"
                  label="新内容"
                  value={report.changes.new_content_created}
                />
              </div>

              {/* AI 总结 */}
              {report.ai_summary && (
                <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-[10px] font-medium text-purple-900 dark:text-purple-100 mb-1">AI 总结</div>
                        <p className="text-xs leading-relaxed">{report.ai_summary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 对比昨天 */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">📈 对比昨天</div>
                <div className="grid grid-cols-3 gap-2">
                  <ChangeCard
                    label="SEO 分变化"
                    value={report.changes.seo_score_change}
                    unit="分"
                    positive={report.changes.seo_score_change > 0}
                  />
                  <ChangeCard
                    label="今日修复产品"
                    value={report.changes.products_fixed_today}
                    unit="个"
                    positive
                  />
                  <ChangeCard
                    label="今日新内容"
                    value={report.changes.new_content_created}
                    unit="条"
                    positive
                  />
                </div>
              </div>

              {/* 店铺数据 */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">🏪 店铺实时数据</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <DataRow label="30 天营收" value={`$${report.store_data.revenue_30d.toFixed(0)}`} />
                  <DataRow label="30 天订单" value={String(report.store_data.orders_30d)} />
                  <DataRow label="平均 SEO 分" value={`${report.store_data.avg_seo_score}/100`} />
                  <DataRow label="Meta 覆盖" value={`${report.store_data.products_with_meta}/${report.store_data.products_total}`} />
                  <DataRow label="今日社媒" value={`${report.store_data.social_posts_published} 条`} />
                </div>
              </div>

              {/* 明日计划 */}
              {report.tomorrow_plan && (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-[10px] font-medium text-blue-900 dark:text-blue-100 mb-1">明日计划</div>
                        <p className="text-xs leading-relaxed">{report.tomorrow_plan}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 今日任务明细 */}
              {report.task_details.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">📋 今日任务明细</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {report.task_details.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs rounded border p-2">
                        <StatusDot status={t.status} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{t.title}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{t.result_summary}</div>
                        </div>
                        <Badge variant="outline" className="text-[9px]">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={fetchReport} disabled={loading}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  重新生成
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              无法加载日报
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatCard({
  icon: Icon,
  color,
  bg,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  label: string;
  value: number;
}) {
  return (
    <div className={cn("rounded-lg p-3", bg)}>
      <Icon className={cn("h-4 w-4 mb-1", color)} />
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ChangeCard({
  label,
  value,
  unit,
  positive,
}: {
  label: string;
  value: number;
  unit: string;
  positive: boolean;
}) {
  const isZero = value === 0;
  const TrendIcon = isZero ? Minus : positive ? TrendingUp : TrendingDown;
  const color = isZero
    ? "text-muted-foreground"
    : positive
      ? "text-green-600"
      : "text-red-600";

  return (
    <div className="rounded border p-2">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className={cn("flex items-center gap-1 text-sm font-bold", color)}>
        <TrendIcon className="h-3 w-3" />
        {value > 0 ? "+" : ""}
        {value}
        <span className="text-[10px] font-normal">{unit}</span>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded border p-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "auto_executed" || status === "completed"
      ? "bg-green-500"
      : status === "running"
        ? "bg-blue-500 animate-pulse"
        : status === "failed"
          ? "bg-red-500"
          : status === "awaiting_approval"
            ? "bg-amber-500"
            : "bg-gray-300";
  return <span className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", color)} />;
}
