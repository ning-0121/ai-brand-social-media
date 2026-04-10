import type { ProviderHandler } from "../types";

async function getClient() {
  return import("../../whatsapp/client");
}

export const whatsappProvider: ProviderHandler = {
  supportedOperations: ["message.send", "media.download"],

  validate(operation: string, params: Record<string, unknown>): string | null {
    if (!this.supportedOperations.includes(operation)) {
      return `Unsupported WhatsApp operation: ${operation}`;
    }

    switch (operation) {
      case "message.send":
        if (!params.to) return "Missing 'to' phone number";
        if (!params.text) return "Missing 'text' message body";
        break;
      case "media.download":
        if (!params.media_id) return "Missing 'media_id'";
        break;
    }
    return null;
  },

  async execute(operation: string, params: Record<string, unknown>) {
    const client = await getClient();

    try {
      switch (operation) {
        case "message.send": {
          const result = await client.sendTextMessage(
            params.to as string,
            params.text as string
          );
          if (result.error) {
            return { error: result.error, httpStatus: 400 };
          }
          return { data: { wamid: result.wamid } };
        }
        case "media.download": {
          const result = await client.downloadMedia(params.media_id as string);
          if (result.error) {
            return { error: result.error, httpStatus: 400 };
          }
          return { data: { url: result.url, mime: result.mime } };
        }
        default:
          return { error: `Unknown operation: ${operation}` };
      }
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
        httpStatus: 500,
      };
    }
  },
};
