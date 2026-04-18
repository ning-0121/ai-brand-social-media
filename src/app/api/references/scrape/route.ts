import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { scrapeAndAnalyze } from "@/lib/reference-scraper";

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { url, goal, rewrite } = body as { url: string; goal?: string; rewrite?: boolean };
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: "需要合法 URL（http/https）" }, { status: 400 });
    }
    const result = await scrapeAndAnalyze(url, { goal, rewrite });
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "scrape failed" },
      { status: 500 }
    );
  }
}
