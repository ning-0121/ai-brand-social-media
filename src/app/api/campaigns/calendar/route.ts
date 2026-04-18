import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { listCalendar, createCalendarEntry, autoPlanMonth, runCalendarEntry } from "@/lib/campaign-calendar";

export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start") || new Date().toISOString().split("T")[0];
  const end = searchParams.get("end") || new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

  const entries = await listCalendar(start, end);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();

  if (body.action === "auto_plan") {
    const days = body.days || 60;
    const r = await autoPlanMonth(days);
    return NextResponse.json({ success: true, ...r });
  }

  if (body.action === "run") {
    const r = await runCalendarEntry(body.entry_id);
    return NextResponse.json(r);
  }

  // default: create manual entry
  const created = await createCalendarEntry(body);
  return NextResponse.json({ success: true, entry: created });
}
