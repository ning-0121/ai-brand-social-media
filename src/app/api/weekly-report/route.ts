import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  generateWeeklyReport,
  getLatestWeeklyReport,
} from "@/lib/weekly-report-generator";

export const maxDuration = 60;

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const report = await getLatestWeeklyReport();
    return NextResponse.json({ report });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取周报失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const weekStart = body.week_start as string | undefined;

    const result = await generateWeeklyReport(weekStart);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成周报失败" },
      { status: 500 }
    );
  }
}
