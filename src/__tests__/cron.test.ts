import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the task runners to avoid executing real logic
vi.mock("@/lib/auto-ops-engine", () => ({
  runHourlyTasks: vi.fn().mockResolvedValue([]),
  runDailyTasks: vi.fn().mockResolvedValue([]),
}));

describe("Cron Endpoint Security", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret-abc123";
  });

  describe("GET /api/cron/hourly", () => {
    it("returns 401 without authorization header", async () => {
      const { GET } = await import("@/app/api/cron/hourly/route");
      const request = new Request("http://localhost/api/cron/hourly");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 with wrong secret", async () => {
      const { GET } = await import("@/app/api/cron/hourly/route");
      const request = new Request("http://localhost/api/cron/hourly", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 200 with correct secret", async () => {
      const { GET } = await import("@/app/api/cron/hourly/route");
      const request = new Request("http://localhost/api/cron/hourly", {
        headers: { authorization: "Bearer test-cron-secret-abc123" },
      });
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it("returns 401 when CRON_SECRET is not set", async () => {
      delete process.env.CRON_SECRET;
      // Re-import to get fresh module with missing env var
      vi.resetModules();
      const mod = await import("@/app/api/cron/hourly/route");
      const request = new Request("http://localhost/api/cron/hourly", {
        headers: { authorization: "Bearer anything" },
      });
      const response = await mod.GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/cron/daily", () => {
    it("returns 401 without authorization header", async () => {
      const { GET } = await import("@/app/api/cron/daily/route");
      const request = new Request("http://localhost/api/cron/daily");
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 with wrong secret", async () => {
      const { GET } = await import("@/app/api/cron/daily/route");
      const request = new Request("http://localhost/api/cron/daily", {
        headers: { authorization: "Bearer wrong-secret" },
      });
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});
