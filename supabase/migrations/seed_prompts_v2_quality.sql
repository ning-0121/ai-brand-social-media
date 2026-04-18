-- V2 prompts：大幅提升 detail page / landing page / homepage hero / banner 质量
-- 运行后会自动成为 is_active 版本，督察后续按真实效果决定是否回滚到 v1
-- 老的 v1 保留作为对比基准

-- ─────────────────────────────────────────────
-- 1. 商品详情页 v2：Magazine-style rich HTML
-- ─────────────────────────────────────────────
insert into prompts (slug, version, title, description, template, system_prompt, model, tier, max_tokens, temperature, is_active, is_champion)
values (
  'product.detail.page',
  2,
  '商品详情页 v2 · Magazine Quality',
  '完整多段式 HTML：Hero + 价值承诺 + 特性对比 + 规格 + 配送 + FAQ + 双 CTA，inline CSS Shopify 直装',
  'Generate a magazine-quality product detail page for:

PRODUCT
Name: {{product.name}}
Category: {{product.category}}
Price: {{product.price}}
Existing description: {{product.body_html}}
Hero image URL: {{product.image_url}}
Brand positioning: {{brand_positioning}}
Tone: {{tone}}
Target audience: {{audience_block}}

Return JSON ONLY with this EXACT structure (no markdown fences):
{
  "title": "Product title (≤60 chars, benefit-led, not just name)",
  "subtitle": "Value proposition in one sentence (≤80 chars)",
  "body_html": "<article>...complete rich HTML with inline CSS, 6-section layout...</article>",
  "highlights": ["5 sharp value bullets, each ≤15 words"],
  "specs": [{"name": "...", "value": "..."}, ...6-8 concrete specs],
  "cta_primary": "Action-oriented primary CTA (≤4 words)",
  "cta_secondary": "Soft secondary CTA (e.g. Size Guide, Learn More)",
  "meta_title": "SEO title (≤60 chars)",
  "meta_description": "SEO description (≤155 chars, with CTA verb)",
  "tags": "comma,separated,seo,tags"
}

body_html MUST include these 6 sections in order (use semantic HTML):
1. HERO: <section> with product image + title + subtitle + primary CTA button + price tag. Use flex row on desktop, column on mobile.
2. VALUE: <section> with 3-column grid, each column has emoji icon + bold headline + 1-line description. Use CSS Grid with gap.
3. STORY: <section> narrative block, 2-3 paragraphs of sensory scene-based writing (not spec dumping). Evoke feeling of wearing/using product.
4. SPECS: <section> with clean 2-column table of key/value pairs.
5. TRUST: <section> small grid of 3-4 trust badges (Free Shipping / 30-Day Returns / Secure Checkout / Authentic).
6. FAQ_CTA: <section> with 3 <details> FAQ items + final large CTA button at bottom.

All CSS inline. Use: system font stack, max-width: 1200px wrappers, generous padding (48-64px), rounded corners (8-16px), subtle box-shadow. Color palette: neutral whites/blacks with ONE accent color appropriate to category.',
  'You are a world-class e-commerce detail page designer at the level of Allbirds, Away, Oatly. Your pages convert at 4%+. Every section serves conversion. Write sensory, specific copy that paints scenes — never generic marketing speak like "premium quality" or "best-in-class". Use concrete details: textures, weights, temperatures, moments. HTML must be production-ready for Shopify: inline styles only, no scripts, no external resources, mobile-first flex/grid.',
  'anthropic/claude-sonnet-4.5', 'complex', 6000, 0.7, true, false
)
on conflict (slug, version) do nothing;

-- Demote v1 from active/champion (v2 takes over)
update prompts set is_active = false, is_champion = false where slug = 'product.detail.page' and version = 1;
update prompts set is_active = true, is_champion = true where slug = 'product.detail.page' and version = 2;


-- ─────────────────────────────────────────────
-- 2. Landing Page v2：高转化活动承接页
-- ─────────────────────────────────────────────
insert into prompts (slug, version, title, description, template, system_prompt, model, tier, max_tokens, temperature, is_active, is_champion)
values (
  'page.landing',
  1,
  '活动承接页 v1 · High Conversion',
  '广告/社媒导流专用落地页：Hero + 紧迫性 + 价值 + 社会证明 + FAQ + 强 CTA',
  'Generate a high-conversion landing page HTML:

CAMPAIGN CONTEXT
Goal: {{goal}}
Core product: {{product.name}}
Product description: {{product_description}}
Headline idea (if any): {{headline_idea}}
Offer / discount: {{offer}}
Urgency element (e.g. Limited stock, Ends Sunday): {{urgency}}
Target audience: {{audience}}

Return JSON ONLY:
{
  "body_html": "<div>...entire landing page HTML...</div>",
  "headline": "Primary hero headline",
  "subheadline": "Hero subheadline",
  "cta_primary": "Primary CTA text"
}

body_html MUST have these 7 sections in exact order:

1. ANNOUNCEMENT BAR (top strip): thin full-width colored bar with offer text + timer emoji + CTA.
2. HERO: full-bleed section with LEFT side headline + subhead + CTA button + trust microcopy (e.g. "2,347 bought this week"), RIGHT side product image placeholder with rounded corners and shadow. Gradient background.
3. SOCIAL PROOF STRIP: row of 4 stats (customers / rating / countries / years) with big numbers and small labels.
4. BENEFITS: 3-column grid, each column: icon emoji (56px) / bold heading / 2-line description. Background: light neutral.
5. HOW IT WORKS: 3-step horizontal flow (Step 1 → Step 2 → Step 3) with arrows between. Each step has number badge + title + description.
6. TESTIMONIALS: 3 testimonial cards in a row with quote / name / role. Use "
" glyph or styled border-left. Add 5-star row.
7. FINAL CTA: centered block with urgency text ("Only 43 left at this price") + big CTA button + secondary link. Darker contrasting background.

Rules:
- All inline CSS, mobile-first (flex-wrap, max-width)
- Primary accent color: match offer tone (red for urgency, emerald for eco, navy for premium)
- CTA buttons: 48-56px tall, 24-40px horizontal padding, font-weight 600+
- No Lorem Ipsum — write real copy tailored to the product
- Concrete numbers beat abstract claims (say "34% faster" not "much faster")',
  'You are a senior direct-response copywriter and conversion designer who has shipped pages for DTC brands that do 9-figure revenue. You know every pixel must earn its place. Write copy with emotional hooks, specific numbers, and urgency without being tacky. HTML is production-ready Shopify-compatible inline-CSS only.',
  'anthropic/claude-sonnet-4.5', 'complex', 6500, 0.75, true, true
)
on conflict (slug, version) do nothing;


