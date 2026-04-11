"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActionImpact {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  before_metrics: Record<string, number>;
  after_metrics: Record<string, number>;
  impact_score: number | null;
  revenue_impact: number | null;
  measured_at: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  "seo.quick_apply": "SEO 快速应用",
  "product_page.deploy": "产品页部署",
  "approval.approve": "审批通过",
  "skill.execute": "技能执行",
  "auto_ops.daily": "每日自动运维",
};

export function ActionImpactList() {
  const [impacts, setImpacts] = useState<ActionImpact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics?type=action_impacts&limit=15")
      .then((r) => r.json())
      .then((data) => setImpacts(data.impacts || []))
      .catch(() => toast.error("加载效果追踪失败"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">AI 操作效果追踪</CardTitle>
      </CardHeader>
      <CardContent>
        {impacts.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            暂无效果数据。AI 操作执行 7 天后将自动记录效果指标。
          </div>
        ) : (
          <div className="space-y-3">
            {impacts.map((impact) => (
              <div
                key={impact.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                {/* Impact indicator */}
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold",
                    impact.impact_score === null
                      ? "bg-muted text-muted-foreground"
                      : impact.impact_score >= 60
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : impact.impact_score >= 40
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {impact.impact_score !== null
                    ? Math.round(impact.impact_score)
                    : "?"}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {ACTION_LABELS[impact.action_type] || impact.action_type}
                    </span>
                    {impact.measured_at ? (
                      <Badge variant="outline" className="text-[10px]">已测量</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-600">等待中</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {impact.target_type}:{impact.target_id?.slice(0, 8)}
                    {" · "}
                    {new Date(impact.created_at).toLocaleDateString("zh-CN")}
                  </div>
                </div>

                {/* Metrics delta */}
                {impact.after_metrics && Object.keys(impact.after_metrics).length > 0 && (
                  <div className="text-right">
                    {impact.before_metrics?.seo_score !== undefined && impact.after_metrics?.seo_score !== undefined && (
                      <div className="text-xs">
                        SEO: {impact.before_metrics.seo_score} → {impact.after_metrics.seo_score}
                      </div>
                    )}
                    {impact.revenue_impact !== null && impact.revenue_impact > 0 && (
                      <div className="text-xs text-emerald-600 font-medium">
                        +${impact.revenue_impact}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
