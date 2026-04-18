import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { composeCampaign, type CampaignSpec } from "@/lib/campaign-composer";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const spec = (await request.json()) as CampaignSpec;
    if (!spec.name || !spec.goal) {
      return NextResponse.json({ error: "缺少 name 或 goal" }, { status: 400 });
    }
    const result = await composeCampaign(spec);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "compose failed" },
      { status: 500 }
    );
  }
}
