import { NextResponse } from "next/server";
import { summarizeRecentOutcomes, measureDueOutcomes } from "@/lib/outcomes";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const summary = await summarizeRecentOutcomes(days);
  return NextResponse.json(summary);
}

/** 手动触发测量（可用于测试） */
export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const r = await measureDueOutcomes();
    return NextResponse.json({ success: true, ...r });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "failed" }, { status: 500 });
  }
}
