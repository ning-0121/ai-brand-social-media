import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * schema_markup_auditor — 审计店铺 schema 完整度 + 批量生成 JSON-LD
 *
 * 研究验证：Product + aggregateRating schema 可提升 SERP CTR 20-40%
 */
export const schemaMarkupAuditorSkill: ContentSkill = {
  id: "schema_markup_audit",
  name: "Schema 结构化数据审计",
  category: "copy",
  description: "审计店铺 schema 覆盖度 + 批量生成 Product/Review/Breadcrumb/FAQ JSON-LD",
  icon: "Code",
  color: "purple",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "audit_scope", label: "审计范围", type: "select", default: "top_20", options: [
      { value: "top_20", label: "TOP 20 产品" },
      { value: "all_products", label: "全部产品" },
      { value: "zero_schema", label: "只看无 schema 的" },
    ]},
    { key: "store_domain", label: "店铺域名", type: "text", default: "jojofeifei.com" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const scope = (input.audit_scope as string) || "top_20";
    const domain = (input.store_domain as string) || "jojofeifei.com";

    // 拉取真实商品数据
    let q = supabase.from("products").select("id, name, price, body_html, image_url, seo_score, meta_title, meta_description, tags");
    if (scope === "top_20") q = q.limit(20);
    else if (scope === "zero_schema") q = q.or("body_html.is.null,meta_description.is.null").limit(20);
    const { data: products } = await q;

    const productSummary = (products || []).slice(0, 20).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      has_description: !!(p.body_html && p.body_html.length > 200),
      has_meta_title: !!p.meta_title,
      has_meta_description: !!p.meta_description,
      has_image: !!p.image_url,
    }));

    const output = await callLLM(
      `你是 E-commerce 技术 SEO 专家。为 Shopify 店铺审计并生成 schema.org JSON-LD 结构化数据。

**Schema 优先级（研究验证，按 CTR 提升排序）**：
1. **Product + Offer + AggregateRating**（商品页，+20-40% CTR，触发 SERP 星评）
2. **BreadcrumbList**（产品面包屑，帮 Google 理解层级）
3. **Organization + LocalBusiness**（首页/关于页，建立品牌实体）
4. **FAQPage**（FAQ 板块，触发折叠式富结果）
5. **Article**（博客/指南页，触发顶部卡片）
6. **VideoObject**（产品视频，展示视频缩略图在 SERP）

**对于 Shopify**：
- 默认 theme 通常只有基础 Product schema，缺 AggregateRating + Review（评价）
- 需要从评价应用（Loox/Judge.me/Okendo）接入评价数据后才能发挥威力

返回 JSON：
{
  "audit_summary": {
    "total_products_scanned": 数字,
    "current_schema_coverage_pct": "当前覆盖百分比",
    "missing_critical_schemas": ["缺失的关键 schema 类型"],
    "estimated_ctr_uplift": "全部修复后预计 CTR 提升"
  },
  "priority_fixes": [
    {
      "rank": 1,
      "schema_type": "Product + AggregateRating",
      "affected_pages": "受影响的页面数",
      "fix_complexity": "low | medium | high",
      "expected_impact": "预期效果"
    }
  ],
  "sample_product_jsonld": "为示例产品生成的完整 Product JSON-LD（含 name/price/image/offers/aggregateRating）",
  "sample_breadcrumb_jsonld": "BreadcrumbList JSON-LD 示例",
  "sample_organization_jsonld": "Organization JSON-LD（含 logo/sameAs 社交账号/contactPoint）",
  "shopify_install_steps": [
    "具体在 Shopify 后台操作的步骤，含 theme.liquid 的位置"
  ],
  "validation_tools": [
    "如何验证：Google Rich Results Test 网址 + Schema Markup Validator"
  ]
}`,
      `店铺域名：${domain}
审计范围：${scope}
实际商品数据：${JSON.stringify(productSummary, null, 2)}

请基于真实商品数据给出审计报告和具体 JSON-LD 模板。`,
      4500
    );

    return {
      skill_id: "schema_markup_audit",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
