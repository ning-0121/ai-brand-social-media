import { NextResponse } from "next/server";
import { trackABEvent, declareWinner } from "@/lib/campaign-ab";

export const maxDuration = 10;

// POST { variant_id, which: "a"|"b", event: "view"|"conversion" }
// 公开端点（no auth）— 要在 Shopify theme 里嵌入 tracking pixel 调这里
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { variant_id, which, event } = body;
    if (!variant_id || !which || !event) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }
    await trackABEvent(variant_id, which, event);
    // 异步尝试宣布 winner — 不阻塞响应
    declareWinner(variant_id).catch(() => {});
    return NextResponse.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "track failed" },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
