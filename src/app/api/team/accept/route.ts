import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { acceptInvitation } from "@/lib/team";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "缺少邀请 token" }, { status: 400 });
    }

    const result = await acceptInvitation(token, auth.userId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "接受邀请失败" },
      { status: 500 }
    );
  }
}
