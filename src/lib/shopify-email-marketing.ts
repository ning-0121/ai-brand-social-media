/**
 * Shopify 邮件营销自动化
 * 弃购恢复、欢迎邮件、购后跟进、复购提醒
 * 通过 Shopify Admin API 管理弃购和客户通知
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

// ─── 弃购数据获取 ──────────────────────────────────────────

export interface AbandonedCheckout {
  id: number;
  email: string;
  customer_name: string;
  total_price: string;
  currency: string;
  created_at: string;
  abandoned_url: string;
  line_items: Array<{ title: string; quantity: number; price: string }>;
}

export async function getAbandonedCheckouts(days = 7): Promise<AbandonedCheckout[]> {
  const creds = await getCredentials();
  if (!creds) return [];

  const since = new Date(Date.now() - days * 86400000).toISOString();
  const res = await fetch(
    `https://${creds.domain}/admin/api/2024-01/checkouts.json?created_at_min=${since}&status=open&limit=50`,
    { headers: { "X-Shopify-Access-Token": creds.accessToken, "Content-Type": "application/json" } }
  );
  if (!res.ok) return [];
  const data = await res.json();

  return (data.checkouts || []).map((c: Record<string, unknown>) => ({
    id: c.id,
    email: c.email || "",
    customer_name: `${(c.customer as Record<string, unknown>)?.first_name || ""} ${(c.customer as Record<string, unknown>)?.last_name || ""}`.trim(),
    total_price: c.total_price as string,
    currency: c.currency as string,
    created_at: c.created_at as string,
    abandoned_url: c.abandoned_checkout_url as string,
    line_items: ((c.line_items as Array<Record<string, unknown>>) || []).map(li => ({
      title: li.title as string,
      quantity: li.quantity as number,
      price: li.price as string,
    })),
  }));
}

// ─── AI 生成邮件内容 ────────────────────────────────────────

export async function generateAbandonedCartEmail(checkout: AbandonedCheckout): Promise<{
  subject: string;
  body_html: string;
  preview_text: string;
}> {
  const items = checkout.line_items.map(li => `${li.title} x${li.quantity} ($${li.price})`).join(", ");

  const result = await callLLM(
    `你是 DTC 品牌邮件营销专家。为弃购客户生成一封恢复邮件。
要求：
1. Subject line 引起紧迫感但不 spam（不要全大写、不要多个感叹号）
2. 正文简短有力，3-4 句话，包含：个性化问候、提醒购物车商品、紧迫感（库存有限）、CTA
3. preview_text 是邮件预览文字（50字以内）
4. body_html 用简洁的 HTML 格式
5. 品牌名：JOJOFEIFEI，风格：简约运动时尚

返回 JSON：{"subject":"","body_html":"","preview_text":""}`,
    `客户: ${checkout.customer_name || "there"}
邮箱: ${checkout.email}
购物车: ${items}
金额: $${checkout.total_price} ${checkout.currency}
弃购时间: ${checkout.created_at}
恢复链接: ${checkout.abandoned_url}`,
    1000
  );

  return result as unknown as { subject: string; body_html: string; preview_text: string };
}

export async function generateWelcomeEmail(customerName: string): Promise<{
  subject: string;
  body_html: string;
}> {
  const result = await callLLM(
    `你是 DTC 品牌邮件营销专家。为新注册客户生成欢迎邮件。
要求：简短、热情、包含品牌故事（1句话）、首单优惠码 WELCOME15（15% off）、CTA 去逛店
品牌：JOJOFEIFEI — 简约运动时尚，为自信女性而生
返回 JSON：{"subject":"","body_html":""}`,
    `客户名: ${customerName || "there"}`,
    800
  );

  return result as unknown as { subject: string; body_html: string };
}

export async function generatePostPurchaseEmail(customerName: string, productNames: string[]): Promise<{
  subject: string;
  body_html: string;
}> {
  const result = await callLLM(
    `你是 DTC 品牌邮件营销专家。为已购客户生成购后跟进邮件（发货后 3 天）。
要求：感谢购买、穿搭建议、邀请留评（附评价链接）、推荐搭配商品
品牌：JOJOFEIFEI
返回 JSON：{"subject":"","body_html":""}`,
    `客户: ${customerName}
购买商品: ${productNames.join(", ")}`,
    800
  );

  return result as unknown as { subject: string; body_html: string };
}

// ─── 弃购分析 ──────────────────────────────────────────────

export async function analyzeAbandonedCarts(): Promise<{
  total: number;
  total_value: number;
  avg_value: number;
  top_abandoned_products: Array<{ title: string; count: number }>;
  recovery_opportunity: string;
}> {
  const checkouts = await getAbandonedCheckouts(30);

  const totalValue = checkouts.reduce((s, c) => s + parseFloat(c.total_price || "0"), 0);
  const productCounts: Record<string, number> = {};
  for (const c of checkouts) {
    for (const li of c.line_items) {
      productCounts[li.title] = (productCounts[li.title] || 0) + 1;
    }
  }

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }));

  const recoveryRate = 0.12; // 行业平均弃购恢复率 12%
  const potentialRecovery = totalValue * recoveryRate;

  return {
    total: checkouts.length,
    total_value: Math.round(totalValue * 100) / 100,
    avg_value: checkouts.length > 0 ? Math.round((totalValue / checkouts.length) * 100) / 100 : 0,
    top_abandoned_products: topProducts,
    recovery_opportunity: `${checkouts.length} 笔弃购，价值 $${Math.round(totalValue)}。按 12% 恢复率，邮件营销预计可挽回 $${Math.round(potentialRecovery)}`,
  };
}
