import { NextResponse } from "next/server";
import { runAIInspector, getLatestInspectorReport } from "@/lib/ai-inspector";
import { requireAuth } from "@/lib/api-auth";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const report = await getLatestInspectorReport();
  return NextResponse.json({ report });
}

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const report = await runAIInspector();
    return NextResponse.json({ success: true, report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "inspector failed" },
      { status: 500 }
    );
  }
}
