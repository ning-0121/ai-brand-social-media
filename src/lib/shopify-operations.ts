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

    // Fetch SEO metafields (title_tag / description_tag in 'global' namespace)
    // These are NOT included in the standard product payload.
    let metaTitle: string | null = null;
    let metaDescription: string | null = null;
    try {
      const { titleMetafield, descMetafield } = await fetchProductMetafields(
        creds.domain,
        creds.accessToken,
        sp.id
      );
      metaTitle = titleMetafield?.value || null;
      metaDescription = descMetafield?.value || null;
    } catch {
      // Don't fail the whole sync if one product's metafields fail
    }

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
      meta_title: metaTitle,
      meta_description: metaDescription,
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

// ============ Sync Orders ============
function parseShopifyLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

export async function syncOrders(integrationId: string, userId: string) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  let url: string | null = `https://${creds.domain}/admin/api/2024-01/orders.json?status=any&limit=250`;

  // Check for incremental sync cursor
  const { data: integration } = await supabase
    .from("integrations")
    .select("metadata")
    .eq("id", integrationId)
    .single();

  const lastOrderSync = integration?.metadata?.last_order_sync_at;
  if (lastOrderSync) {
    url += `&updated_at_min=${lastOrderSync}`;
  }

  let synced = 0;

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Shopify Orders API 错误: ${res.status}`);
    }

    const { orders } = await res.json();

    for (const order of orders || []) {
      // Upsert order
      const orderData = {
        user_id: userId,
        integration_id: integrationId,
        shopify_order_id: order.id,
        order_number: order.name || `#${order.order_number}`,
        email: order.email || null,
        total_price: parseFloat(order.total_price || "0"),
        subtotal_price: parseFloat(order.subtotal_price || "0"),
        total_tax: parseFloat(order.total_tax || "0"),
        total_discounts: parseFloat(order.total_discounts || "0"),
        currency: order.currency || "USD",
        financial_status: order.financial_status || null,
        fulfillment_status: order.fulfillment_status || null,
        customer_shopify_id: order.customer?.id || null,
        order_date: order.created_at,
      };

      const { data: existingOrder } = await supabase
        .from("shopify_orders")
        .select("id")
        .eq("user_id", userId)
        .eq("shopify_order_id", order.id)
        .single();

      let orderId: string;
      if (existingOrder) {
        await supabase.from("shopify_orders").update(orderData).eq("id", existingOrder.id);
        orderId = existingOrder.id;
        // Delete old line items for re-insert
        await supabase.from("shopify_order_items").delete().eq("order_id", orderId);
      } else {
        const { data: newOrder } = await supabase
          .from("shopify_orders")
          .insert(orderData)
          .select("id")
          .single();
        orderId = newOrder!.id;
      }

      // Insert line items
      const lineItems = (order.line_items || []).map((item: Record<string, unknown>) => ({
        order_id: orderId,
        shopify_line_item_id: item.id as number,
        product_id: item.product_id as number | null,
        variant_id: item.variant_id as number | null,
        title: item.title as string,
        quantity: item.quantity as number,
        price: parseFloat(item.price as string || "0"),
        sku: (item.sku as string) || null,
      }));

      if (lineItems.length > 0) {
        await supabase.from("shopify_order_items").insert(lineItems);
      }

      synced++;
    }

    // Follow pagination
    const linkHeader = res.headers.get("link");
    url = parseShopifyLinkHeader(linkHeader);
  }

  return { synced_orders: synced };
}

// ============ Sync Customers ============
export async function syncCustomers(integrationId: string, userId: string) {
  const creds = await getCredentials(integrationId);
  const headers = shopifyHeaders(creds.accessToken);

  let url: string | null = `https://${creds.domain}/admin/api/2024-01/customers.json?limit=250`;

  const { data: integration } = await supabase
    .from("integrations")
    .select("metadata")
    .eq("id", integrationId)
    .single();

  const lastCustomerSync = integration?.metadata?.last_customer_sync_at;
  if (lastCustomerSync) {
    url += `&updated_at_min=${lastCustomerSync}`;
  }

  let synced = 0;

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Shopify Customers API 错误: ${res.status}`);
    }

    const { customers } = await res.json();

    for (const customer of customers || []) {
      const customerData = {
        user_id: userId,
        integration_id: integrationId,
        shopify_customer_id: customer.id,
        email: customer.email || null,
        first_name: customer.first_name || null,
        last_name: customer.last_name || null,
        orders_count: customer.orders_count || 0,
        total_spent: parseFloat(customer.total_spent || "0"),
        currency: customer.currency || "USD",
        created_at_shopify: customer.created_at,
      };

      const { data: existing } = await supabase
        .from("shopify_customers")
        .select("id")
        .eq("user_id", userId)
        .eq("shopify_customer_id", customer.id)
        .single();

      if (existing) {
        await supabase.from("shopify_customers").update(customerData).eq("id", existing.id);
      } else {
        await supabase.from("shopify_customers").insert(customerData);
      }

      synced++;
    }

    const linkHeader = res.headers.get("link");
    url = parseShopifyLinkHeader(linkHeader);
  }

  return { synced_customers: synced };
}

// ============ Sync All ============
export async function syncAll(integrationId: string, userId: string) {
  const productsResult = await syncProducts(integrationId);
  const ordersResult = await syncOrders(integrationId, userId);
  const customersResult = await syncCustomers(integrationId, userId);

  // Update integration metadata with full sync stats
  const now = new Date().toISOString();
  const { data: integration } = await supabase
    .from("integrations")
    .select("metadata")
    .eq("id", integrationId)
    .single();

  await supabase
    .from("integrations")
    .update({
      status: "active",
      last_synced_at: now,
      metadata: {
        ...(integration?.metadata || {}),
        total_products: productsResult.synced_products,
        total_orders: ordersResult.synced_orders,
        total_customers: customersResult.synced_customers,
        last_sync_result: "success",
        last_order_sync_at: now,
        last_customer_sync_at: now,
      },
    })
    .eq("id", integrationId);

  return {
    ...productsResult,
    ...ordersResult,
    ...customersResult,
  };
}

// ============ Test Connection ============
export async function testShopifyConnection(domain: string, accessToken: string) {
  const fullDomain = domain.includes(".myshopify.com")
    ? domain
    : `${domain}.myshopify.com`;

  const res = await fetch(
    `https://${fullDomain}/admin/api/2024-01/shop.json`,
    { headers: shopifyHeaders(accessToken) }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`连接失败: ${res.status} - ${errText}`);
  }

  const { shop } = await res.json();
  return {
    success: true,
    shop_name: shop.name,
    shop_domain: shop.myshopify_domain || fullDomain,
    currency: shop.currency,
    email: shop.email,
  };
}

