import {
  type GatewayRequest,
  type GatewayResponse,
  type ProviderHandler,
  PROVIDER_CONFIGS,
} from "./types";
import { logAudit, checkIdempotency } from "../audit-logger";
import { classifyError } from "../execution-state-machine";

// Lazy-loaded provider registry
const providers: Record<string, () => Promise<ProviderHandler>> = {
  shopify: () =>
    import("./providers/shopify").then((m) => m.shopifyProvider),
  whatsapp: () =>
    import("./providers/whatsapp").then((m) => m.whatsappProvider),
  email: () =>
    import("./providers/email").then((m) => m.emailProvider),
  social_draft: () =>
    import("./providers/social-draft").then((m) => m.socialDraftProvider),
};

/**
 * Unified entry point for all external integrations.
 *
 * Flow: validate → idempotency check → execute with retry → audit log
 */
export async function executeIntegration(
  request: GatewayRequest
): Promise<GatewayResponse> {
  const startTime = Date.now();
  const config = PROVIDER_CONFIGS[request.provider];
  if (!config) {
    return {
      success: false,
      error: `Unknown provider: ${request.provider}`,
      auditLogId: null,
      durationMs: Date.now() - startTime,
    };
  }

  // 1. Load provider
  const loaderFn = providers[request.provider];
  if (!loaderFn) {
    return {
      success: false,
      error: `Provider not implemented: ${request.provider}`,
      auditLogId: null,
      durationMs: Date.now() - startTime,
    };
  }

  let provider: ProviderHandler;
  try {
    provider = await loaderFn();
  } catch {
    return {
      success: false,
      error: `Failed to load provider: ${request.provider}`,
      auditLogId: null,
      durationMs: Date.now() - startTime,
    };
  }

  // 2. Validate params
  const validationError = provider.validate(request.operation, request.params);
  if (validationError) {
    const auditLogId = await logAudit({
      actorType: request.actor.type,
      actorId: request.actor.id,
      sourceAgent: request.sourceAgent,
      actionType: `${request.provider}.${request.operation}`,
      provider: request.provider,
      requestPayload: request.params,
      status: "failed",
      error: `Validation: ${validationError}`,
      durationMs: Date.now() - startTime,
    });
    return {
      success: false,
      error: validationError,
      auditLogId,
      durationMs: Date.now() - startTime,
    };
  }

  // 3. Check idempotency
  if (request.idempotencyKey) {
    const existing = await checkIdempotency(request.idempotencyKey);
    if (existing) {
      return {
        success: true,
        data: existing.response_payload as Record<string, unknown>,
        auditLogId: existing.id,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // 4. Execute with retry
  const maxRetries = request.maxRetries ?? config.maxRetries;
  let lastError: string | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await provider.execute(request.operation, request.params);

      if (result.error) {
        const classification = classifyError(result.error, result.httpStatus);

        if (classification.retryable && attempt < maxRetries) {
          retryCount++;
          const delay = Math.min(
            config.baseDelayMs * Math.pow(2, attempt),
            config.maxDelayMs
          );
          await sleep(delay);
          lastError = result.error;
          continue;
        }

        // Non-retryable or exhausted retries
        const auditLogId = await logAudit({
          actorType: request.actor.type,
          actorId: request.actor.id,
          sourceAgent: request.sourceAgent,
          actionType: `${request.provider}.${request.operation}`,
          targetType: request.params.target_type as string,
          targetId: request.params.target_id as string,
          provider: request.provider,
          requestPayload: request.params,
          status: "failed",
          error: result.error,
          idempotencyKey: request.idempotencyKey,
          durationMs: Date.now() - startTime,
          retryCount,
        });

        return {
          success: false,
          error: result.error,
          retryable: classification.retryable,
          auditLogId,
          durationMs: Date.now() - startTime,
        };
      }

      // Success
      const auditLogId = await logAudit({
        actorType: request.actor.type,
        actorId: request.actor.id,
        sourceAgent: request.sourceAgent,
        actionType: `${request.provider}.${request.operation}`,
        targetType: request.params.target_type as string,
        targetId: request.params.target_id as string,
        provider: request.provider,
        requestPayload: request.params,
        responsePayload: result.data,
        status: "success",
        idempotencyKey: request.idempotencyKey,
        durationMs: Date.now() - startTime,
        retryCount,
      });

      return {
        success: true,
        data: result.data,
        auditLogId,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const classification = classifyError(err);

      if (classification.retryable && attempt < maxRetries) {
        retryCount++;
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt),
          config.maxDelayMs
        );
        await sleep(delay);
        lastError = errMsg;
        continue;
      }

      lastError = errMsg;
    }
  }

  // All retries exhausted
  const auditLogId = await logAudit({
    actorType: request.actor.type,
    actorId: request.actor.id,
    sourceAgent: request.sourceAgent,
    actionType: `${request.provider}.${request.operation}`,
    provider: request.provider,
    requestPayload: request.params,
    status: "failed",
    error: lastError || "Unknown error after retries",
    idempotencyKey: request.idempotencyKey,
    durationMs: Date.now() - startTime,
    retryCount,
  });

  return {
    success: false,
    error: lastError || "Unknown error after retries",
    retryable: false,
    auditLogId,
    durationMs: Date.now() - startTime,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
