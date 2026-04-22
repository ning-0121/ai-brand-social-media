/**
 * 从竞品商品 URL 抓取公开信息
 *
 * 支持：Shopify 店铺（最快，抓 products.json）、任何 HTML 页面（用 og meta + schema.org）
 * 失败时返回 null，调用方降级到人工输入
 */

export interface ScrapedCompetitor {
  brand_hint?: string;
  product_name: string;
  price_usd?: number;
  currency?: string;
  image_urls: string[];
  description?: string;
  sku?: string;
  source_url: string;
  source_type: "shopify_json" | "og_meta" | "schema_jsonld" | "fallback";
}

function parseHost(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return ""; }
}

/**
 * Shopify 店铺通常支持在商品 URL 后加 `.json` 返回商品 JSON，不需要 Admin API
 * 例：https://store.com/products/abc → https://store.com/products/abc.json
 */
async function tryShopifyJson(url: string): Promise<ScrapedCompetitor | null> {
  try {
    const jsonUrl = url.replace(/\/?$/, ".json").replace(/\?.*$/, ".json");
    const res = await fetch(jsonUrl, {
      headers: { "User-Agent": "BrandMind-Intel/1.0 (contact via support@)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      product?: {
        title: string;
        body_html?: string;
        vendor?: string;
        variants?: Array<{ price?: string; sku?: string }>;
        images?: Array<{ src?: string }>;
      };
    };
    const p = data.product;
    if (!p?.title) return null;

    const prices = (p.variants || []).map(v => parseFloat(v.price || "0")).filter(n => n > 0);
    const minPrice = prices.length ? Math.min(...prices) : undefined;

    return {
      brand_hint: p.vendor,
      product_name: p.title,
      price_usd: minPrice,
      image_urls: (p.images || []).map(img => img.src || "").filter(Boolean).slice(0, 10),
      description: (p.body_html || "").replace(/<[^>]+>/g, " ").slice(0, 1000),
      sku: p.variants?.[0]?.sku,
      source_url: url,
      source_type: "shopify_json",
    };
  } catch { return null; }
}

/** 从任意 HTML 页面的 og: meta / schema.org JSON-LD 里提取 */
async function tryHtmlMeta(url: string): Promise<ScrapedCompetitor | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BrandMindIntel/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // og:* meta
    const og = (key: string): string | undefined => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${key}["'][^>]+content=["']([^"']+)`, "i"));
      return m?.[1];
    };
    const twitter = (key: string): string | undefined => {
      const m = html.match(new RegExp(`<meta[^>]+name=["']twitter:${key}["'][^>]+content=["']([^"']+)`, "i"));
      return m?.[1];
    };
    // JSON-LD Product schema
    let schemaProduct: Record<string, unknown> | null = null;
    const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const ldMatches: RegExpExecArray[] = [];
    let ldMatch: RegExpExecArray | null;
    while ((ldMatch = ldRegex.exec(html)) !== null) ldMatches.push(ldMatch);
    for (const m of ldMatches) {
      try {
        const data = JSON.parse(m[1]);
        const candidates = Array.isArray(data) ? data : [data];
        for (const item of candidates) {
          if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
            schemaProduct = item;
            break;
          }
        }
        if (schemaProduct) break;
      } catch { /* skip malformed */ }
    }

    const title = (schemaProduct?.name as string) || og("title") || twitter("title") ||
                  (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "").trim();
    if (!title) return null;

    const offers = schemaProduct?.offers as Record<string, unknown> | undefined;
    const price = offers?.price ? parseFloat(String(offers.price)) : undefined;
    const images: string[] = [];
    if (schemaProduct?.image) {
      const raw = schemaProduct.image;
      if (Array.isArray(raw)) images.push(...(raw as string[]).slice(0, 5));
      else if (typeof raw === "string") images.push(raw);
    }
    const ogImage = og("image");
    if (ogImage && !images.includes(ogImage)) images.push(ogImage);

    return {
      brand_hint: parseHost(url),
      product_name: title,
      price_usd: price,
      currency: offers?.priceCurrency as string | undefined,
      image_urls: images.slice(0, 10),
      description: (schemaProduct?.description as string) || og("description") || "",
      sku: schemaProduct?.sku as string | undefined,
      source_url: url,
      source_type: schemaProduct ? "schema_jsonld" : "og_meta",
    };
  } catch { return null; }
}

export async function scrapeCompetitorUrl(url: string): Promise<ScrapedCompetitor | null> {
  // 优先 Shopify JSON（速度快 + 字段准）
  const shopify = await tryShopifyJson(url);
  if (shopify) return shopify;

  // 回退到 HTML 抓取
  return await tryHtmlMeta(url);
}
