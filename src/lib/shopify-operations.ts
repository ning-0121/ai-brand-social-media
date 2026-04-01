import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ShopifyCredentials {
  domain: string;
  accessToken: string;
  integrationId: string;
}

async function getCredentials(integrationId: string): Promise<ShopifyCredentials> {
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("platform", "shopify")
    .single();

  if (error || !integration) throw new Error("未找到 Shopify 连接");
  if (!integration.store_url || !integration.access_token)
    throw new Error("缺少店铺域名或 Access Token");

  const domain = integration.store_url.includes(".myshopify.com")
    ? integration.store_url
    : `${integration.store_url}.myshopify.com`;

  return {
    domain,
    accessToken: integration.access_token,
    integrationId,
  };
}

function shopifyHeaders(accessToken: string) {
  return {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };
}

// ============ Sync Products ============
export async function syncProducts(integrationId: string) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  const productsRes = await fetch(
    `https://${creds.domain}/admin/api/2024-01/products.json?limit=50`,
    { headers }
  );

  if (!productsRes.ok) {
    const errText = await productsRes.text();
    await supabase
      .from("integrations")
      .update({ status: "error", metadata: { last_error: errText } })
      .eq("id", integrationId);
    throw new Error(`Shopify API 错误: ${productsRes.status}`);
  }

  const { products: shopifyProducts } = await productsRes.json();

  const ordersRes = await fetch(
    `https://${creds.domain}/admin/api/2024-01/orders/count.json?status=any`,
    { headers }
  );
  const ordersData = ordersRes.ok ? await ordersRes.json() : { count: 0 };

  let synced = 0;
  for (const sp of shopifyProducts || []) {
    const variant = sp.variants?.[0];
    const productData = {
      name: sp.title,
      sku: variant?.sku || `SHOPIFY-${sp.id}`,
      price: parseFloat(variant?.price || "0"),
      stock: variant?.inventory_quantity || 0,
      status: sp.status === "active" ? "active" : "inactive",
      seo_score: 50,
      category: sp.product_type || "未分类",
      platform: "shopify" as const,
      image_url: sp.image?.src || null,
      shopify_product_id: sp.id,
      shopify_variant_id: variant?.id || null,
      body_html: sp.body_html || null,
      tags: sp.tags || null,
      meta_title: sp.metafields_global_title_tag || null,
      meta_description: sp.metafields_global_description_tag || null,
    };

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

  await supabase
    .from("integrations")
    .update({
      status: "active",
      last_synced_at: new Date().toISOString(),
      metadata: {
        total_products: shopifyProducts?.length || 0,
        total_orders: ordersData.count || 0,
        last_sync_result: "success",
      },
    })
    .eq("id", integrationId);

  return { synced_products: synced, total_orders: ordersData.count || 0 };
}

// ============ Update Product SEO ============
export async function updateProductSEO(
  integrationId: string,
  shopifyProductId: number,
  localProductId: string,
  updates: {
    title?: string;
    body_html?: string;
    meta_title?: string;
    meta_description?: string;
    tags?: string;
  }
) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  // Build Shopify product update payload
  const shopifyUpdate: Record<string, unknown> = {};
  if (updates.title) shopifyUpdate.title = updates.title;
  if (updates.body_html) shopifyUpdate.body_html = updates.body_html;
  if (updates.tags) shopifyUpdate.tags = updates.tags;
  if (updates.meta_title)
    shopifyUpdate.metafields_global_title_tag = updates.meta_title;
  if (updates.meta_description)
    shopifyUpdate.metafields_global_description_tag = updates.meta_description;

  const res = await fetch(
    `https://${creds.domain}/admin/api/2024-01/products/${shopifyProductId}.json`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ product: { id: shopifyProductId, ...shopifyUpdate } }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shopify SEO 更新失败: ${res.status} - ${errText}`);
  }

  // Update local DB
  const localUpdate: Record<string, unknown> = {};
  if (updates.title) localUpdate.name = updates.title;
  if (updates.body_html) localUpdate.body_html = updates.body_html;
  if (updates.tags) localUpdate.tags = updates.tags;
  if (updates.meta_title) localUpdate.meta_title = updates.meta_title;
  if (updates.meta_description)
    localUpdate.meta_description = updates.meta_description;

  await supabase.from("products").update(localUpdate).eq("id", localProductId);

  return { success: true, shopify_response: await res.json() };
}

// ============ Update Product Basic Info ============
export async function updateProductInfo(
  integrationId: string,
  shopifyProductId: number,
  localProductId: string,
  updates: { title?: string; body_html?: string; product_type?: string; tags?: string }
) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  const res = await fetch(
    `https://${creds.domain}/admin/api/2024-01/products/${shopifyProductId}.json`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ product: { id: shopifyProductId, ...updates } }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shopify 商品更新失败: ${res.status} - ${errText}`);
  }

  const localUpdate: Record<string, unknown> = {};
  if (updates.title) localUpdate.name = updates.title;
  if (updates.body_html) localUpdate.body_html = updates.body_html;
  if (updates.product_type) localUpdate.category = updates.product_type;
  if (updates.tags) localUpdate.tags = updates.tags;

  await supabase.from("products").update(localUpdate).eq("id", localProductId);

  return { success: true };
}

// ============ Update Price ============
export async function updateProductPrice(
  integrationId: string,
  shopifyVariantId: number,
  localProductId: string,
  price: number
) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  const res = await fetch(
    `https://${creds.domain}/admin/api/2024-01/variants/${shopifyVariantId}.json`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ variant: { id: shopifyVariantId, price: price.toString() } }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shopify 价格更新失败: ${res.status} - ${errText}`);
  }

  await supabase.from("products").update({ price }).eq("id", localProductId);

  return { success: true };
}

// ============ Update Inventory ============
export async function updateProductInventory(
  integrationId: string,
  shopifyVariantId: number,
  localProductId: string,
  quantity: number
) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  // First get inventory_item_id from variant
  const variantRes = await fetch(
    `https://${creds.domain}/admin/api/2024-01/variants/${shopifyVariantId}.json`,
    { headers }
  );
  if (!variantRes.ok) throw new Error("无法获取 variant 信息");
  const { variant } = await variantRes.json();
  const inventoryItemId = variant.inventory_item_id;

  // Get locations
  const locationsRes = await fetch(
    `https://${creds.domain}/admin/api/2024-01/locations.json`,
    { headers }
  );
  if (!locationsRes.ok) throw new Error("无法获取仓库位置");
  const { locations } = await locationsRes.json();
  const locationId = locations[0]?.id;
  if (!locationId) throw new Error("未找到仓库位置");

  // Set inventory level
  const res = await fetch(
    `https://${creds.domain}/admin/api/2024-01/inventory_levels/set.json`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: quantity,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shopify 库存更新失败: ${res.status} - ${errText}`);
  }

  await supabase.from("products").update({ stock: quantity }).eq("id", localProductId);

  return { success: true };
}
