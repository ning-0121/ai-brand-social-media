import { updateAuditLog } from "./audit-logger";

// ============ Error Classification ============

export interface ErrorClassification {
  retryable: boolean;
  category: "network" | "rate_limited" | "server_error" | "client_error" | "auth_error" | "validation" | "unknown";
}

/**
 * Classify an error to determine if it's retryable.
 */
export function classifyError(
  error: unknown,
  httpStatus?: number
): ErrorClassification {
  // Network / fetch errors
  if (error instanceof TypeError && String(error.message).includes("fetch")) {
    return { retryable: true, category: "network" };
  }

  if (typeof error === "string") {
    if (error.includes("ECONNREFUSED") || error.includes("ETIMEDOUT") || error.includes("ENOTFOUND")) {
      return { retryable: true, category: "network" };
    }
  }

  // HTTP status-based classification
  if (httpStatus) {
    if (httpStatus === 429) return { retryable: true, category: "rate_limited" };
    if (httpStatus === 401 || httpStatus === 403) return { retryable: false, category: "auth_error" };
    if (httpStatus >= 500) return { retryable: true, category: "server_error" };
    if (httpStatus >= 400) return { retryable: false, category: "client_error" };
  }

  return { retryable: false, category: "unknown" };
}

// ============ Execution States ============

export type ExecutionStatus = "idle" | "executing" | "success" | "failed" | "rolled_back";

export interface ExecutionStep {
  name: string;
  status: "pending" | "success" | "failed" | "rolled_back";
  data?: Record<string, unknown>;
  error?: string;
}

export interface ExecutionRecord {
  id: string;
  status: ExecutionStatus;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  error?: string;
  rollbackRef?: string;
  steps: ExecutionStep[];
}

// ============ Rollback Support ============

export type RollbackFn = (
  beforeState: Record<string, unknown>,
  params: Record<string, unknown>
) => Promise<void>;

const rollbackRegistry = new Map<string, RollbackFn>();

/**
 * Register a rollback function for a specific operation.
 */
export function registerRollback(operation: string, fn: RollbackFn): void {
  rollbackRegistry.set(operation, fn);
}

/**
 * Check if an operation supports rollback.
 */
export function canRollback(operation: string): boolean {
  return rollbackRegistry.has(operation);
}

/**
 * Execute a rollback for a given audit log entry.
 * Creates a new audit entry for the rollback action and updates the original.
 */
export async function executeRollback(
  auditLogId: string,
  operation: string,
  beforeState: Record<string, unknown>,
  params: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const fn = rollbackRegistry.get(operation);
  if (!fn) {
    return { success: false, error: `No rollback handler for: ${operation}` };
  }

  try {
    await updateAuditLog(auditLogId, { rollback_status: "pending" });
    await fn(beforeState, params);
    await updateAuditLog(auditLogId, {
      rollback_status: "completed",
      status: "rolled_back",
    });
    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await updateAuditLog(auditLogId, {
      rollback_status: "failed",
      error: `Rollback failed: ${errMsg}`,
    });
    return { success: false, error: errMsg };
  }
}

// ============ Multi-step Execution ============

/**
 * Execute multiple steps, tracking partial failures.
 * Returns 'success' if all pass, 'partial' if some fail, 'failed' if all fail.
 */
export async function executeSteps(
  steps: Array<{ name: string; fn: () => Promise<Record<string, unknown>> }>
): Promise<{
  status: "success" | "partial" | "failed";
  results: ExecutionStep[];
}> {
  const results: ExecutionStep[] = [];

  for (const step of steps) {
    try {
      const data = await step.fn();
      results.push({ name: step.name, status: "success", data });
    } catch (err) {
      results.push({
        name: step.name,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const status =
    successCount === results.length
      ? "success"
      : successCount > 0
        ? "partial"
        : "failed";

  return { status, results };
}
