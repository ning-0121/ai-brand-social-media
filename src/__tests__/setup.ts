import { vi } from "vitest";

// ---------- Mock environment variables ----------
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.CRON_SECRET = "test-cron-secret-abc123";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
process.env.WHATSAPP_ACCESS_TOKEN = "test-wa-token";
process.env.WHATSAPP_APP_SECRET = "test-wa-app-secret";
process.env.WHATSAPP_VERIFY_TOKEN = "test-verify-token";

// ---------- Mock next/headers ----------
const mockCookies = {
  getAll: () => [],
  get: () => undefined,
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: () => mockCookies,
  headers: () => new Map(),
}));

// ---------- Mock Supabase SSR ----------
const mockSupabaseAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
};

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => mockSupabaseClient,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

// ---------- Mock @/lib/supabase (the singleton) ----------
vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabaseClient,
}));

// ---------- Export helpers for tests ----------
export { mockSupabaseAuth, mockSupabaseClient, mockCookies };
