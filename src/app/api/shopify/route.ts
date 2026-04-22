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
  listShopifyPages,
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

// GET: return integration sync status (no integration_id needed)
export async function GET() {
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const cookieStore = cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: integration } = await sb
    .from("integrations")
    .select("id,platform,store_name,store_url,status,last_synced_at,metadata")
    .eq("platform", "shopify")
    .eq("status", "active")
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ connected: false });
  }

  const meta = (integration.metadata || {}) as Record<string, unknown>;
  return NextResponse.json({
    connected: true,
    integration_id: integration.id,
    store_name: integration.store_name,
    store_url: integration.store_url,
    last_synced_at: integration.last_synced_at,
    total_products: meta.total_products || 0,
    total_orders: meta.total_orders || 0,
    last_sync_result: meta.last_sync_result || null,
    last_order_sync_at: meta.last_order_sync_at || null,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action = "sync", integration_id, ...params } = body;

    if (!integration_id) {
      return NextResponse.json({ error: "缺少 integration_id" }, { status: 400 });
    }

    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    switch (action) {
      case "sync":
      case "sync_all": {
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

      case "list_pages": {
        const pages = await listShopifyPages(integration_id);
        return NextResponse.json({ success: true, pages, count: pages.length });
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