-- ─────────────────────────────────────────────
-- 3. Homepage Hero v2：视觉冲击 + 明确路径
-- ─────────────────────────────────────────────
insert into prompts (slug, version, title, description, template, system_prompt, model, tier, max_tokens, temperature, is_active, is_champion)
values (
  'page.homepage.hero',
  2,
  '首页 Hero v2 · Cinematic',
  '电影级首页 Hero：大标题 + 副标题 + 双 CTA + 精选 3 款商品卡片 + 滚动提示',
  'Generate a Shopify-ready homepage hero + featured products section:

Brand: {{brand}}
Positioning: {{positioning}}
Season/Theme: {{season}}
Featured products: {{product_names}}

Return JSON:
{
  "body_html": "<section>...hero HTML...</section><section>...featured products HTML...</section>"
}

Structure:

HERO SECTION:
- Full-viewport-height (min-height: 80vh) with gradient OR solid dark background (use CSS gradient for depth)
- Centered content: small eyebrow text (uppercase, letter-spacing) / massive headline (clamp(48px, 8vw, 96px), tight line-height) / subheadline (one line, ≤120 chars) / primary CTA button + secondary text link
- Scroll indicator hint at bottom (animated arrow or "scroll to explore")

FEATURED PRODUCTS SECTION (if products provided):
- Section title + thin divider
- 3-column grid of product cards: image placeholder (aspect 4:5) / product name / short benefit line / "Shop" micro-CTA
- Cards have subtle hover-ready styles (transform, shadow) — but inline only

Rules:
- Inline CSS only
- Use CSS clamp() for responsive font sizes
- Color palette 2-3 colors max, high contrast
- Mobile-first: section collapses to single column
- NO emoji. Typography-led design.',
  'You are a creative director at a fashion/lifestyle DTC brand. Your hero sections feel like magazine covers — bold, restrained, confident. You use typography as the primary design element. Copy is brand-led (not product-led): the headline is a promise or worldview, not a feature list.',
  'anthropic/claude-sonnet-4.5', 'complex', 4500, 0.75, true, false
)
on conflict (slug, version) do nothing;

update prompts set is_active = false, is_champion = false where slug = 'page.homepage.hero' and version = 1;
update prompts set is_active = true, is_champion = true where slug = 'page.homepage.hero' and version = 2;


-- ─────────────────────────────────────────────
-- 4. Banner v1（首次入库 — 原 skill 是硬编码）
-- ─────────────────────────────────────────────
insert into prompts (slug, version, title, description, template, system_prompt, model, tier, max_tokens, temperature, is_active, is_champion)
values (
  'image.banner.design',
  1,
  '活动 Banner 图文方案 v1',
  '生成 Banner 文案 + 色板 + AI 图片 prompt，尺寸 {{size}}',
  'Purpose: {{purpose}}
Product: {{product_name}}
Category: {{category}}
Size: {{template_id}} ({{size}})
Extra instructions: {{extra}}

Generate professional {{purpose}} banner design as JSON:
{
  "headline": "Short punchy headline (≤10 chars Chinese or ≤20 chars English)",
  "subheadline": "One-line supporting text",
  "cta": "2-3 word CTA button text",
  "badge": "Small corner badge text (or empty string)",
  "discount": "Discount info or empty",
  "backgroundColor": "CSS background value (can be gradient)",
  "textColor": "hex color for main text",
  "accentColor": "hex color for CTA/badge",
  "brandName": "Brand name",
  "image_prompt": "Detailed ENGLISH prompt for AI image generation. Must describe: scene, product placement, lighting setup, color mood, composition for {{size}} aspect ratio, professional commercial photography quality, leave clean space for text overlay on [specify region: top-left/center/etc]. Be cinematic and specific."
}',
  'You are an award-winning art director for performance marketing campaigns. You write image prompts that consistently produce magazine-quality ads. Your headlines stop scroll — they use specificity (numbers, named emotions) over superlatives. CTAs are verbs, never "Click Here" or "Learn More". Return JSON only.',
  'anthropic/claude-sonnet-4.5', 'balanced', 1500, 0.8, true, true
)
on conflict (slug, version) do nothing;
