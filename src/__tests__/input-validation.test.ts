import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabaseAuth } from "./setup";

// Mock Google GenAI (must be at top level)
vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = { generateContent: vi.fn() };
  },
}));
vi.mock("@/lib/image-generation", () => ({
  uploadBase64ToStorage: vi.fn(),
}));
vi.mock("@/lib/whatsapp/ai-replier", () => ({
  generateAiReply: vi.fn(),
}));

// Mock heavy dependencies to avoid import errors
vi.mock("@/lib/shopify-operations", () => ({
  syncProducts: vi.fn(),
  syncOrders: vi.fn(),
  syncCustomers: vi.fn(),
  syncAll: vi.fn(),
  updateProductSEO: vi.fn(),
  updateProductInfo: vi.fn(),
  updateProductPrice: vi.fn(),
  updateProductInventory: vi.fn(),
  testShopifyConnection: vi.fn(),
}));

vi.mock("@/lib/workflow-engine", () => ({
  onApprovalDecision: vi.fn(),
}));

describe("Input Validation", () => {
  beforeEach(() => {
    // Authenticated user for these tests
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
  });

  describe("POST /api/shopify", () => {
    it("returns 400 without integration_id", async () => {
      const { POST } = await import("@/app/api/shopify/route");
      const request = new Request("http://localhost/api/shopify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("integration_id");
    });
  });

  describe("POST /api/shopify/test-connection", () => {
    it("returns 400 without domain and access_token", async () => {
      const { POST } = await import(
        "@/app/api/shopify/test-connection/route"
      );
      const request = new Request(
        "http://localhost/api/shopify/test-connection",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/generate-image", () => {
    it("returns 400 without prompt", async () => {
      const { POST } = await import("@/app/api/generate-image/route");
      const request = new Request("http://localhost/api/generate-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/chat/message", () => {
    it("returns 400 with empty message", async () => {
      const { POST } = await import("@/app/api/chat/message/route");
      const request = new Request("http://localhost/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "  " }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
});
