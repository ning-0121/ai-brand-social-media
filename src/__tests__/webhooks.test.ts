import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";

// Mock the handler to avoid processing real webhooks
vi.mock("@/lib/whatsapp/handler", () => ({
  handleWebhookPayload: vi.fn().mockResolvedValue(undefined),
}));

// Mock whatsapp types
vi.mock("@/lib/whatsapp/types", () => ({
  getWhatsappConfig: () => ({
    phoneNumberId: "123456",
    accessToken: "test-wa-token",
    appSecret: "test-wa-app-secret",
    webhookVerifyToken: "test-verify-token",
  }),
}));

function generateSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

describe("WhatsApp Webhook Security", () => {
  describe("GET /api/whatsapp/webhook (verification)", () => {
    it("returns 403 when verify token is wrong", async () => {
      const { GET } = await import("@/app/api/whatsapp/webhook/route");
      const url = new URL("http://localhost/api/whatsapp/webhook");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "wrong-token");
      url.searchParams.set("hub.challenge", "challenge-123");

      const request = new Request(url.toString());
      const response = await GET(request);
      expect(response.status).toBe(403);
    });

    it("returns 200 with challenge when verify token is correct", async () => {
      const { GET } = await import("@/app/api/whatsapp/webhook/route");
      const url = new URL("http://localhost/api/whatsapp/webhook");
      url.searchParams.set("hub.mode", "subscribe");
      url.searchParams.set("hub.verify_token", "test-verify-token");
      url.searchParams.set("hub.challenge", "challenge-123");

      const request = new Request(url.toString());
      const response = await GET(request);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("challenge-123");
    });
  });

  describe("POST /api/whatsapp/webhook (signature verification)", () => {
    const validPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [],
    });

    it("returns 403 when signature is missing", async () => {
      const { POST } = await import("@/app/api/whatsapp/webhook/route");
      const request = new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        body: validPayload,
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("returns 403 when signature is invalid", async () => {
      const { POST } = await import("@/app/api/whatsapp/webhook/route");
      const request = new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "x-hub-signature-256": "sha256=invalid" },
        body: validPayload,
      });
      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it("returns 200 when signature is valid", async () => {
      const { POST } = await import("@/app/api/whatsapp/webhook/route");
      const signature = generateSignature(validPayload, "test-wa-app-secret");
      const request = new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "x-hub-signature-256": signature },
        body: validPayload,
      });
      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});
