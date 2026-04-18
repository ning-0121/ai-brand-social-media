import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";
import { trackABEvent, declareWinner } from "@/lib/campaign-ab";

export const maxDuration = 10;

/**
 * Shopify orders/create webhook
 *
 * 配置：Shopify Admin → Settings → Notifications → Webhooks →
 *   Event: "Order creation"
 *   Format: JSON
 *   URL: https://brandmind-ai-eight.vercel.app/api/webhooks/shopify/orders
 *
 * 自动从订单 note_attributes 读 bm_variant_id + bm_variant_which 触发 A/B 转化
 * 这些属性由 tracking-snippet.tsx 自动写入（或 theme cart.liquid 手工加）
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    // HMAC 验证
    const hmac = request.headers.get("x-shopify-hmac-sha256");
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (secret && hmac) {
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
      if (expected !== hmac) {
        console.warn("[shopify webhook] HMAC 不匹配");
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
    }

    const order = JSON.parse(rawBody);
    const total = Number(order.total_price || 0);
    const noteAttrs = (order.note_attributes || []) as Array<{ name: string; value: string }>;

    const variantId = noteAttrs.find(a => a.name === "bm_variant_id")?.value;
    const which = noteAttrs.find(a => a.name === "bm_variant_which")?.value as "a" | "b" | undefined;

    // 记录订单到本地（冗余 shopify_orders 主路径，快速 lookup）
    await supabase.from("auto_ops_logs").insert({
      run_type: "shopify_order_webhook",
      trigger_source: "shopify",
      results_summary: {
        order_id: order.id,
        order_number: order.order_number,
        total,
        variant_id: variantId,
        which,
      } as Record<string, unknown>,
      duration_ms: 0,
    });

    // A/B 转化追踪
    if (variantId && (which === "a" || which === "b")) {
      await trackABEvent(variantId, which, "conversion");
      // 异步尝试宣布 winner（触发回写 prompt_runs.score）
      declareWinner(variantId).catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[shopify orders webhook]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "webhook failed" },
      { status: 500 }
    );
  }
}
