import { callLLM } from "../llm";
import { tryRunPrompt } from "../../prompts";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const landingPageSkill: ContentSkill = {
  id: "landing_page",
  name: "Landing Page",
  category: "page",
  description: "生成高转化 Landing Page HTML（CRO 验证结构：上折公式/紧迫感/信任信号/schema）",
  icon: "Globe",
  color: "green",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 45,
  agents: ["content_producer"],
  inputs: [
    { key: "page_goal", label: "页面目标", type: "select", required: true, default: "purchase", options: [
      { value: "purchase", label: "促成购买（广告承接页）" },
      { value: "email_signup", label: "邮件订阅/留资" },
      { value: "presale", label: "新品预售" },
      { value: "brand_story", label: "品牌故事" },
    ]},
    { key: "product", label: "核心商品", type: "product" },
    { key: "headline_idea", label: "主标题灵感（可选）", type: "text", placeholder: "有什么想法可以写这里" },
    { key: "offer", label: "优惠信息（可选）", type: "text", placeholder: "如：首单 9 折、免运费" },
    { key: "urgency", label: "紧迫感元素（可选）", type: "text", placeholder: "如：仅剩 12 件 / 优惠截止周日" },
    { key: "social_proof", label: "社会证明（可选）", type: "text", placeholder: "如：已售 3000+ 件 / 4.9 星好评" },
    { key: "traffic_source", label: "流量来源", type: "select", default: "paid_social", options: [
      { value: "paid_social", label: "付费社媒（TikTok/Meta）" },
      { value: "email", label: "邮件营销" },
      { value: "organic", label: "自然流量/SEO" },
      { value: "influencer", label: "达人推广" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const goal = (input.page_goal as string) || "purchase";
    const product = input.product;
    const headline = (input.headline_idea as string) || "";
    const offer = (input.offer as string) || "";
    const urgency = (input.urgency as string) || "";
    const audience = (input.audience as string) || "";
    const socialProof = (input.social_proof as string) || "";
    const trafficSource = (input.traffic_source as string) || "paid_social";

    const dbOut = await tryRunPrompt("page.landing", {
      goal,
      product: { name: product?.name || "" },
      product_description: (product?.body_html || "").slice(0, 300),
      headline_idea: headline,
      offer,
      urgency,
      audience,
      social_proof: socialProof,
      traffic_source: trafficSource,
    }, { source: "landing_page" });
    if (dbOut) {
      return {
        skill_id: "landing_page",
        output: dbOut,
        generated_at: new Date().toISOString(),
        estimated_cost: { text: 0.04, image: 0 },
      };
    }

    // CRO-proven section blueprints per goal type
    const sectionBlueprints: Record<string, string> = {
      purchase: `
SECTION 1 — ABOVE FOLD (first 600-800px, highest priority):
  - Headline: outcome-focused, match the ad message the user just saw (message match)
  - Sub-headline: one-sentence clarity on who this is for + key benefit
  - Social proof bar: star rating + review count OR "X,000+ customers" trust pill — place directly under headline
  - Hero CTA button: action verb + urgency ("Shop Now — Only 12 Left" or "Get [Product] Today")
  - Trust micro-copy under CTA: "Free shipping · 30-day returns · Secure checkout"

SECTION 2 — BENEFIT BLOCKS (3 benefit columns or bullets):
  - Lead with lifestyle/transformation, not features
  - Use sensory language: texture, feel, fit, confidence
  - Each benefit: icon + bold headline + 1-sentence expansion
  - Research shows 3+ benefit bullets increase CVR 18%

SECTION 3 — PRODUCT SHOWCASE:
  - Product image (use provided image_url or placeholder with correct dimensions)
  - Price: original price struck through + sale price highlighted if offer exists
  - Variant selector (color/size) if applicable
  - Stock indicator: "Only [N] left in stock" (urgency mechanic proven +10-15% acceptance)
  - Repeat CTA button here

SECTION 4 — SOCIAL PROOF (positioned near price — proximity effect):
  - 3 customer review cards: name + stars + specific detail (sizing/comfort/quality)
  - Aggregate rating display: "★★★★★ 4.9/5 from 847 reviews"
  - UGC-style: make reviews look authentic not corporate

SECTION 5 — TRUST & OBJECTION REMOVAL:
  - Guarantee badge: "30-Day No-Questions Returns"
  - Shipping badge: "Free Shipping on Orders $50+"
  - Security: "SSL Secured Checkout"
  - Brief FAQ: 3 most common objections answered (sizing, shipping time, returns)

SECTION 6 — URGENCY/SCARCITY BAR (before final CTA):
  - Countdown timer OR limited stock display
  - "X people viewing this right now" if applicable

SECTION 7 — FINAL CTA:
  - Repeat main CTA with offer reminder
  - Last social proof line ("Join 3,000+ happy customers")`,

      email_signup: `
SECTION 1 — ABOVE FOLD:
  - Hook headline: specific transformation promise ("Get 5 outfits from 3 pieces")
  - 3 value bullets: what they'll receive / learn
  - Email form: minimal (email only), CTA: "Send Me the Guide →"
  - Trust line: "Zero spam. Unsubscribe anytime. 12,000 subscribers already."

SECTION 2 — VALUE PROOF:
  - Sample content preview (blurred or teaser)
  - Social proof: "X subscribers" or testimonial about the content

SECTION 3 — FINAL CTA:
  - Repeat form with different angle`,

      presale: `
SECTION 1 — HERO (coming soon energy):
  - Countdown timer to launch date (HTML/CSS only, no JS)
  - Product teaser: name + 1 image + "Coming [Date]"
  - Early bird exclusive benefit: "[X]% off / Free gift / Priority access"

SECTION 2 — PRODUCT DETAILS:
  - Key features (3-5 bullets)
  - Design story / why we made this

SECTION 3 — EARLY ACCESS FORM:
  - Email signup to join waitlist
  - Number of spots taken: "247 people already on the list"

SECTION 4 — BRAND TRUST:
  - Social proof from previous products`,

      brand_story: `
SECTION 1 — BRAND HERO:
  - Full-width atmospheric image placeholder
  - Brand name + one-line manifesto

SECTION 2 — ORIGIN STORY:
  - Founder story with specific details (year, moment, why)
  - 2-3 short paragraphs, conversational voice

SECTION 3 — MISSION / VALUES (3 pillars):
  - Each pillar: icon + headline + 2 sentences

SECTION 4 — SOCIAL PROOF / COMMUNITY:
  - Customer testimonials with emotional depth
  - Community size ("X people wearing JOJO")

SECTION 5 — FOLLOW CTA:
  - Social links + newsletter signup`,
    };

    // Traffic source affects message tone and CTA copy
    const trafficContext: Record<string, string> = {
      paid_social: "MESSAGE MATCH CRITICAL: Headlines must echo the ad they just clicked. Fast-paced, punchy. Assume cold audience, high skepticism.",
      email: "Warm audience, already knows the brand. Use first-name tone, remind them of prior browsing/interest. Softer sell.",
      organic: "Informational intent. SEO-friendly headings. Educate first, sell second.",
      influencer: "Mirror the influencer's tone. Mention 'as seen on [creator]'. Build on the creator's credibility.",
    };

    const productName = product?.name || "our product";
    const productDesc = (product?.body_html || "").slice(0, 400);
    const productImage = product?.image_url || "";
    const productPrice = product?.price || "";

    const output = await callLLM(
      `You are a world-class DTC brand conversion rate optimization expert. You design landing pages that generate 4-6% CVR on paid social traffic.

YOUR PRINCIPLES:
1. Above-fold determines 80% of performance — nail the headline + CTA + social proof before anything else
2. Message match: page tone must match the ad the visitor just left
3. Every section removes a specific objection or builds trust toward the purchase
4. Urgency and scarcity are real signals, never fake — only include if data provided
5. Mobile-first: assume 70%+ of traffic is mobile, design for thumb-scroll
6. ALL CSS must be inline (Shopify constraint). No JavaScript. No external resources.
7. Colors: use brand-neutral dark (#1a1a1a text, #ffffff background, accent #000000 CTAs) unless brand colors provided
8. CTAs: minimum 48px height, full-width on mobile, high-contrast, action verb + benefit

CONVERSION ELEMENTS TO INCLUDE:
- Social proof pill near headline (not buried at bottom)
- Trust badges near CTA (not just footer)
- Benefit language: transformation outcomes, not product features
- Urgency: only use if urgency/stock data provided
- Reviews: position near price, not at page bottom
- FAQ: answer the top 3 real objections inline

Return: { "body_html": "...complete Shopify-compatible HTML with all inline CSS..." }`,
      `GOAL: ${goal}
TRAFFIC SOURCE: ${trafficSource}
${trafficContext[trafficSource] || ""}

PRODUCT: ${productName}
DESCRIPTION: ${productDesc}
${productPrice ? `PRICE: $${productPrice}` : ""}
${productImage ? `PRODUCT IMAGE URL: ${productImage}` : ""}
${headline ? `HEADLINE IDEA: ${headline}` : ""}
${offer ? `OFFER: ${offer}` : ""}
${urgency ? `URGENCY/SCARCITY: ${urgency}` : ""}
${socialProof ? `SOCIAL PROOF DATA: ${socialProof}` : ""}
${audience ? `TARGET AUDIENCE: ${audience}` : ""}

SECTION STRUCTURE TO FOLLOW:
${sectionBlueprints[goal] || sectionBlueprints.purchase}

IMPORTANT:
- Generate complete, production-ready HTML
- All sections in correct order
- Each CTA button must be visually prominent: large, high-contrast
- Mobile responsive using max-width, flex-wrap, and responsive font sizes
- Include Product schema JSON-LD in a <script type="application/ld+json"> tag at the start if product data is available

Return only: { "body_html": "...your full HTML..." }`,
      5000
    );

    return {
      skill_id: "landing_page",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
