import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { generateVisualDNA } from "@/lib/art-director";

export const maxDuration = 120;

export async function POST() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const result = await generateVisualDNA();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed" },
      { status: 500 }
    );
  }
}
