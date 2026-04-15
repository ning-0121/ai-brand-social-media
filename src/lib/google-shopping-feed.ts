/**
 * Google Shopping Product Feed 生成器
 * 生成 Google Merchant Center 兼容的 XML/RSS Product Feed
 * 让产品出现在 Google Shopping 搜索结果中（免费流量）
 *
 * 使用方式：
 * 1. 调用 generateProductFeed() 生成 XML
 * 2. 通过 API route 暴露为 /api/feeds/google-shopping.xml
 * 3. 在 Google Merchant Center 提交 feed URL
 */

import { supabase } from "./supabase";

interface FeedProduct {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  price: string;
  sale_price?: string;
  availability: string;
  brand: string;
  condition: string;
  google_product_category?: string;
  product_type?: string;
  gtin?: string;
  mpn?: string;
}

export async function generateProductFeed(storeUrl = "https://jojofeifei.com"): Promise<string> {
  // 获取所有 Shopify 商品
  const { data: products } = await supabase
    .from("products")
    .select("name, sku, price, compare_at_price, stock, status, image_url, body_html, category, handle, meta_description, shopify_product_id")
    .eq("platform", "shopify")
    .not("shopify_product_id", "is", null)
    .eq("status", "active");

  if (!products || products.length === 0) {
    return generateEmptyFeed();
  }

  const feedItems: FeedProduct[] = products
    .filter(p => p.image_url) // Google Shopping 必须有图片
    .map(p => {
      const description = stripHtml(p.body_html || p.meta_description || p.name).slice(0, 5000);
      const availability = (p.stock || 0) > 0 ? "in_stock" : "out_of_stock";
      const link = p.handle ? `${storeUrl}/products/${p.handle}` : `${storeUrl}`;

      const item: FeedProduct = {
        id: p.sku || `SHOPIFY-${p.shopify_product_id}`,
        title: p.name.slice(0, 150),
        description: description || p.name,
        link,
        image_link: p.image_url,
        price: `${p.price} USD`,
        availability,
        brand: "JOJOFEIFEI",
        condition: "new",
        product_type: p.category !== "未分类" ? p.category : "Apparel & Accessories > Clothing > Activewear",
        google_product_category: "2271", // Apparel & Accessories > Clothing > Activewear
        mpn: p.sku || undefined,
      };

      // 划线价 → sale_price
      if (p.compare_at_price && p.compare_at_price > p.price) {
        item.price = `${p.compare_at_price} USD`;
        item.sale_price = `${p.price} USD`;
      }

      return item;
    });

  return buildXmlFeed(feedItems, storeUrl);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXmlFeed(items: FeedProduct[], storeUrl: string): string {
  const itemsXml = items.map(item => `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${escapeXml(item.link)}</link>
      <g:image_link>${escapeXml(item.image_link)}</g:image_link>
      <g:price>${item.price}</g:price>
      ${item.sale_price ? `<g:sale_price>${item.sale_price}</g:sale_price>` : ""}
      <g:availability>${item.availability}</g:availability>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:condition>${item.condition}</g:condition>
      ${item.google_product_category ? `<g:google_product_category>${item.google_product_category}</g:google_product_category>` : ""}
      ${item.product_type ? `<g:product_type>${escapeXml(item.product_type)}</g:product_type>` : ""}
      ${item.mpn ? `<g:mpn>${escapeXml(item.mpn)}</g:mpn>` : ""}
      <g:identifier_exists>false</g:identifier_exists>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>JOJOFEIFEI - Activewear Collection</title>
    <link>${storeUrl}</link>
    <description>Premium women's activewear by JOJOFEIFEI</description>
    ${itemsXml}
  </channel>
</rss>`;
}

function generateEmptyFeed(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>JOJOFEIFEI</title>
    <link>https://jojofeifei.com</link>
    <description>No products available</description>
  </channel>
</rss>`;
}
