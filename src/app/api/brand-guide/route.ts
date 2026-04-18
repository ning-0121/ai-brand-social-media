import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getBrandGuide, upsertBrandGuide } from "@/lib/brand-guide";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const guide = await getBrandGuide(true);
  return NextResponse.json({ guide });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const updated = await upsertBrandGuide(body);
    return NextResponse.json({ success: true, guide: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
