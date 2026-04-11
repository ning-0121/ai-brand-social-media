import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getBrandProfile, upsertBrandProfile } from "@/lib/brand-profile";
import { validateBody, brandProfileSchema } from "@/lib/api-validation";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const profile = await getBrandProfile();
    return NextResponse.json({ profile });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const validated = validateBody(body, brandProfileSchema);
    if (validated.error) return validated.error;

    const profile = await upsertBrandProfile(validated.data);
    return NextResponse.json({ success: true, profile });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}
