import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

/**
 * Require authentication for an API route.
 * Returns the user ID if authenticated, or a 401 response if not.
 */
export async function requireAuth(): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const userId = await getAuthUserId();
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "未登录，请先登录" },
        { status: 401 }
      ),
    };
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
