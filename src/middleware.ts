import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes: redirect to login if not authenticated
  const protectedPaths = ["/dashboard", "/trends", "/content", "/store", "/social", "/skills", "/strategy", "/live", "/influencers", "/ads", "/channels", "/settings", "/approvals", "/onboarding"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in? Redirect away from auth pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Onboarding gate: check both user_metadata AND actual integration
  if (user && isProtected && !pathname.startsWith("/onboarding")) {
    const onboardingComplete = user.user_metadata?.onboarding_complete === true;

    if (!onboardingComplete) {
      // Double-check: query integrations table for active Shopify
      const { data: integration } = await supabase
        .from("integrations")
        .select("id")
        .eq("platform", "shopify")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!integration) {
        // No Shopify integration found — force onboarding
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
      // Has integration but metadata not set — fix metadata silently
      // (user will continue to app, metadata will be updated on next onboarding visit)
    }
  }

  // If user is onboarded and tries to access /onboarding, redirect to dashboard
  if (user && pathname.startsWith("/onboarding")) {
    const onboardingComplete = user.user_metadata?.onboarding_complete === true;
    if (onboardingComplete) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
