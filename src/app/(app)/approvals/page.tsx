"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { TaskCard } from "@/components/approval/task-card";
import { useSupabase } from "@/hooks/use-supabase";
import { getApprovalTasks, getApprovalKPIs } from "@/lib/supabase-approval";
import type { ApprovalTask, ApprovalStatus } from "@/lib/approval-types";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS: { label: string; value: ApprovalStatus | "all" }[] = [
  { label: "全部", value: "all" },
  { label: "待审批", value: "pending" },
  { label: "已执行", value: "executed" },
  { label: "已拒绝", value: "rejected" },
  { label: "失败", value: "failed" },
];

const mockTasks: ApprovalTask[] = [
  {
    id: "demo-1",
    type: "seo_update",
    entity_id: "prod-1",
    entity_type: "products",
    title: "SEO 优化: 经典白色 T 恤",
    description: "AI 分析后生成的 SEO 优化方案，包含标题、描述和关键词优化",
    payload: {
      old_values: {
        title: "白色T恤",
        meta_title: "",
        meta_description: "",
        tags: "t-shirt",
      },
      new_values: {
        title: "经典纯棉白色T恤 | 男女通穿基础款 | BrandMind",
        meta_title: "经典纯棉白色T恤 - 舒适百搭基础款 | BrandMind",
        meta_description:
          "BrandMind 经典纯棉白色T恤，200g重磅棉质，男女通穿，舒适透气，百搭基础款。限时特惠，立即选购。",
        tags: "t-shirt,白色T恤,纯棉,基础款,男女通穿,百搭",
      },
      shopify_product_id: 123456,
      integration_id: "int-1",
    },
    status: "pending",
    created_by: "ai",
    reviewed_by: null,
    reviewed_at: null,
    execution_result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockKPIs = {
  pending: 3,
  approvedToday: 5,
  executed: 12,
  failed: 1,
  total: 21,
};

export default function ApprovalsPage() {
  const { data: initialTasks } = useSupabase(getApprovalTasks, mockTasks);
  const { data: kpis } = useSupabase(getApprovalKPIs, mockKPIs);
  const [localTasks, setLocalTasks] = useState<ApprovalTask[] | null>(null);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");

  const tasks = localTasks ?? initialTasks;

  const refreshTasks = useCallback(async () => {
    const data = await getApprovalTasks();
    setLocalTasks(data);
  }, []);

  const handleApprove = async (id: string) => {
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
    });
    if (res.ok) await refreshTasks();
  };

  const handleReject = async (id: string) => {
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", id }),
    });
    if (res.ok) await refreshTasks();
  };

  const handleRetry = async (id: string) => {
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry", id }),
    });
    if (res.ok) await refreshTasks();
  };

  const filteredTasks =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  const kpiCards = [
    {
      label: "待审批",
      value: kpis.pending,
      trend: "flat" as const,
      icon: "ClipboardCheck",
    },
    {
      label: "今日已执行",
      value: kpis.approvedToday,
      trend: "up" as const,
      icon: "CheckCircle2",
    },
    {
      label: "累计执行",
      value: kpis.executed,
      trend: "up" as const,
      icon: "Clock",
    },
    {
      label: "失败任务",
      value: kpis.failed,
      trend: kpis.failed > 0 ? ("down" as const) : ("flat" as const),
      icon: "XCircle",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="审批中心"
        description="审核 AI 生成的操作，批准后自动执行到 Shopify 等平台"
      />

      <KPICardGrid>
        {kpiCards.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value === "pending" && kpis.pending > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                {kpis.pending}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">
              {filter === "pending"
                ? "没有待审批的任务"
                : "暂无审批记录"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onApprove={handleApprove}
              onReject={handleReject}
              onRetry={handleRetry}
            />
          ))
        )}
      </div>
    </div>
  );
}
