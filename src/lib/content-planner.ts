import { supabase } from "./supabase";

export interface ContentSuggestion {
  id: string;
  title: string;
  description: string;
  target_platforms: string[];
  content_type: string;
  expected_effect: string;
  estimated_cost: { text: number; image: number; total: number };
  source: "diagnostic" | "product_gap" | "trending";
  product_id?: string;
  product_name?: string;
  priority: "high" | "medium" | "low";
}

export async function getContentSuggestions(): Promise<ContentSuggestion[]> {
  const suggestions: ContentSuggestion[] = [];

  // 1. 从诊断系统获取内容类 findings
  const { data: findings } = await supabase
    .from("diagnostic_findings")
    .select("*")
    .eq("category", "content")
    .eq("status", "open")
    .order("severity", { ascending: true });

  if (findings) {
    for (const f of findings) {
      suggestions.push({
        id: `diag-${f.id}`,
        title: f.title,
        description: f.description || "",
        target_platforms: ["shopify", "instagram", "xiaohongshu"],
        content_type: "image_post",
        expected_effect: "提升商品内容覆盖率和搜索排名",
        estimated_cost: { text: 0.01, image: 0.04, total: 0.05 },
        source: "diagnostic",
        priority: f.severity === "critical" ? "high" : f.severity === "high" ? "high" : "medium",
      });
    }
  }

  // 2. 分析无内容覆盖的商品
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, image_url, body_html");

  const { data: contents } = await supabase
    .from("contents")
    .select("title");

  if (products) {
    const contentTitles = (contents || []).map((c) => c.title?.toLowerCase() || "");

    const uncoveredProducts = products.filter((p) => {
      const name = p.name?.toLowerCase() || "";
      return !contentTitles.some((t) => t.includes(name) || name.includes(t));
    });

    // 取前 5 个无内容覆盖的商品
    for (const p of uncoveredProducts.slice(0, 5)) {
      const hasImage = !!p.image_url;
      const hasDescription = !!p.body_html && p.body_html.length > 50;

      suggestions.push({
        id: `gap-${p.id}`,
        title: `为 ${p.name} 创建推广内容`,
        description: `该商品尚无任何社媒或营销内容${!hasImage ? "，且缺少产品图片" : ""}${!hasDescription ? "，商品描述不完整" : ""}。创建内容包可提升曝光度。`,
        target_platforms: ["instagram", "xiaohongshu", "shopify"],
        content_type: "image_post",
        expected_effect: "新增商品曝光渠道，预计带来额外浏览量",
        estimated_cost: {
          text: 0.01,
          image: hasImage ? 0 : 0.04,
          total: hasImage ? 0.01 : 0.05,
        },
        source: "product_gap",
        product_id: p.id,
        product_name: p.name,
        priority: "medium",
      });
    }
  }

  // 3. 热销商品推广建议
  const { data: orderItems } = await supabase
    .from("shopify_order_items")
    .select("title, quantity, price");

  if (orderItems && orderItems.length > 0) {
    const byProduct = new Map<string, { qty: number; revenue: number }>();
    for (const item of orderItems) {
      const existing = byProduct.get(item.title) || { qty: 0, revenue: 0 };
      existing.qty += item.quantity;
      existing.revenue += item.quantity * Number(item.price);
      byProduct.set(item.title, existing);
    }

    const topSellers = Array.from(byProduct.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 3);

    for (const [name, stats] of topSellers) {
      // 检查该商品是否已有内容
      const contentTitles = (contents || []).map((c) => c.title?.toLowerCase() || "");
      const hasCoverage = contentTitles.some((t) => t.includes(name.toLowerCase()));

      if (!hasCoverage) {
        suggestions.push({
          id: `trending-${name}`,
          title: `为热销商品 ${name} 创建社媒推广`,
          description: `该商品已售出 ${stats.qty} 件 (收入 $${stats.revenue.toFixed(0)})，但缺少社媒推广内容。为热销品创建推广可以放大销售势头。`,
          target_platforms: ["tiktok", "instagram", "xiaohongshu"],
          content_type: "short_video",
          expected_effect: `基于现有销售势头，社媒推广预计可增加 20-40% 曝光`,
          estimated_cost: { text: 0.01, image: 0.04, total: 0.05 },
          source: "trending",
          product_name: name,
          priority: "high",
        });
      }
    }
  }

  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}
