/**
 * 高级 SEO 工具集
 * 基于 claude-seo 的核心能力，移植为可调用函数
 * 技术 SEO 审计、Schema 验证、Core Web Vitals、竞品 SEO 分析
 */

// ─── 1. 技术 SEO 审计（抓取页面分析）──────────────────────

export interface TechnicalSEOAudit {
  url: string;
  title: { text: string; length: number; ok: boolean };
  meta_description: { text: string; length: number; ok: boolean };
  h1: { count: number; texts: string[]; ok: boolean };
  canonical: string | null;
  og_tags: { title: boolean; description: boolean; image: boolean };
  structured_data: { found: boolean; types: string[] };
  images: { total: number; missing_alt: number };
  links: { internal: number; external: number };
  issues: string[];
  score: number;
}

export async function auditPageSEO(url: string): Promise<TechnicalSEOAudit | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BrandMind-SEO-Bot/1.0" } });
    if (!res.ok) return null;
    const html = await res.text();

    // Parse with regex (lightweight, no DOM dependency on server)
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleText = titleMatch?.[1]?.trim() || "";

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const metaDesc = metaDescMatch?.[1]?.trim() || "";

    const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
    const h1Texts = h1Matches.map(m => m[1].replace(/<[^>]*>/g, "").trim());

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([\s\S]*?)["']/i);
    const canonical = canonicalMatch?.[1] || null;

    const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
    const hasOgDesc = /<meta[^>]*property=["']og:description["']/i.test(html);
    const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);

    const hasJsonLd = /application\/ld\+json/i.test(html);
    const jsonLdTypes: string[] = [];
    const jsonLdMatches = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
    for (const m of jsonLdMatches) {
      try {
        const parsed = JSON.parse(m[1]);
        if (parsed["@type"]) jsonLdTypes.push(parsed["@type"]);
      } catch { /* ignore */ }
    }

    const imgMatches = Array.from(html.matchAll(/<img[^>]*>/gi));
    const missingAlt = imgMatches.filter(m => !m[0].includes("alt=")).length;

    const internalLinks = Array.from(html.matchAll(/href=["'](\/[^"']*|https?:\/\/[^"']*jojofeifei[^"']*)/gi)).length;
    const externalLinks = Array.from(html.matchAll(/href=["'](https?:\/\/(?!.*jojofeifei)[^"']*)/gi)).length;

    const issues: string[] = [];
    if (!titleText) issues.push("缺少 <title> 标签");
    else if (titleText.length > 60) issues.push(`标题过长 (${titleText.length} 字符)`);
    if (!metaDesc) issues.push("缺少 meta description");
    else if (metaDesc.length > 160) issues.push(`描述过长 (${metaDesc.length} 字符)`);
    if (h1Texts.length === 0) issues.push("缺少 H1 标签");
    if (h1Texts.length > 1) issues.push(`多个 H1 标签 (${h1Texts.length} 个)`);
    if (!canonical) issues.push("缺少 canonical 标签");
    if (!hasOgTitle) issues.push("缺少 og:title");
    if (!hasOgImage) issues.push("缺少 og:image");
    if (!hasJsonLd) issues.push("缺少 JSON-LD 结构化数据");
    if (missingAlt > 0) issues.push(`${missingAlt} 张图片缺少 alt 属性`);

    const score = Math.max(0, 100
      - (titleText ? 0 : 15) - (titleText.length > 60 ? 5 : 0)
      - (metaDesc ? 0 : 15) - (metaDesc.length > 160 ? 5 : 0)
      - (h1Texts.length === 1 ? 0 : 10)
      - (canonical ? 0 : 5)
      - (hasOgTitle ? 0 : 5) - (hasOgDesc ? 0 : 5) - (hasOgImage ? 0 : 5)
      - (hasJsonLd ? 0 : 10)
      - Math.min(15, missingAlt * 3)
    );

    return {
      url,
      title: { text: titleText, length: titleText.length, ok: titleText.length > 0 && titleText.length <= 60 },
      meta_description: { text: metaDesc, length: metaDesc.length, ok: metaDesc.length >= 120 && metaDesc.length <= 160 },
      h1: { count: h1Texts.length, texts: h1Texts, ok: h1Texts.length === 1 },
      canonical,
      og_tags: { title: hasOgTitle, description: hasOgDesc, image: hasOgImage },
      structured_data: { found: hasJsonLd, types: jsonLdTypes },
      images: { total: imgMatches.length, missing_alt: missingAlt },
      links: { internal: internalLinks, external: externalLinks },
      issues,
      score,
    };
  } catch (err) {
    console.error("SEO audit failed:", err);
    return null;
  }
}

// ─── 2. 批量页面审计 ───────────────────────────────────────

export async function auditMultiplePages(urls: string[]): Promise<{
  results: TechnicalSEOAudit[];
  summary: { avgScore: number; totalIssues: number; commonIssues: string[] };
}> {
  const results: TechnicalSEOAudit[] = [];

  // 串行抓取避免被封
  for (const url of urls.slice(0, 10)) {
    const audit = await auditPageSEO(url);
    if (audit) results.push(audit);
  }

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  const allIssues = results.flatMap(r => r.issues);
  const issueCount: Record<string, number> = {};
  for (const issue of allIssues) {
    issueCount[issue] = (issueCount[issue] || 0) + 1;
  }
  const commonIssues = Object.entries(issueCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `${issue} (${count} 个页面)`);

  return {
    results,
    summary: { avgScore, totalIssues: allIssues.length, commonIssues },
  };
}

// ─── 3. Core Web Vitals（通过 PageSpeed Insights API）──────

export interface CoreWebVitals {
  url: string;
  performance_score: number;
  lcp: { value: number; rating: "good" | "needs-improvement" | "poor" };
  fid: { value: number; rating: "good" | "needs-improvement" | "poor" };
  cls: { value: number; rating: "good" | "needs-improvement" | "poor" };
  ttfb: { value: number; rating: "good" | "needs-improvement" | "poor" };
  opportunities: string[];
}

export async function getCoreWebVitals(url: string): Promise<CoreWebVitals | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  const apiUrl = apiKey
    ? `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`
    : `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile`;

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return null;
    const data = await res.json();

    const lh = data.lighthouseResult;
    if (!lh) return null;

    const perfScore = Math.round((lh.categories?.performance?.score || 0) * 100);

    const lcpMs = lh.audits?.["largest-contentful-paint"]?.numericValue || 0;
    const fidMs = lh.audits?.["max-potential-fid"]?.numericValue || 0;
    const clsVal = lh.audits?.["cumulative-layout-shift"]?.numericValue || 0;
    const ttfbMs = lh.audits?.["server-response-time"]?.numericValue || 0;

    const rateValue = (val: number, good: number, poor: number): "good" | "needs-improvement" | "poor" =>
      val <= good ? "good" : val <= poor ? "needs-improvement" : "poor";

    const audits = lh.audits ? Object.values(lh.audits) as Array<Record<string, unknown>> : [];
    const opportunities = audits
      .filter(a => a.details && (a.details as Record<string, unknown>).type === "opportunity" && a.score !== null && (a.score as number) < 1)
      .slice(0, 5)
      .map(a => a.title as string);

    return {
      url,
      performance_score: perfScore,
      lcp: { value: Math.round(lcpMs), rating: rateValue(lcpMs, 2500, 4000) },
      fid: { value: Math.round(fidMs), rating: rateValue(fidMs, 100, 300) },
      cls: { value: Math.round(clsVal * 1000) / 1000, rating: rateValue(clsVal, 0.1, 0.25) },
      ttfb: { value: Math.round(ttfbMs), rating: rateValue(ttfbMs, 800, 1800) },
      opportunities,
    };
  } catch (err) {
    console.error("Core Web Vitals check failed:", err);
    return null;
  }
}

// ─── 4. 竞品 SEO 分析 ──────────────────────────────────────

export async function compareCompetitorSEO(
  ourUrl: string,
  competitorUrls: string[]
): Promise<{
  our_score: number;
  competitors: Array<{ url: string; score: number; advantages: string[] }>;
  recommendations: string[];
}> {
  const ourAudit = await auditPageSEO(ourUrl);
  const competitorAudits: Array<{ url: string; audit: TechnicalSEOAudit }> = [];

  for (const url of competitorUrls.slice(0, 3)) {
    const audit = await auditPageSEO(url);
    if (audit) competitorAudits.push({ url, audit });
  }

  const competitors = competitorAudits.map(({ url, audit }) => {
    const advantages: string[] = [];
    if (ourAudit) {
      if (audit.structured_data.found && !ourAudit.structured_data.found) advantages.push("有结构化数据");
      if (audit.h1.ok && !ourAudit.h1.ok) advantages.push("H1 标签规范");
      if (audit.meta_description.ok && !ourAudit.meta_description.ok) advantages.push("Meta Description 优化好");
      if (audit.images.missing_alt < ourAudit.images.missing_alt) advantages.push("图片 alt 更完善");
    }
    return { url, score: audit.score, advantages };
  });

  const recommendations: string[] = [];
  if (ourAudit) {
    if (!ourAudit.structured_data.found) recommendations.push("添加 JSON-LD Product 结构化数据");
    if (ourAudit.images.missing_alt > 0) recommendations.push(`修复 ${ourAudit.images.missing_alt} 张图片的 alt 属性`);
    if (!ourAudit.canonical) recommendations.push("添加 canonical 标签");
    if (ourAudit.issues.length > 0) recommendations.push(...ourAudit.issues.slice(0, 3));
  }

  return {
    our_score: ourAudit?.score || 0,
    competitors,
    recommendations,
  };
}
