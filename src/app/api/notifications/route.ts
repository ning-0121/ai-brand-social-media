import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  type: "approval" | "failure" | "ops";
  title: string;
  description: string;
  timestamp: string;
  href?: string;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const items: NotificationItem[] = [];

    // 1. Pending approval tasks
    const { data: pendingApprovals } = await supabase
      .from("approval_tasks")
      .select("id, title, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    if (pendingApprovals) {
      for (const task of pendingApprovals) {
        items.push({
          id: `approval-${task.id}`,
          type: "approval",
          title: "待审批",
          description: task.title || "新的审批任务",
          timestamp: task.created_at,
          href: "/approvals",
        });
      }
    }

    // 2. Failed approval executions (last 24h)
    const { data: failedApprovals } = await supabase
      .from("approval_tasks")
      .select("id, title, updated_at")
      .eq("status", "failed")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(3);

    if (failedApprovals) {
      for (const task of failedApprovals) {
        items.push({
          id: `fail-approval-${task.id}`,
          type: "failure",
          title: "执行失败",
          description: task.title || "审批任务执行失败",
          timestamp: task.updated_at,
          href: "/approvals",
        });
      }
    }

    // 3. Audit log failures (last 24h)
    const { data: auditFailures } = await supabase
      .from("audit_logs")
      .select("id, action_type, error, created_at")
      .eq("status", "failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5);

    if (auditFailures) {
      for (const log of auditFailures) {
        items.push({
          id: `audit-${log.id}`,
          type: "failure",
          title: "操作失败",
          description: log.error || log.action_type,
          timestamp: log.created_at,
          href: "/ops-cockpit",
        });
      }
    }

    // 4. Recent auto-ops runs (last 24h)
    const { data: opsLogs } = await supabase
      .from("auto_ops_logs")
      .select("id, run_type, results_summary, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(3);

    if (opsLogs) {
      for (const log of opsLogs) {
        const summary = log.results_summary as Record<string, unknown> | null;
        const success = (summary?.success as number) || 0;
        const failed = (summary?.failed as number) || 0;
        items.push({
          id: `ops-${log.id}`,
          type: "ops",
          title: `自动运维 (${log.run_type})`,
          description: `${success} 成功, ${failed} 失败`,
          timestamp: log.created_at,
          href: "/ops-cockpit",
        });
      }
    }

    // Sort all by timestamp descending
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      items: items.slice(0, 20),
      unreadCount: items.filter((i) => i.type === "approval" || i.type === "failure").length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
