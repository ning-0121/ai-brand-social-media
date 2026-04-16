/**
 * 失败诊断器 — 对失败任务分析原因 + 给出修复方案 + 自动重试
 */

import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";

export interface FailureDiagnosis {
  error_type: "rate_limit" | "auth" | "timeout" | "data_missing" | "api_error" | "qa_rejected" | "unknown";
  reason: string;
  severity: "low" | "medium" | "high";
  auto_retryable: boolean;
  retry_after_minutes: number;
  suggested_actions: Array<{ action: string; type: "retry" | "reauth" | "manual" | "skip" }>;
}

// 基于错误字符串判断类型（快速本地分析）
export function classifyError(errorMsg: string): FailureDiagnosis["error_type"] {
  const lower = errorMsg.toLowerCase();
  if (lower.includes("rate") || lower.includes("429") || lower.includes("too many")) return "rate_limit";
  if (lower.includes("403") || lower.includes("401") || lower.includes("unauthorized") || lower.includes("token")) return "auth";
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("econnreset")) return "timeout";
  if (lower.includes("qa_rejected") || lower.includes("qa")) return "qa_rejected";
  if (lower.includes("not found") || lower.includes("missing") || lower.includes("null")) return "data_missing";
  if (lower.includes("api") || lower.includes("500") || lower.includes("502") || lower.includes("503")) return "api_error";
  return "unknown";
}

const DIAGNOSIS_TEMPLATES: Record<FailureDiagnosis["error_type"], Omit<FailureDiagnosis, "reason">> = {
  rate_limit: {
    error_type: "rate_limit",
    severity: "low",
    auto_retryable: true,
    retry_after_minutes: 15,
    suggested_actions: [
      { action: "15 分钟后自动重试", type: "retry" },
    ],
  },
  auth: {
    error_type: "auth",
    severity: "high",
    auto_retryable: false,
    retry_after_minutes: 0,
    suggested_actions: [
      { action: "重新授权 Shopify / 社媒账号", type: "reauth" },
      { action: "检查 access_token 是否过期", type: "manual" },
    ],
  },
  timeout: {
    error_type: "timeout",
    severity: "medium",
    auto_retryable: true,
    retry_after_minutes: 5,
    suggested_actions: [
      { action: "5 分钟后自动重试", type: "retry" },
      { action: "如持续失败可能需要拆分任务", type: "manual" },
    ],
  },
  qa_rejected: {
    error_type: "qa_rejected",
    severity: "medium",
    auto_retryable: true,
    retry_after_minutes: 60,
    suggested_actions: [
      { action: "1 小时后重新生成", type: "retry" },
      { action: "检查产品信息是否完整", type: "manual" },
      { action: "跳过此商品", type: "skip" },
    ],
  },
  data_missing: {
    error_type: "data_missing",
    severity: "high",
    auto_retryable: false,
    retry_after_minutes: 0,
    suggested_actions: [
      { action: "检查产品是否已同步到 Shopify", type: "manual" },
      { action: "跳过此任务", type: "skip" },
    ],
  },
  api_error: {
    error_type: "api_error",
    severity: "medium",
    auto_retryable: true,
    retry_after_minutes: 30,
    suggested_actions: [
      { action: "30 分钟后重试（可能是临时服务中断）", type: "retry" },
    ],
  },
  unknown: {
    error_type: "unknown",
    severity: "medium",
    auto_retryable: false,
    retry_after_minutes: 0,
    suggested_actions: [
      { action: "查看技术细节", type: "manual" },
      { action: "跳过", type: "skip" },
    ],
  },
};

export async function diagnoseFailure(task: {
  id: string;
  task_type: string;
  title: string;
  target_product_name?: string | null;
  execution_result?: Record<string, unknown> | null;
}): Promise<FailureDiagnosis> {
  const errorMsg = String(task.execution_result?.error || "");
  const type = classifyError(errorMsg);
  const template = DIAGNOSIS_TEMPLATES[type];

  // 快速模板（不调 LLM）
  const baseReason = {
    rate_limit: "API 调用频率超限",
    auth: "认证失败 — token 可能过期",
    timeout: "执行超时 — 可能是网络或服务慢",
    qa_rejected: "AI 生成内容未通过质量检查",
    data_missing: "缺少必要数据 — 产品或关联信息不完整",
    api_error: "第三方 API 错误",
    unknown: "未知错误",
  }[type];

  // 对严重问题用 LLM 深度分析
  let detailedReason = baseReason;
  if (template.severity === "high" || type === "unknown") {
    try {
      const aiResult = await callLLM(
        "你是 DevOps 工程师。分析错误信息，用一句话（20字内）说明最可能的原因。直接说，不要废话。",
        `任务: ${task.title}
类型: ${task.task_type}
错误: ${errorMsg.slice(0, 300)}
返回一句话，不要返回 JSON。`,
        200
      );
      const text = typeof aiResult === "string" ? aiResult : (aiResult as Record<string, unknown>).raw_text as string;
      if (text && text.length < 200) detailedReason = text.trim();
    } catch {
      // fallback 到模板
    }
  }

  return { ...template, reason: detailedReason };
}

/**
 * 自动重试适格的失败任务
 * 由 hourly cron 调用
 */
export async function autoRetryFailedTasks(): Promise<{ retried: number; requeued_task_ids: string[] }> {
  // 找出所有失败任务中可自动重试且时间到了的
  const { data: failedTasks } = await supabase
    .from("ops_daily_tasks")
    .select("id, task_type, title, target_product_name, execution_result, updated_at")
    .eq("execution_status", "failed")
    .order("updated_at", { ascending: true })
    .limit(20);

  if (!failedTasks || failedTasks.length === 0) return { retried: 0, requeued_task_ids: [] };

  const now = Date.now();
  const toRetry: string[] = [];

  for (const task of failedTasks) {
    const errorMsg = String(task.execution_result?.error || "");
    const type = classifyError(errorMsg);
    const template = DIAGNOSIS_TEMPLATES[type];

    if (!template.auto_retryable) continue;

    const updatedTime = new Date(task.updated_at).getTime();
    const elapsedMin = (now - updatedTime) / 60000;
    if (elapsedMin < template.retry_after_minutes) continue;

    // 已重试次数限制（最多 3 次）
    const retryCount = (task.execution_result?.retry_count as number) || 0;
    if (retryCount >= 3) continue;

    toRetry.push(task.id);
  }

  if (toRetry.length === 0) return { retried: 0, requeued_task_ids: [] };

  // 重置为 pending，增加 retry_count
  for (const taskId of toRetry) {
    const task = failedTasks.find(t => t.id === taskId);
    const prevCount = (task?.execution_result?.retry_count as number) || 0;
    await supabase.from("ops_daily_tasks").update({
      execution_status: "pending",
      execution_result: { retry_count: prevCount + 1, last_error: task?.execution_result?.error },
      updated_at: new Date().toISOString(),
    }).eq("id", taskId);
  }

  return { retried: toRetry.length, requeued_task_ids: toRetry };
}
