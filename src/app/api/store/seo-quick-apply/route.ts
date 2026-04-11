import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { updateProductSEO } from "@/lib/shopify-operations";
import { logAudit } from "@/lib/audit-logger";
import { validateBody, seoQuickApplySchema } from "@/lib/api-validation";

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const validated = validateBody(body, seoQuickApplySchema);
    if (validated.error) return validated.error;

    const { integration_id, shopify_product_id, product_id, new_values } = validated.data;

    const result = await updateProductSEO(
      integration_id,
      shopify_product_id,
      product_id,
      new_values
    );

    await logAudit({
      actorType: "user",
      actorId: auth.userId,
      actionType: "seo.quick_apply",
      targetType: "product",
      targetId: product_id,
      provider: "shopify",
      requestPayload: { shopify_product_id, new_values },
      responsePayload: result as Record<string, unknown>,
      status: "success",
    });

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "SEO 更新失败";

    logAudit({
      actorType: "user",
      actorId: auth.userId,
      actionType: "seo.quick_apply",
      targetType: "product",
      status: "failed",
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
