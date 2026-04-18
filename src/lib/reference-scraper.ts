/**
 * Reference Scraping：抓竞品页面 → LLM 拆解结构 → 输出升级版
 *
 * 不做复杂浏览器渲染，只抓原始 HTML（够覆盖 95% 静态/SSR 页面）。
 * 提取文本 + 标签树要点 → LLM 分析 → 按品牌指南重写。
 */

import { callLLM } from "./content-skills/llm";
import { getBrandGuide, formatAsContextBlock } from "./brand-guide";

export interface ScrapeResult {
  source_url: string;
  title: string | null;
  text_excerpt: string;
  structure_summary: Record<string, unknown>;
  rewritten_html?: string;
  rewritten_notes?: string[];
  improvements?: string[];
}

/** 粗暴拆 HTML：取 title + h1/h2 + 主文本（去脚本/样式/导航重复内容） */
function extractTextAndStructure(html: string): {
  title: string | null;
  h1s: string[];
  h2s: string[];
  ctas: string[];
  bodyText: string;
} {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  const h1s = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi))
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean).slice(0, 8);

  const h2s = Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi))
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean).slice(0, 20);

  const ctas = Array.from(html.matchAll(/<(?:button|a)[^>]*>([\s\S]*?)<\/(?:button|a)>/gi))
    .map(m => m[1].replace(/<[^>]+>/g, "").trim())
    .filter(t => t.length > 0 && t.length < 60)
    .filter(t => /^(shop|buy|get|learn|start|try|add|view|order|discover|sign|join|download|continue|检查|购买|立即|了解|开始|加入|注册)/i.test(t))
    .slice(0, 15);

  // 去 head / script / style / noscript
  const body = html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");
  const bodyText = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);

  return { title, h1s, h2s, ctas, bodyText };
}

export async function scrapeAndAnalyze(url: string, options?: {
  goal?: string;
  rewrite?: boolean;
}): Promise<ScrapeResult> {
  const goal = options?.goal || "landing page rewrite";
  const shouldRewrite = options?.rewrite !== false;

  // 1. 抓 HTML
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BrandMindBot/1.0; +https://brandmind-ai-eight.vercel.app)",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`抓取失败 ${res.status}: ${url}`);
  const html = await res.text();
  const { title, h1s, h2s, ctas, bodyText } = extractTextAndStructure(html);

  // 2. LLM 拆解
  const brand = await getBrandGuide();
  const brandBlock = formatAsContextBlock(brand);

  const analyze = await callLLM(
    `You are a senior CRO consultant. Reverse-engineer the competitor page and identify what works + what can be improved from the POV of our brand (see BRAND CONTEXT).

Return JSON:
{
  "structure_summary": {
    "hero_hook": "what headline strategy they used",
    "value_framing": "rational vs emotional vs urgency",
    "social_proof_type": "stats / testimonials / logos / none",
    "cta_strategy": "how they ask for action",
    "urgency_tactics": "what they use",
    "sections_observed": ["section1", "section2", ...]
  },
  "what_works": ["punchy list of 3-5 strong moves"],
  "what_to_beat": ["3-5 weaknesses we can improve upon"],
  "rewrite_angle": "One-sentence strategic direction for our rewrite"
}`,
    `${brandBlock ? brandBlock + "\n\n---\n\n" : ""}COMPETITOR PAGE: ${url}
Title: ${title || "(none)"}
H1s: ${h1s.join(" | ")}
H2s: ${h2s.join(" | ")}
CTAs observed: ${ctas.join(" | ")}
Body excerpt:
${bodyText.slice(0, 3000)}

Analyze the strategy and return JSON.`,
    2000,
    "complex"
  );

  const result: ScrapeResult = {
    source_url: url,
    title,
    text_excerpt: bodyText.slice(0, 800),
    structure_summary: analyze as Record<string, unknown>,
  };

  // 3. 可选：按品牌重写一版
  if (shouldRewrite) {
    const rewrite = await callLLM(
      `You are a world-class conversion copywriter and designer. Take the competitor analysis and write a BETTER version of this ${goal}, tuned for OUR brand (see BRAND CONTEXT).

Rules:
- Keep sections that worked, upgrade sections that didn't
- Use OUR brand voice, colors, audience — NOT theirs
- Be more specific (numbers, sensory details) than the original
- Return JSON: { "body_html": "<section>...</section>...", "notes": ["what you changed and why"], "improvements": ["concrete upgrades over original"] }
- HTML must be Shopify-ready (inline CSS, mobile-first)`,
      `${brandBlock ? brandBlock + "\n\n---\n\n" : ""}COMPETITOR ANALYSIS:
${JSON.stringify(analyze, null, 2)}

Original text excerpt:
${bodyText.slice(0, 2000)}

Write our superior version as JSON.`,
      5000,
      "complex"
    );

    result.rewritten_html = rewrite.body_html as string;
    result.rewritten_notes = (rewrite.notes as string[]) || [];
    result.improvements = (rewrite.improvements as string[]) || [];
  }

  return result;
}
