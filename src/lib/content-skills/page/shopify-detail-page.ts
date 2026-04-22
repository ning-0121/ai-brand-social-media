import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const shopifyDetailPageSkill: ContentSkill = {
  id: "shopify_detail_page",
  name: "Shopify 商品详情页",
  category: "page",
  description: "生成高转化商品详情页 HTML：JSON-LD schema、利益点公式、评价近 CTA、库存紧迫感",
  icon: "FileText",
  color: "blue",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 45,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "style", label: "设计风格", type: "select", default: "modern", options: [
      { value: "modern", label: "现代简约" },
      { value: "luxury", label: "高端奢华" },
      { value: "playful", label: "活泼时尚" },
      { value: "minimal", label: "极简" },
      { value: "bold", label: "大胆醒目" },
    ]},
    { key: "sections", label: "包含区块", type: "select", default: "full", options: [
      { value: "full", label: "完整版（Hero+卖点+规格+场景+评价+CTA）" },
      { value: "compact", label: "精简版（卖点+规格+CTA）" },
      { value: "story", label: "故事版（品牌故事+场景+评价）" },
    ]},
    { key: "urgency_stock", label: "库存紧迫感（可选）", type: "text", placeholder: "如：仅剩 8 件" },
    { key: "reviews_summary", label: "评价摘要（可选）", type: "text", placeholder: "如：4.9 星 · 1,247 条评价" },
  ],
  async execute(input: SkillInputData, context?: SkillContext): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const style = (input.style as string) || "modern";
    const sections = (input.sections as string) || "full";
    const positioning = context?.brand_positioning || "";
    const urgencyStock = (input.urgency_stock as string) || "";
    const reviewsSummary = (input.reviews_summary as string) || "";

    const styleGuide: Record<string, { palette: string; typography: string; feel: string }> = {
      modern: {
        palette: "#1a1a1a text, #f8f8f8 background, #000000 CTA buttons, #e8e8e8 dividers",
        typography: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; headings bold 24-32px; body 16px; line-height 1.6",
        feel: "Clean, airy whitespace, geometric grid, confident minimalism",
      },
      luxury: {
        palette: "#1c1c1c text, #faf9f7 cream background, #8b6914 gold accents, #2c2c2c CTA",
        typography: "'Georgia', 'Times New Roman', serif for headings; system-ui for body; letter-spacing 0.05em on headings",
        feel: "Generous padding, editorial photography framing, understated elegance",
      },
      playful: {
        palette: "#1a1a1a text, #fff background, #ff4d6d accent, #ffe66d secondary accent",
        typography: "system-ui bold; oversized section numbers; playful emoji in bullets; energetic sizing",
        feel: "Bold colors, expressive typography, high energy, Gen-Z appeal",
      },
      minimal: {
        palette: "#000 text, #fff background, #000 CTA, sparse color",
        typography: "system-ui; ultra-clean spacing; no decorative elements; let whitespace breathe",
        feel: "Dieter Rams-inspired: every element earns its place",
      },
      bold: {
        palette: "#ffffff text on dark, #111 background, #ff3b3b accent, high contrast throughout",
        typography: "Bold headings 36px+; uppercase section labels; strong hierarchy",
        feel: "High impact, statement-making, streetwear-adjacent confidence",
      },
    };

    const sectionGuide: Record<string, string> = {
      full: `
1. PRODUCT HERO (above fold, first 600px — most critical):
   - Product name as H1 (keyword-rich, benefit-oriented)
   - One-line tagline: what transformation does this product deliver?
   - Price display: if sale, show original struck-through + sale price highlighted
   - ${reviewsSummary ? `Reviews bar: "${reviewsSummary}" with star icons — place DIRECTLY under price (proximity to purchase decision)` : "Rating placeholder: ★★★★★ and review count link"}
   - ${urgencyStock ? `Stock urgency: "🔴 ${urgencyStock}" in small high-visibility text near CTA` : ""}
   - Primary CTA button: "Add to Cart" — 48px+ height, full-width on mobile, #000 bg #fff text (or brand accent)

2. BENEFIT BULLETS (3-5 points — conversion research: 3+ bullets increase CVR 18%):
   - Lead with OUTCOMES not features: "Feel confident all day" not "Has moisture-wicking fabric"
   - Use sensory language: texture, fit, movement, feel
   - Format: emoji/icon + bold benefit title + 1-sentence expansion
   - Each bullet addresses a known customer concern (fit, quality, comfort, sustainability)

3. PRODUCT SPECIFICATIONS (scannable table):
   - Material composition
   - Size range / fit guide summary
   - Care instructions
   - Country of origin / production notes
   - Dimensions if relevant

4. LIFESTYLE / USAGE SCENARIO (storytelling section):
   - 2-3 short paragraphs painting the scene of product use
   - Aspirational but authentic — not corporate-speak
   - "This is for the woman who..." or "Built for..."

5. SOCIAL PROOF (positioned NEAR CTA — not buried at page bottom):
   - 3 review cards with: customer name + stars + specific detail (mentions sizing/comfort/quality)
   - ${reviewsSummary ? `Aggregate: "${reviewsSummary}"` : "Aggregate rating + total count"}
   - Make reviews read authentic: real specific details, not generic praise

6. TRUST & OBJECTION REMOVAL (reduce cart abandonment):
   - 🚚 Free shipping threshold (e.g., "Free shipping on orders $50+")
   - 🔄 Return policy: "30-day hassle-free returns"
   - 🔒 Secure checkout badge
   - FAQ: answer 3 most common objections inline (sizing, shipping time, material feel)

7. FINAL CTA (repeat for scroll-down visitors):
   - Same CTA button repeated
   - ${urgencyStock ? `Urgency reminder: "${urgencyStock}"` : "Inventory reminder if applicable"}
   - "Join X happy customers" social proof line`,

      compact: `
1. PRODUCT NAME (H1) + one-line benefit tagline
2. Price + ${reviewsSummary || "rating"} (proximity to purchase decision)
3. ${urgencyStock ? `Stock urgency: "${urgencyStock}"` : ""}
4. BENEFIT BULLETS (3-5, outcome-focused, sensory language)
5. Specifications table (material, sizing, care)
6. Trust badges row (shipping / returns / security)
7. CTA button (large, high-contrast, repeated)`,

      story: `
1. Brand story header: why this product exists
2. Lifestyle scenario: 2 paragraphs of aspirational use-case
3. Key features (3 bullets, benefit-framed)
4. ${reviewsSummary ? `Social proof: "${reviewsSummary}"` : "Social proof section"}
5. 3 customer review cards
6. CTA with trust micro-copy`,
    };

    const systemPrompt = `You are a world-class Shopify product page CRO specialist. You create product detail pages that consistently achieve 4-6% add-to-cart rates by applying conversion science principles.

CONVERSION SCIENCE RULES:
1. Social proof must appear NEAR the price and CTA — not buried. Proximity drives conversion.
2. Benefits before features: customers buy outcomes, not specs. Lead with transformation.
3. Specificity in copy converts better than vague superlatives ("47 women bought this last week" > "popular")
4. Urgency elements (stock count, time limit) increase acceptance 10-15% — but ONLY include if real data provided
5. Trust signals near checkout reduce abandonment by 15-20%
6. 3+ benefit bullets increase CVR 18% vs paragraphs — always use structured bullet format
7. FAQ inline (not linked, not modal) removes objections before they kill the sale

TECHNICAL CONSTRAINTS (Shopify body_html field):
- ALL CSS must be INLINE (style="...") — Shopify strips external stylesheets
- Standard HTML elements only: div, h1-h3, p, table, tr, td, ul, li, img, span, a
- Max-width: 800px centered
- NO JavaScript, NO <style> tags, NO custom CSS classes
- Web-safe fonts only: system-ui, Georgia, Roboto via system stack
- All colors as hex codes

SCHEMA MARKUP:
- Include a <script type="application/ld+json"> block at the start with Product schema
- Include: name, description, offers (price, currency, availability), aggregateRating if reviews data provided

Return JSON: { "body_html": "...complete HTML starting with schema script tag..." }`;

    const userPrompt = `Generate the Shopify product detail page:

PRODUCT: ${product.name}
CURRENT DESCRIPTION: ${(product.body_html || product.description || "").slice(0, 800)}
PRICE: ${product.price || "N/A"}
CATEGORY: ${product.category || "N/A"}
TAGS: ${product.tags || "N/A"}
${product.image_url ? `PRODUCT IMAGE: ${product.image_url}` : ""}
${positioning ? `BRAND POSITIONING: ${positioning}` : ""}
${urgencyStock ? `STOCK/URGENCY: ${urgencyStock}` : ""}
${reviewsSummary ? `REVIEWS: ${reviewsSummary}` : ""}

DESIGN STYLE: ${style}
COLOR/TYPOGRAPHY: ${styleGuide[style]?.palette || styleGuide.modern.palette}
TYPOGRAPHY: ${styleGuide[style]?.typography || styleGuide.modern.typography}
VISUAL FEEL: ${styleGuide[style]?.feel || styleGuide.modern.feel}

SECTION STRUCTURE:
${sectionGuide[sections] || sectionGuide.full}

Generate ONLY the body_html (not a full HTML document). Include the JSON-LD schema block first, then all content sections.

Return: { "body_html": "...your HTML here..." }`;

    const output = await callLLM(systemPrompt, userPrompt, 5000);

    return {
      skill_id: "shopify_detail_page",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
