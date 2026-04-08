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
      const productName = input.product_name || "新品";
      const currentBody = input.body_html || "";
      const missingFields = input.missing_fields || "all SEO fields";
      const findingContext = input.finding_context || "";

      return `Product: ${productName}
Current body_html (truncated): ${String(currentBody).slice(0, 600)}
Missing/needs improvement: ${missingFields}
${findingContext ? `Why this needs fixing: ${findingContext}` : ""}
${positioning ? `Brand positioning: ${positioning}` : ""}

Generate optimized SEO copy that can be applied directly to Shopify.

Rules:
- title: keep concise but search-friendly (50-70 chars)
- body_html: 2-4 short paragraphs in HTML, keep brand voice, include key features
- meta_title: 50-60 chars, include main keyword, brand name if it fits
- meta_description: 140-160 chars, must include CTA
- tags: comma-separated, 5-10 relevant tags

Only include the fields listed in 'Missing/needs improvement' if you'd be improving on the current state. Do not invent fictional product attributes.`;
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
        shopify_product_id?: number;
      }[]) || [];

      // Only include real Shopify-synced products (skip seed/fake data)
      const realProducts = products.filter((p) => p.shopify_product_id);

      // Pre-compute issue categories so we can give the LLM clear hints
      const missingMetaTitle = realProducts.filter((p) => !p.meta_title);
      const missingMetaDesc = realProducts.filter((p) => !p.meta_description);
      const missingBody = realProducts.filter((p) => !p.body_html || p.body_html.length < 50);
      const missingTags = realProducts.filter((p) => !p.tags);
      const missingImage = realProducts.filter((p) => !p.image_url);
      const outOfStock = realProducts.filter((p) => (p.stock_quantity ?? p.stock ?? 0) === 0);

      const productList = realProducts.map((p) => {
        const issues: string[] = [];
        if (!p.meta_title) issues.push("missing meta_title");
        if (!p.meta_description) issues.push("missing meta_description");
        if (!p.body_html || p.body_html.length < 50) issues.push("body too short");
        if (!p.tags) issues.push("no tags");
        if (!p.image_url) issues.push("no image");
        if ((p.stock_quantity ?? p.stock ?? 0) === 0) issues.push("out of stock");
        return `[${p.id}] "${p.name}" | issues: ${issues.length > 0 ? issues.join(", ") : "ok"}`;
      }).join("\n");

      return `You are diagnosing a Shopify store. ${realProducts.length} real products synced from Shopify.

PRE-COMPUTED ISSUE COUNTS (use these as ground truth, do not over-claim or under-claim):
- ${missingMetaTitle.length} products missing meta_title
- ${missingMetaDesc.length} products missing meta_description
- ${missingBody.length} products with empty/very short body_html
- ${missingTags.length} products with no tags
- ${missingImage.length} products with no image
- ${outOfStock.length} products out of stock

PRODUCTS:
${productList}

REQUIRED OUTPUT RULES:
1. If ${missingMetaTitle.length} > 0, you MUST create a finding with category="seo", action_type="seo_update". Group up to 5 affected product IDs in affected_product_ids.
2. If ${missingMetaDesc.length} > 0, MUST create a separate seo finding for it (also action_type="seo_update").
3. If ${missingBody.length} > 0, MUST create a finding with category="product", action_type="seo_update".
4. For inventory issues use category="inventory", action_type="inventory_update".
5. ALWAYS use the bracketed UUID (e.g. "ae4a4f0c-89f1-4c72-90a2-4178ca8bc41f") in affected_product_ids — NEVER product names.
6. Do NOT invent issues. Only report what the pre-computed counts confirm.
7. Each finding should have severity reflecting how many products are affected.

Return JSON array of findings.`;
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
