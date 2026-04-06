import type { AgentConfigMap } from "../agent-types";
import { getProducts } from "../supabase-queries";

export const storeOptimizerConfig: AgentConfigMap = {
  seo_audit: {
    scene: "seo_optimize",
    dataQueries: async () => {
      const products = await getProducts();
      return { products: products || [] };
    },
    buildPrompt: (input, data) => {
      const products = (data.products as { name: string; seo_score: number; category: string }[]) || [];
      const productList = products.slice(0, 10).map(
        (p) => `- ${p.name} (品类: ${p.category}, SEO 分: ${p.seo_score})`
      ).join("\n");
      return `请审计以下商品的 SEO 状况，找出需要优化的问题：\n${productList}\n\n产品品类: ${input.category || "服饰时尚"}`;
    },
  },

  seo_apply: {
    scene: "seo_apply",
    buildPrompt: (input, _data, context) => {
      const positioning = (context["1"] as Record<string, unknown>)?.positioning || "";
      return `商品名称: ${input.product_name || "新品"}\n当前描述: ${input.body_html || ""}\n品牌定位: ${positioning}\n\n请生成优化后的 SEO 文案，包含标题、描述、Meta 标签和标签。`;
    },
  },

  full_seo_audit: {
    scene: "seo_optimize",
    dataQueries: async () => {
      const products = await getProducts();
      return { products: products || [] };
    },
    buildPrompt: (_input, data) => {
      const products = (data.products as { name: string; seo_score: number; body_html?: string; meta_title?: string }[]) || [];
      const summary = products.map((p) => {
        const issues = [];
        if (!p.meta_title) issues.push("缺少 meta_title");
        if (!p.body_html) issues.push("缺少描述");
        if (p.seo_score < 60) issues.push(`SEO 分低 (${p.seo_score})`);
        return `- ${p.name}: ${issues.length > 0 ? issues.join(", ") : "基本达标"}`;
      }).join("\n");
      return `请对以下 ${products.length} 个商品进行全面 SEO 审计：\n${summary}`;
    },
  },

  batch_seo_apply: {
    scene: "seo_apply",
    buildPrompt: (_input, _data, context) => {
      const auditResults = context["0"] || {};
      return `基于以下 SEO 审计结果，为低分商品生成优化方案：\n${JSON.stringify(auditResults, null, 2).slice(0, 2000)}`;
    },
  },

  diagnostic_scan: {
    scene: "diagnostic_seo",
    dataQueries: async () => {
      const products = await getProducts();
      return { products: products || [] };
    },
    buildPrompt: (_input, data) => {
      const products = (data.products as {
        id: string; name: string; seo_score: number; meta_title?: string;
        meta_description?: string; body_html?: string; tags?: string;
        image_url?: string; stock?: number; stock_quantity?: number;
        price?: number; category?: string; status?: string;
      }[]) || [];

      const productList = products.map((p) => {
        const issues: string[] = [];
        if (!p.meta_title) issues.push("缺少 meta_title");
        if (!p.meta_description) issues.push("缺少 meta_description");
        if (!p.body_html || p.body_html.length < 50) issues.push("描述过短或缺失");
        if (!p.tags) issues.push("缺少标签");
        if (!p.image_url) issues.push("缺少图片");
        if ((p.stock_quantity ?? p.stock ?? 0) === 0) issues.push("库存为0");
        if ((p.stock_quantity ?? p.stock ?? 0) > 0 && (p.stock_quantity ?? p.stock ?? 0) < 5) issues.push("库存偏低");
        if (p.seo_score < 50) issues.push(`SEO 分极低(${p.seo_score})`);
        else if (p.seo_score < 70) issues.push(`SEO 分偏低(${p.seo_score})`);
        return `- [${p.id}] ${p.name} | 价格:${p.price || "?"} | 库存:${p.stock_quantity ?? p.stock ?? "?"} | SEO:${p.seo_score} | 问题: ${issues.length > 0 ? issues.join(", ") : "无明显问题"}`;
      }).join("\n");

      return `请对以下 ${products.length} 个商品进行全面诊断，找出 SEO、商品信息、库存方面的问题。
将问题归类为多个 findings，每个 finding 包含一组相关的问题商品。

商品列表：
${productList}

请严格按要求的 JSON 格式返回 findings 数组。`;
    },
  },

  store_health: {
    scene: "seo_optimize",
    dataQueries: async () => {
      const products = await getProducts();
      return { products: products || [] };
    },
    buildPrompt: (_input, data) => {
      const products = (data.products as { name: string; stock: number; status: string; seo_score: number }[]) || [];
      const outOfStock = products.filter((p) => p.stock === 0).length;
      const lowSEO = products.filter((p) => p.seo_score < 50).length;
      return `店铺健康检查：\n- 商品总数: ${products.length}\n- 缺货: ${outOfStock}\n- SEO 低分 (<50): ${lowSEO}\n请诊断店铺健康状况并给出改进建议。`;
    },
  },
};
