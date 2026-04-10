/**
 * Content Assembler — combines AI-generated text + images into deployable content.
 */

export interface DetailPageData {
  title: string;
  subtitle?: string;
  highlights?: string[];
  description?: string;
  specs?: Array<{ name: string; value: string }>;
  cta_primary?: string;
  cta_secondary?: string;
}

/**
 * Assemble a complete Shopify product detail page HTML.
 * Combines copy from product_detail_page Skill + product images + AI-generated images.
 */
export function assembleDetailPage(
  copy: DetailPageData,
  productImageUrl?: string,
  aiImages?: Array<{ label: string; url: string }>
): string {
  // Filter out data URLs (base64 strings are too large for HTML and break QA)
  const isValidUrl = (url?: string) => url && !url.startsWith("data:") && url.startsWith("http");
  const heroImg = isValidUrl(productImageUrl) ? productImageUrl : (aiImages?.find(i => isValidUrl(i.url))?.url || "");
  const lifestyleImg = aiImages?.find((i) => i.label === "lifestyle" && isValidUrl(i.url))?.url || "";

  let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;color:#1a1a2e">`;

  // Hero section
  if (heroImg) {
    html += `<div style="text-align:center;margin-bottom:24px"><img src="${heroImg}" alt="${copy.title}" style="max-width:100%;border-radius:8px" /></div>`;
  }

  // Subtitle
  if (copy.subtitle) {
    html += `<p style="font-size:18px;color:#6c63ff;font-weight:600;margin-bottom:16px;text-align:center">${copy.subtitle}</p>`;
  }

  // Highlights
  if (copy.highlights && copy.highlights.length > 0) {
    html += `<div style="background:#f8f7ff;border-radius:12px;padding:20px;margin-bottom:24px">`;
    html += `<h3 style="font-size:16px;font-weight:700;margin-bottom:12px">Why You'll Love It</h3>`;
    html += `<ul style="list-style:none;padding:0;margin:0">`;
    for (const h of copy.highlights) {
      html += `<li style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px">✦ ${h}</li>`;
    }
    html += `</ul></div>`;
  }

  // Lifestyle image
  if (lifestyleImg) {
    html += `<div style="text-align:center;margin-bottom:24px"><img src="${lifestyleImg}" alt="Lifestyle" style="max-width:100%;border-radius:8px" /></div>`;
  }

  // Description
  if (copy.description) {
    html += `<div style="font-size:15px;line-height:1.8;margin-bottom:24px">${copy.description}</div>`;
  }

  // Specs table
  if (copy.specs && copy.specs.length > 0) {
    html += `<div style="margin-bottom:24px">`;
    html += `<h3 style="font-size:16px;font-weight:700;margin-bottom:12px">Details & Specs</h3>`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:14px">`;
    for (const spec of copy.specs) {
      html += `<tr style="border-bottom:1px solid #f0f0f0"><td style="padding:10px 0;font-weight:600;width:35%;color:#666">${spec.name}</td><td style="padding:10px 0">${spec.value}</td></tr>`;
    }
    html += `</table></div>`;
  }

  // CTA
  if (copy.cta_primary) {
    html += `<div style="text-align:center;margin-top:24px;padding:20px">`;
    html += `<p style="font-size:16px;font-weight:700;margin-bottom:12px">${copy.cta_primary}</p>`;
    if (copy.cta_secondary) {
      html += `<p style="font-size:13px;color:#888">${copy.cta_secondary}</p>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

/**
 * Assemble a social media post ready for publishing.
 */
export function assembleSocialPost(
  body: string,
  imageUrl: string | null,
  hashtags: string[],
  cta?: string
): { text: string; image_url: string | null; hashtags: string[] } {
  let text = body;
  if (cta) text += `\n\n${cta}`;
  if (hashtags.length > 0) text += `\n\n${hashtags.join(" ")}`;

  return { text, image_url: imageUrl, hashtags };
}

/**
 * Assemble a banner/hero HTML section.
 */
export function assembleBanner(
  headline: string,
  subheadline: string,
  cta: string,
  backgroundImageUrl?: string,
  backgroundColor?: string
): string {
  const bg = backgroundImageUrl
    ? `background-image:url('${backgroundImageUrl}');background-size:cover;background-position:center`
    : `background:${backgroundColor || "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)"}`;

  return `<div style="${bg};padding:60px 40px;border-radius:16px;text-align:center;color:#fff;position:relative">
    <div style="position:relative;z-index:1">
      <h1 style="font-size:36px;font-weight:800;margin-bottom:12px;text-shadow:0 2px 4px rgba(0,0,0,0.3)">${headline}</h1>
      <p style="font-size:18px;margin-bottom:24px;opacity:0.9">${subheadline}</p>
      <a href="#" style="display:inline-block;background:#fff;color:#1a1a2e;padding:14px 32px;border-radius:8px;font-weight:700;text-decoration:none;font-size:16px">${cta}</a>
    </div>
  </div>`;
}

/**
 * Assemble a complete landing page HTML.
 */
export function assembleLandingPage(
  heroHtml: string,
  sections: Array<{ title: string; body: string; imageUrl?: string }>
): string {
  let html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto">`;

  // Hero
  html += heroHtml;

  // Sections
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const reversed = i % 2 === 1;
    html += `<div style="display:flex;gap:32px;padding:40px 0;align-items:center;flex-wrap:wrap;${reversed ? "flex-direction:row-reverse" : ""}">`;
    if (s.imageUrl) {
      html += `<div style="flex:1;min-width:280px"><img src="${s.imageUrl}" alt="${s.title}" style="width:100%;border-radius:12px" /></div>`;
    }
    html += `<div style="flex:1;min-width:280px"><h2 style="font-size:24px;font-weight:700;margin-bottom:12px">${s.title}</h2><p style="font-size:15px;line-height:1.7;color:#555">${s.body}</p></div>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}
