import { getWhatsappConfig } from "./types";

const GRAPH_API = "https://graph.facebook.com/v18.0";

export async function sendTextMessage(to: string, text: string): Promise<{ wamid?: string; error?: string }> {
  const cfg = getWhatsappConfig();
  if (!cfg) return { error: "WhatsApp 未配置环境变量" };

  // 清理 to: 去掉前导 +
  const normalizedTo = to.startsWith("+") ? to.slice(1) : to;

  const url = `${GRAPH_API}/${cfg.phoneNumberId}/messages`;
  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizedTo,
    type: "text",
    text: { body: text, preview_url: false },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || `HTTP ${res.status}` };
    return { wamid: data?.messages?.[0]?.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "send failed" };
  }
}

export async function downloadMedia(mediaId: string): Promise<{ url?: string; mime?: string; error?: string }> {
  const cfg = getWhatsappConfig();
  if (!cfg) return { error: "WhatsApp 未配置" };

  try {
    const res = await fetch(`${GRAPH_API}/${mediaId}`, {
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message };
    return { url: data.url, mime: data.mime_type };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "download failed" };
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const cfg = getWhatsappConfig();
  if (!cfg) return false;

  // Meta sends X-Hub-Signature-256: sha256=<hash>
  // We'd need crypto.createHmac to verify properly
  // For now we trust the webhook in development; production requires proper verification
  // (Node crypto module is available in Next.js routes)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", cfg.appSecret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
