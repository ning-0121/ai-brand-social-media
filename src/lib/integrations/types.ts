export interface GatewayRequest {
  provider: "shopify" | "whatsapp" | "claude" | "gemini" | "email" | "social_draft";
  operation: string;
  params: Record<string, unknown>;
  actor: {
    type: "user" | "agent" | "system" | "cron";
    id: string;
  };
  sourceAgent?: string;
  idempotencyKey?: string;
  maxRetries?: number;
  beforeState?: Record<string, unknown>;
}

export interface GatewayResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  retryable?: boolean;
  auditLogId: string | null;
  durationMs: number;
}

export interface ProviderConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

export interface ProviderHandler {
  execute(
    operation: string,
    params: Record<string, unknown>
  ): Promise<{ data?: Record<string, unknown>; error?: string; httpStatus?: number }>;

  validate(operation: string, params: Record<string, unknown>): string | null;

  supportedOperations: string[];
}

export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  shopify: {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableStatuses: [429, 500, 502, 503, 504],
  },
  whatsapp: {
    maxRetries: 1,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    retryableStatuses: [429, 500, 502, 503],
  },
  claude: {
    maxRetries: 1,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
    retryableStatuses: [429, 500, 529],
  },
  gemini: {
    maxRetries: 1,
    baseDelayMs: 2000,
    maxDelayMs: 15000,
    retryableStatuses: [429, 500, 503],
  },
  email: {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    retryableStatuses: [429, 500, 502, 503],
  },
  social_draft: {
    maxRetries: 1,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    retryableStatuses: [429, 500],
  },
};
