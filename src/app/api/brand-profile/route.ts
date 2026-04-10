import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getBrandProfile, upsertBrandProfile } from "@/lib/brand-profile";

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
    const { brand_name, ...rest } = body;

    if (!brand_name?.trim()) {
      return NextResponse.json({ error: "品牌名称不能为空" }, { status: 400 });
    }

    const profile = await upsertBrandProfile({ brand_name, ...rest });
    return NextResponse.json({ success: true, profile });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "保存失败" },
      { status: 500 }
    );
  }
}
