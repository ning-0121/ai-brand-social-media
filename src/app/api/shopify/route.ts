import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { integration_id } = await request.json();

    // 1. Get the Shopify integration credentials from DB
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integration_id)
      .eq("platform", "shopify")
      .single();

    if (intError || !integration) {
      return NextResponse.json({ error: "未找到 Shopify 连接" }, { status: 404 });
    }

    const { store_url, access_token } = integration;
    if (!store_url || !access_token) {
      return NextResponse.json({ error: "缺少店铺域名或 Access Token" }, { status: 400 });
    }

    const shopifyDomain = store_url.includes(".myshopify.com") ? store_url : `${store_url}.myshopify.com`;
    const headers = {
      "X-Shopify-Access-Token": access_token,
      "Content-Type": "application/json",
    };

    // 2. Fetch products from Shopify
    const productsRes = await fetch(`https://${shopifyDomain}/admin/api/2024-01/products.json?limit=50`, { headers });

    if (!productsRes.ok) {
      const errText = await productsRes.text();
      // Update integration status to error
      await supabase.from("integrations").update({ status: "error", metadata: { last_error: errText } }).eq("id", integration_id);
      return NextResponse.json({ error: `Shopify API 错误: ${productsRes.status}` }, { status: 502 });
    }

    const { products: shopifyProducts } = await productsRes.json();

    // 3. Fetch orders count
    const ordersRes = await fetch(`https://${shopifyDomain}/admin/api/2024-01/orders/count.json?status=any`, { headers });
    const ordersData = ordersRes.ok ? await ordersRes.json() : { count: 0 };

    // 4. Sync products to Supabase products table
    let synced = 0;
    for (const sp of shopifyProducts || []) {
      const variant = sp.variants?.[0];
      const productData = {
        name: sp.title,
        sku: variant?.sku || `SHOPIFY-${sp.id}`,
        price: parseFloat(variant?.price || "0"),
        stock: variant?.inventory_quantity || 0,
        status: sp.status === "active" ? "active" : "inactive",
        seo_score: 50, // default, can be enhanced later
        category: sp.product_type || "未分类",
        platform: "shopify",
        image_url: sp.image?.src || null,
      };

      // Upsert: check if product with same SKU exists
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("sku", productData.sku)
        .eq("platform", "shopify")
        .limit(1)
        .single();

      if (existing) {
        await supabase.from("products").update(productData).eq("id", existing.id);
      } else {
        await supabase.from("products").insert(productData);
      }
      synced++;
    }

    // 5. Update integration last_synced_at and status
    await supabase.from("integrations").update({
      status: "active",
      last_synced_at: new Date().toISOString(),
      metadata: {
        total_products: shopifyProducts?.length || 0,
        total_orders: ordersData.count || 0,
        last_sync_result: "success",
      },
    }).eq("id", integration_id);

    return NextResponse.json({
      success: true,
      synced_products: synced,
      total_orders: ordersData.count || 0,
    });
  } catch (error: unknown) {
    console.error("Shopify sync error:", error);
    const message = error instanceof Error ? error.message : "同步失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
