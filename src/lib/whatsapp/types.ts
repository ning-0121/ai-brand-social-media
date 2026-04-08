// WhatsApp Business Cloud API types
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

export interface WhatsappWebhookEntry {
  id: string;
  changes: {
    value: WhatsappWebhookValue;
    field: string;
  }[];
}

export interface WhatsappWebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: {
    profile: { name: string };
    wa_id: string;
  }[];
  messages?: WhatsappIncomingMessage[];
  statuses?: WhatsappStatus[];
}

export interface WhatsappIncomingMessage {
  from: string; // E.164 without +
  id: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "voice" | "button" | "interactive";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; filename: string; caption?: string };
  audio?: { id: string; mime_type: string };
  video?: { id: string; mime_type: string; caption?: string };
  context?: { from: string; id: string };
}

export interface WhatsappStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message: string }[];
}

export interface WhatsappWebhookPayload {
  object: "whatsapp_business_account";
  entry: WhatsappWebhookEntry[];
}

export interface SendTextRequest {
  to: string; // E.164 without +
  text: string;
  preview_url?: boolean;
}

export interface WhatsappConfig {
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  webhookVerifyToken: string;
}

export function getWhatsappConfig(): WhatsappConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!phoneNumberId || !accessToken || !appSecret || !webhookVerifyToken) return null;
  return { phoneNumberId, accessToken, appSecret, webhookVerifyToken };
}
