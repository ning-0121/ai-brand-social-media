import { supabase } from "./supabase";

export interface AuditEntry {
  actorType: "user" | "agent" | "system" | "cron";
  actorId?: string;
  sourceAgent?: string;
  actionType: string;
  targetType?: string;
  targetId?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  status?: "success" | "failed" | "rolled_back" | "partial";
  error?: string;
  rollbackStatus?: "pending" | "completed" | "failed" | null;
  rollbackRef?: string;
  idempotencyKey?: string;
  provider?: string;
  durationMs?: number;
  retryCount?: number;
}

/**
 * Write an entry to the audit_logs table.
 * Non-blocking by default — fire-and-forget to avoid slowing down the caller.
 * Use `await logAudit(...)` if you need the inserted row ID.
 */
export async function logAudit(entry: AuditEntry): Promise<string | null> {
  try {
    const row = {
      actor_type: entry.actorType,
      actor_id: entry.actorId || null,
      source_agent: entry.sourceAgent || null,
      action_type: entry.actionType,
      target_type: entry.targetType || null,
      target_id: entry.targetId || null,
      request_payload: truncatePayload(entry.requestPayload || {}),
      response_payload: truncatePayload(entry.responsePayload || {}),
      status: entry.status || "success",
      error: entry.error ? String(entry.error).slice(0, 2000) : null,
      rollback_status: entry.rollbackStatus || null,
      rollback_ref: entry.rollbackRef || null,
      idempotency_key: entry.idempotencyKey || null,
      provider: entry.provider || null,
      duration_ms: entry.durationMs || null,
      retry_count: entry.retryCount || 0,
    };

    const { data, error } = await supabase
      .from("audit_logs")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      console.error("[audit-logger] Failed to write audit log:", error.message);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    // Never let audit logging break the caller
    console.error("[audit-logger] Unexpected error:", err);
    return null;
  }
}

/**
 * Update an existing audit log entry (e.g., to set rollback_status).
 */
export async function updateAuditLog(
  id: string,
  updates: Partial<{
    status: string;
    error: string;
    rollback_status: string;
    rollback_ref: string;
    response_payload: Record<string, unknown>;
  }>
): Promise<void> {
  try {
    await supabase.from("audit_logs").update(updates).eq("id", id);
  } catch (err) {
    console.error("[audit-logger] Failed to update audit log:", err);
  }
}

/**
 * Check idempotency: returns the existing audit log if found.
 */
export async function checkIdempotency(
  key: string
): Promise<{ id: string; response_payload: Record<string, unknown> } | null> {
  const { data } = await supabase
    .from("audit_logs")
    .select("id, response_payload")
    .eq("idempotency_key", key)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();
  return data || null;
}

/**
 * Truncate large payloads to avoid bloating the audit table.
 * Keeps the first 5KB of JSON.
 */
function truncatePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(payload);
  if (json.length <= 5000) return payload;
  try {
    return JSON.parse(json.slice(0, 5000) + '..."}}');
  } catch {
    return { _truncated: true, _size: json.length };
  }
}
