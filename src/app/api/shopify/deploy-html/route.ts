import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { updateProductBodyHtml, createShopifyPage, updateShopifyPage } from "@/lib/shopify-operations";

export const maxDuration = 60;

/**
 * POST /api/shopify/deploy-html
 *
 * Body (one of):
 *   { target: "product_body", product_id: "<local uuid>", html: "..." }
 *   { target: "new_page", title: "My Landing", html: "..." }
 *   { target: "update_page", page_id: 123, html: "...", title?: "..." }
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { target, html, product_id, page_id, title } = body as {
      target: "product_body" | "new_page" | "update_page";
      html: string;
      product_id?: string;
      page_id?: number;
      title?: string;
    };

    if (!html || !target) {
      return NextResponse.json({ error: "缺少 html 或 target" }, { status: 400 });
    }

    // Find active Shopify integration
    const { data: integration } = await supabase
      .from("integrations")
      .select("id")
      .eq("platform", "shopify")
      .eq("status", "active")
      .maybeSingle();

    if (!integration) {
      return NextResponse.json({ error: "未连接 Shopify 店铺" }, { status: 400 });
    }

    if (target === "product_body") {
      if (!product_id) return NextResponse.json({ error: "缺少 product_id" }, { status: 400 });

      const { data: product } = await supabase
        .from("products").select("shopify_product_id, name").eq("id", product_id).single();
      if (!product?.shopify_product_id) {
        return NextResponse.json({ error: "商品未同步到 Shopify" }, { status: 400 });
      }

      await updateProductBodyHtml(integration.id, product.shopify_product_id, product_id, html);
      return NextResponse.json({
        success: true,
        message: `商品 "${product.name}" 详情已更新`,
      });
    }

    if (target === "new_page") {
      if (!title) return NextResponse.json({ error: "缺少页面标题" }, { status: 400 });
      const result = await createShopifyPage(integration.id, title, html);
      return NextResponse.json({
        success: true,
        page_id: result.page_id,
        handle: result.handle,
        message: `页面 "${title}" 已创建`,
      });
    }

    if (target === "update_page") {
      if (!page_id) return NextResponse.json({ error: "缺少 page_id" }, { status: 400 });
      await updateShopifyPage(integration.id, page_id, { body_html: html, ...(title ? { title } : {}) });
      return NextResponse.json({
        success: true,
        message: "页面已更新",
      });
    }

    return NextResponse.json({ error: "未知 target" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "部署失败" },
      { status: 500 }
    );
  }
}
