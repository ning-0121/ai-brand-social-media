import { NextResponse } from "next/server";
import { supabase } from "./supabase";

// ============ In-memory burst guard (per-instance, best-effort) ============

const memoryStore = new Map<string, { count: number; windowStart: number }>();

function checkMemoryLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; count: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    memoryStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, count: 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, count: entry.count };
  }
  return { allowed: true, count: entry.count };
}

// Periodic cleanup to prevent memory leaks (runs at most once per minute)
let lastCleanup = 0;
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  const cutoff = now - 120_000; // 2 min
  memoryStore.forEach((entry, key) => {
    if (entry.windowStart < cutoff) memoryStore.delete(key);
  });
}

// ============ Supabase-backed counter (authoritative for high-cost) ============

async function checkSupabaseLimit(
  key: string,
  limit: number
): Promise<{ allowed: boolean; count: number }> {
  try {
    const { data, error } = await supabase.rpc("increment_rate_limit", {
      p_key: key,
      p_window: new Date(
        Math.floor(Date.now() / 60_000) * 60_000
      ).toISOString(),
    });

    if (error) {
      // If the RPC doesn't exist yet, fall back to in-memory
      console.warn("[rate-limiter] Supabase RPC fallback:", error.message);
      return { allowed: true, count: 0 };
    }

    const count = data as number;
    return { allowed: count <= limit, count };
  } catch {
    // Network error — fail open to avoid blocking legitimate requests
    return { allowed: true, count: 0 };
  }
}

// ============ Public API ============

export type RateLimitStore = "memory" | "supabase";

interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs?: number; // default 60_000 (1 min)
  store?: RateLimitStore; // default "memory"
}

interface RateLimitResult {
  allowed: true;
  remaining: number;
  error?: never;
}

interface RateLimitDenied {
  allowed: false;
  remaining: 0;
  error: NextResponse;
}

/**
 * Check rate limit. Returns { allowed: true } or { allowed: false, error: NextResponse }.
 * Same discriminated union pattern as requireAuth().
 */
export async function checkRateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult | RateLimitDenied> {
  maybeCleanup();

  const { key, limit, windowMs = 60_000, store = "memory" } = config;

  let count: number;
  let allowed: boolean;

  if (store === "supabase") {
    const result = await checkSupabaseLimit(key, limit);
    count = result.count;
    allowed = result.allowed;
  } else {
    const result = checkMemoryLimit(key, limit, windowMs);
    count = result.count;
    allowed = result.allowed;
  }

  if (!allowed) {
    const resetAt = new Date(
      Math.ceil(Date.now() / windowMs) * windowMs
    ).toISOString();
    const retryAfter = Math.ceil(
      (Math.ceil(Date.now() / windowMs) * windowMs - Date.now()) / 1000
    );

    return {
      allowed: false,
      remaining: 0,
      error: NextResponse.json(
        {
          error: "请求过于频繁，请稍后再试",
          code: "RATE_LIMIT_EXCEEDED",
          limit,
          remaining: 0,
          reset_at: resetAt,
          retry_after_seconds: retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetAt,
          },
        }
      ),
    };
  }

  return { allowed: true, remaining: limit - count };
}

// ============ Preset helpers ============

export function rateLimitClaude(userId: string) {
  return checkRateLimit({
    key: `user:${userId}:claude`,
    limit: 10,
    store: "supabase",
  });
}

export function rateLimitGemini(userId: string) {
  return checkRateLimit({
    key: `user:${userId}:gemini`,
    limit: 5,
    store: "supabase",
  });
}

export function rateLimitAgent(userId: string) {
  return checkRateLimit({
    key: `user:${userId}:agent`,
    limit: 10,
  });
}

export function rateLimitCreative(userId: string) {
  return checkRateLimit({
    key: `user:${userId}:creative`,
    limit: 10,
  });
}

export function rateLimitByIP(ip: string, scope: string, limit = 10) {
  return checkRateLimit({
    key: `ip:${ip}:${scope}`,
    limit,
  });
}
