import type { ProviderHandler } from "../types";

/**
 * Email provider — STUB.
 * To be implemented when an email service (SendGrid, Resend, etc.) is chosen.
 */
export const emailProvider: ProviderHandler = {
  supportedOperations: ["send"],

  validate(operation: string, params: Record<string, unknown>): string | null {
    if (operation !== "send") {
      return `Unsupported email operation: ${operation}`;
    }
    if (!params.to) return "Missing 'to' email address";
    if (!params.subject) return "Missing 'subject'";
    if (!params.body) return "Missing 'body'";
    return null;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(operation: string, _params: Record<string, unknown>) {
    if (operation === "send") {
      return {
        error: "Email provider not configured. Set up SendGrid/Resend in environment.",
        httpStatus: 503,
      };
    }
    return { error: `Unknown operation: ${operation}` };
  },
};
