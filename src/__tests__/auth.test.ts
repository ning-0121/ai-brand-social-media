import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabaseAuth } from "./setup";

describe("API Authentication", () => {
  beforeEach(() => {
    // Reset to unauthenticated state
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  describe("requireAuth()", () => {
    it("returns 401 when no user session", async () => {
      const { requireAuth } = await import("@/lib/api-auth");
      const result = await requireAuth();
      expect(result.error).toBeDefined();
      // Extract status from the NextResponse
      expect(result.error!.status).toBe(401);
    });

    it("returns userId when valid session exists", async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      const { requireAuth } = await import("@/lib/api-auth");
      const result = await requireAuth();
      expect(result.userId).toBe("user-123");
      expect(result.error).toBeUndefined();
    });
  });

  describe("requireCronSecret()", () => {
    it("returns error when CRON_SECRET is missing", async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const { requireCronSecret } = await import("@/lib/api-auth");
      const request = new Request("http://localhost/api/cron/hourly");
      const result = requireCronSecret(request);
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(401);

      process.env.CRON_SECRET = originalSecret;
    });

    it("returns ok with correct Bearer token", async () => {
      const { requireCronSecret } = await import("@/lib/api-auth");
      const request = new Request("http://localhost/api/cron/hourly", {
        headers: { authorization: "Bearer test-cron-secret-abc123" },
      });
      const result = requireCronSecret(request);
      expect(result.ok).toBe(true);
    });

    it("returns error with wrong secret", async () => {
      const { requireCronSecret } = await import("@/lib/api-auth");
      const request = new Request("http://localhost/api/cron/hourly", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const result = requireCronSecret(request);
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(401);
    });
  });

  describe("API routes reject unauthenticated requests", () => {
    it("POST /api/campaigns returns 401", async () => {
      const { POST } = await import("@/app/api/campaigns/route");
      const request = new Request("http://localhost/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("GET /api/radar returns 401", async () => {
      const { GET } = await import("@/app/api/radar/route");
      const response = await GET();
      expect(response.status).toBe(401);
    });

    it("POST /api/workflows returns 401", async () => {
      const { POST } = await import("@/app/api/workflows/route");
      const request = new Request("http://localhost/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "launch", template_id: "x" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("POST /api/approval returns 401", async () => {
      const { POST } = await import("@/app/api/approval/route");
      const request = new Request("http://localhost/api/approval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve", id: "x" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("POST /api/whatsapp/send returns 401", async () => {
      const { POST } = await import("@/app/api/whatsapp/send/route");
      const request = new Request("http://localhost/api/whatsapp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "hello", phone: "+1234" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
