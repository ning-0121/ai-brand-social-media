import { NextResponse } from "next/server";
import {
  syncProducts,
  updateProductSEO,
  updateProductInfo,
  updateProductPrice,
  updateProductInventory,
} from "@/lib/shopify-operations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "sync", integration_id, ...params } = body;

    if (!integration_id) {
      return NextResponse.json({ error: "缺少 integration_id" }, { status: 400 });
    }

    switch (action) {
      case "sync": {
        const result = await syncProducts(integration_id);
        return NextResponse.json({ success: true, ...result });
      }

      case "update_seo": {
        const { shopify_product_id, local_product_id, updates } = params;
        if (!shopify_product_id || !local_product_id || !updates) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductSEO(
          integration_id,
          shopify_product_id,
          local_product_id,
          updates
        );
        return NextResponse.json(result);
      }

      case "update_product": {
        const { shopify_product_id, local_product_id, updates } = params;
        if (!shopify_product_id || !local_product_id || !updates) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductInfo(
          integration_id,
          shopify_product_id,
          local_product_id,
          updates
        );
        return NextResponse.json(result);
      }

      case "update_price": {
        const { shopify_variant_id, local_product_id, price } = params;
        if (!shopify_variant_id || !local_product_id || price === undefined) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductPrice(
          integration_id,
          shopify_variant_id,
          local_product_id,
          price
        );
        return NextResponse.json(result);
      }

      case "update_inventory": {
        const { shopify_variant_id, local_product_id, quantity } = params;
        if (!shopify_variant_id || !local_product_id || quantity === undefined) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductInventory(
          integration_id,
          shopify_variant_id,
          local_product_id,
          quantity
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Shopify API error:", error);
    const message = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
