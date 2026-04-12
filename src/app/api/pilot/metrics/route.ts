import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    // Aggregate from existing tables
    const [auditRes, approvalRes, contentQueueRes] = await Promise.all([
      supabase.from("audit_logs").select("status, action_type, duration_ms").gte("created_at", since),
      supabase.from("approval_tasks").select("status").gte("created_at", since),
      supabase.from("content_queue").select("status").gte("created_at", since),
    ]);

    const audits = auditRes.data || [];
    const approvals = approvalRes.data || [];
    const queueItems = contentQueueRes.data || [];

    // Execution metrics
    const totalExecutions = audits.length;
    const successExecutions = audits.filter((a) => a.status === "success").length;
    const failedExecutions = audits.filter((a) => a.status === "failed").length;
    const rolledBack = audits.filter((a) => a.status === "rolled_back").length;
    const avgDuration = totalExecutions > 0
      ? Math.round(audits.reduce((s, a) => s + (a.duration_ms || 0), 0) / totalExecutions)
      : 0;

    // Approval metrics
    const totalApprovals = approvals.length;
    const approvedCount = approvals.filter((a) => a.status === "approved" || a.status === "executed").length;

    // Content queue metrics
    const totalQueued = queueItems.length;
    const publishedCount = queueItems.filter((q) => q.status === "published").length;

    // Feature usage (top + bottom)
    const usageMap: Record<string, number> = {};
    for (const a of audits) {
      const key = a.action_type?.split(".")[0] || "unknown";
      usageMap[key] = (usageMap[key] || 0) + 1;
    }
    const usageSorted = Object.entries(usageMap).sort((a, b) => b[1] - a[1]);

    // SEO specific
    const seoActions = audits.filter((a) => a.action_type?.includes("seo"));
    const seoApplied = seoActions.filter((a) => a.status === "success").length;

    return NextResponse.json({
      execution_count: totalExecutions,
      execution_success_rate: totalExecutions > 0 ? Math.round((successExecutions / totalExecutions) * 100) : 0,
      execution_error_rate: totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0,
      rollback_rate: totalExecutions > 0 ? Math.round((rolledBack / totalExecutions) * 100) : 0,
      avg_duration_ms: avgDuration,
      approval_rate: totalApprovals > 0 ? Math.round((approvedCount / totalApprovals) * 100) : 0,
      content_publish_rate: totalQueued > 0 ? Math.round((publishedCount / totalQueued) * 100) : 0,
      seo_apply_rate: seoActions.length > 0 ? Math.round((seoApplied / seoActions.length) * 100) : 0,
      feature_usage_top: usageSorted.slice(0, 5).map(([name, count]) => ({ name, count })),
      feature_usage_bottom: usageSorted.slice(-5).reverse().map(([name, count]) => ({ name, count })),
      total_approvals: totalApprovals,
      total_queued: totalQueued,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "查询失败" }, { status: 500 });
  }
}
