"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PilotFeedbackForm } from "@/components/pilot/pilot-feedback-form";
import { ArrowLeft, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PilotFeedback, PilotRun } from "@/lib/pilot-data";

export default function PilotFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<PilotFeedback[]>([]);
  const [activeRun, setActiveRun] = useState<PilotRun | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/pilot?type=feedback").then((r) => r.json()),
      fetch("/api/pilot").then((r) => r.json()),
    ])
      .then(([fbData, mainData]) => {
        setFeedbackList(fbData.feedback || []);
        setActiveRun(mainData.run || null);
      })
      .catch(() => toast.error("加载反馈数据失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="用户反馈"
        description="收集试跑过程中的使用体验与改进建议"
        actions={
          <Link href="/pilot">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              返回
            </Button>
          </Link>
        }
      />

      {/* Feedback Form */}
      <PilotFeedbackForm runId={activeRun?.id} onSubmitted={fetchData} />

      {/* Submitted Feedback List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">已提交反馈 ({feedbackList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackList.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              暂无反馈记录 — 使用上方表单提交第一条反馈
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((fb) => (
                <div key={fb.id} className="rounded-md border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">{fb.module_name}</Badge>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={cn(
                              "h-3.5 w-3.5",
                              s <= fb.score ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString("zh-CN")}
                    </span>
                  </div>

                  {fb.feedback && (
                    <p className="text-sm">{fb.feedback}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {fb.most_useful && (
                      <span>最有用: <span className="text-foreground">{fb.most_useful}</span></span>
                    )}
                    {fb.least_useful && (
                      <span>最没用: <span className="text-foreground">{fb.least_useful}</span></span>
                    )}
                    {fb.time_saved_minutes !== null && fb.time_saved_minutes > 0 && (
                      <span>节省: <span className="text-foreground">{fb.time_saved_minutes} 分钟/天</span></span>
                    )}
                    {fb.would_continue !== null && (
                      <Badge variant={fb.would_continue ? "default" : "secondary"} className="text-[10px]">
                        {fb.would_continue ? "愿意继续使用" : "不愿继续"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
