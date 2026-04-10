import type { ProviderHandler } from "../types";

/**
 * Social media draft/publish provider — STUB.
 * To be implemented when Buffer, Meta Marketing API, or direct platform APIs are integrated.
 */
export const socialDraftProvider: ProviderHandler = {
  supportedOperations: ["create_draft", "publish", "schedule"],

  validate(operation: string, params: Record<string, unknown>): string | null {
    if (!this.supportedOperations.includes(operation)) {
      return `Unsupported social draft operation: ${operation}`;
    }
    if (!params.platform) return "Missing 'platform'";
    if (!params.content) return "Missing 'content'";
    return null;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(operation: string, _params: Record<string, unknown>) {
    return {
      error: `Social draft provider not configured. Set up Buffer or platform APIs. (${operation})`,
      httpStatus: 503,
    };
  },
};
