/**
 * Shopify 产品评价管理
 * 收集、生成邀评邮件、分析评价数据
 * 使用 Shopify Metaobjects API 存储评价（无需第三方 app）
 */

import { supabase } from "./supabase";
import { callLLM } from "./content-skills/llm";

interface ShopifyCredentials {
  domain: string;
  accessToken: string;
}

async function getCredentials(): Promise<ShopifyCredentials | null> {
  const { data } = await supabase
    .from("integrations")
    .select("store_url, access_token")
    .eq("platform", "shopify").eq("status", "active").maybeSingle();
  if (!data?.access_token || !data?.store_url) return null;
  return { domain: data.store_url.replace("https://", "").replace("/", ""), accessToken: data.access_token };
}

// ─── 获取近期订单（用于邀评）──────────────────────────────

export interface RecentOrder {
  id: number;
  email: string;
  customer_name: string;
  created_at: string;
  line_items: Array<{ product_id: number; title: string; quantity: number }>;
  fulfillment_status: string;
}

export async function getRecentFulfilledOrders(days = 7): Promise<RecentOrder[]> {
  const creds = await getCredentials();
  if (!creds) return [];

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const res = await fetch(
    `https://${creds.domain}/admin/api/2024-01/orders.json?fulfillment_status=shipped&created_at_min=${since}&limit=50&status=any`,
    { headers: { "X-Shopify-Access-Token": creds.accessToken, "Content-Type": "application/json" } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.orders || []).map((o: Record<string, unknown>) => ({
    id: o.id,
    email: o.email || "",
    customer_name: `${(o.customer as Record<string, unknown>)?.first_name || ""} ${(o.customer as Record<string, unknown>)?.last_name || ""}`.trim(),
    created_at: o.created_at as string,
    line_items: ((o.line_items as Array<Record<string, unknown>>) || []).map(li => ({
      product_id: li.product_id as number,
      title: li.title as string,
      quantity: li.quantity as number,
    })),
    fulfillment_status: o.fulfillment_status as string,
  }));
}

// ─── AI 生成邀评邮件 ────────────────────────────────────────

export async function generateReviewRequestEmail(order: RecentOrder): Promise<{
  subject: string;
  body_html: string;
}> {
  const items = order.line_items.map(li => li.title).join(", ");

  const result = await callLLM(
    `你是 DTC 品牌客户关系专家。为已收货客户生成一封邀评邮件。
要求：
1. 语气真诚温暖，像朋友不像机器
2. 提到具体购买的商品名
3. 说明评价对其他客户很重要（社交证明）
4. 简单的 CTA："写下你的体验"
5. 不要太长，4-5 句话
品牌：JOJOFEIFEI
返回 JSON：{"subject":"","body_html":""}`,
    `客户: ${order.customer_name || "there"}
购买商品: ${items}
订单日期: ${order.created_at}`,
    800
  );

  return result as unknown as { subject: string; body_html: string };
}

// ─── 评价数据分析 ────────────────────────────────────────────

export async function analyzeReviewOpportunity(): Promise<{
  orders_without_review: number;
  potential_reviews: number;
  top_products_needing_reviews: Array<{ name: string; orders: number }>;
  recommendation: string;
}> {
  const orders = await getRecentFulfilledOrders(30);

  // 统计哪些产品有最多订单但可能没评价
  const productOrders: Record<string, number> = {};
  for (const order of orders) {
    for (const li of order.line_items) {
      productOrders[li.title] = (productOrders[li.title] || 0) + 1;
    }
  }

  const topProducts = Object.entries(productOrders)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, orderCount]) => ({ name, orders: orderCount }));

  const totalOrdersWithEmail = orders.filter(o => o.email).length;
  const estimatedReviewRate = 0.08; // 行业平均邀评响应率 8%

  return {
    orders_without_review: totalOrdersWithEmail,
    potential_reviews: Math.round(totalOrdersWithEmail * estimatedReviewRate),
    top_products_needing_reviews: topProducts,
    recommendation: totalOrdersWithEmail > 0
      ? `${totalOrdersWithEmail} 笔近期订单可邀评。按 8% 响应率，预计可获得 ${Math.round(totalOrdersWithEmail * estimatedReviewRate)} 条评价。优先邀评高价商品。`
      : "近期无已发货订单",
  };
}