// ============ Get Product SEO Metafields ============
// Shopify SEO meta_title / meta_description are stored as metafields
// in the "global" namespace with keys "title_tag" / "description_tag".
// They are NOT returned by GET /products.json — must be fetched separately.
async function fetchProductMetafields(
  domain: string,
  accessToken: string,
  shopifyProductId: number
): Promise<{ titleMetafield: { id: number; value: string } | null; descMetafield: { id: number; value: string } | null }> {
  const headers = shopifyHeaders(accessToken);
  const res = await fetch(
    `https://${domain}/admin/api/2024-01/products/${shopifyProductId}/metafields.json?namespace=global`,
    { headers }
  );

  if (!res.ok) return { titleMetafield: null, descMetafield: null };

  const { metafields } = (await res.json()) as { metafields: Array<{ id: number; namespace: string; key: string; value: string }> };
  const titleMf = metafields?.find((m) => m.namespace === "global" && m.key === "title_tag") || null;
  const descMf = metafields?.find((m) => m.namespace === "global" && m.key === "description_tag") || null;

  return {
    titleMetafield: titleMf ? { id: titleMf.id, value: titleMf.value } : null,
    descMetafield: descMf ? { id: descMf.id, value: descMf.value } : null,
  };
}

// Create or update a single metafield (upsert pattern)
async function upsertMetafield(
  domain: string,
  accessToken: string,
  shopifyProductId: number,
  key: "title_tag" | "description_tag",
  value: string,
  existingId: number | null
): Promise<void> {
  const headers = shopifyHeaders(accessToken);

  if (existingId) {
    // Update existing metafield
    const res = await fetch(
      `https://${domain}/admin/api/2024-01/products/${shopifyProductId}/metafields/${existingId}.json`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          metafield: {
            id: existingId,
            value,
            type: "single_line_text_field",
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify metafield (${key}) 更新失败: ${res.status} - ${errText}`);
    }
  } else {
    // Create new metafield
    const res = await fetch(
      `https://${domain}/admin/api/2024-01/products/${shopifyProductId}/metafields.json`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          metafield: {
            namespace: "global",
            key,
            value,
            type: "single_line_text_field",
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify metafield (${key}) 创建失败: ${res.status} - ${errText}`);
    }
  }
}

// ============ Update Product SEO ============
// Handles both standard fields (title, body_html, tags) via PUT /products/{id}.json
// AND SEO metafields (meta_title, meta_description) via /metafields endpoints.
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

  // Step 1: update standard product fields (title, body_html, tags)
  const standardUpdate: Record<string, unknown> = {};
  if (updates.title) standardUpdate.title = updates.title;
  if (updates.body_html) standardUpdate.body_html = updates.body_html;
  if (updates.tags) standardUpdate.tags = updates.tags;

  if (Object.keys(standardUpdate).length > 0) {
    const res = await fetch(
      `https://${creds.domain}/admin/api/2024-01/products/${shopifyProductId}.json`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ product: { id: shopifyProductId, ...standardUpdate } }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shopify 商品更新失败: ${res.status} - ${errText}`);
    }
  }

  // Step 2: update SEO metafields (separate API)
  if (updates.meta_title || updates.meta_description) {
    const { titleMetafield, descMetafield } = await fetchProductMetafields(
      creds.domain,
      creds.accessToken,
      shopifyProductId
    );

    if (updates.meta_title) {
      await upsertMetafield(
        creds.domain,
        creds.accessToken,
        shopifyProductId,
        "title_tag",
        updates.meta_title,
        titleMetafield?.id || null
      );
    }
    if (updates.meta_description) {
      await upsertMetafield(
        creds.domain,
        creds.accessToken,
        shopifyProductId,
        "description_tag",
        updates.meta_description,
        descMetafield?.id || null
      );
    }
  }

  // Step 3: update local DB
  const localUpdate: Record<string, unknown> = {};
  if (updates.title) localUpdate.name = updates.title;
  if (updates.body_html) localUpdate.body_html = updates.body_html;
  if (updates.tags) localUpdate.tags = updates.tags;
  if (updates.meta_title) localUpdate.meta_title = updates.meta_title;
  if (updates.meta_description) localUpdate.meta_description = updates.meta_description;

  await supabase.from("products").update(localUpdate).eq("id", localProductId);

  return { success: true };
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
