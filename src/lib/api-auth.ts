import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { TeamRole } from "./permissions";

/**
 * Get the authenticated user ID from the request cookies.
 * Returns null if the user is not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in API routes
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

interface AuthResult {
  userId: string;
  teamId?: string;
  role?: TeamRole;
  error?: never;
}

interface AuthError {
  userId?: never;
  teamId?: never;
  role?: never;
  error: NextResponse;
}

/**
 * Require authentication for an API route.
 * Returns userId + teamId + role if authenticated.
 * Team info is loaded lazily (only if teams table exists).
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const userId = await getAuthUserId();
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "未登录，请先登录" },
        { status: 401 }
      ),
    };
  }

  // Try to load team membership (non-blocking, gracefully handles missing table)
  try {
    const { supabase } = await import("./supabase");
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (membership) {
      return {
        userId,
        teamId: membership.team_id,
        role: membership.role as TeamRole,
      };
    }
  } catch {
    // teams table may not exist yet — continue without team info
  }

  return { userId };
}

/**
 * Require a valid CRON_SECRET for cron endpoints.
 * Returns a 401 response if the secret is missing or invalid.
 */
export function requireCronSecret(
  request: Request
): { ok: true; error?: never } | { ok?: never; error: NextResponse } {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true };
}
