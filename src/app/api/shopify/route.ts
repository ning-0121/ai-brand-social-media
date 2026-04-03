import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  syncProducts,
  syncOrders,
  syncCustomers,
  syncAll,
  updateProductSEO,
  updateProductInfo,
  updateProductPrice,
  updateProductInventory,
} from "@/lib/shopify-operations";

async function getAuthUserId(): Promise<string | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in API routes
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "sync", integration_id, ...params } = body;

    if (!integration_id) {
      return NextResponse.json({ error: "缺少 integration_id" }, { status: 400 });
    }

    const userId = await getAuthUserId();

    switch (action) {
      case "sync":
      case "sync_all": {
        if (!userId) {
          return NextResponse.json({ error: "未登录" }, { status: 401 });
        }
        const result = await syncAll(integration_id, userId);
        return NextResponse.json({ success: true, ...result });
      }

      case "sync_products": {
        const result = await syncProducts(integration_id);
        return NextResponse.json({ success: true, ...result });
      }

      case "sync_orders": {
        if (!userId) {
          return NextResponse.json({ error: "未登录" }, { status: 401 });
        }
        const result = await syncOrders(integration_id, userId);
        return NextResponse.json({ success: true, ...result });
      }

      case "sync_customers": {
        if (!userId) {
          return NextResponse.json({ error: "未登录" }, { status: 401 });
        }
        const result = await syncCustomers(integration_id, userId);
        return NextResponse.json({ success: true, ...result });
      }

      case "update_seo": {
        const { shopify_product_id, local_product_id, updates } = params;
        if (!shopify_product_id || !local_product_id || !updates) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductSEO(
          integration_id, shopify_product_id, local_product_id, updates
        );
        return NextResponse.json(result);
      }

      case "update_product": {
        const { shopify_product_id, local_product_id, updates } = params;
        if (!shopify_product_id || !local_product_id || !updates) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductInfo(
          integration_id, shopify_product_id, local_product_id, updates
        );
        return NextResponse.json(result);
      }

      case "update_price": {
        const { shopify_variant_id, local_product_id, price } = params;
        if (!shopify_variant_id || !local_product_id || price === undefined) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductPrice(
          integration_id, shopify_variant_id, local_product_id, price
        );
        return NextResponse.json(result);
      }

      case "update_inventory": {
        const { shopify_variant_id, local_product_id, quantity } = params;
        if (!shopify_variant_id || !local_product_id || quantity === undefined) {
          return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
        }
        const result = await updateProductInventory(
          integration_id, shopify_variant_id, local_product_id, quantity
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
