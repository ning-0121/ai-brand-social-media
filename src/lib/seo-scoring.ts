/**
 * SEO Scoring Engine
 * Pure function — works on both client and server, no AI calls.
 * Evaluates product SEO quality and returns a 0-100 score with breakdown.
 */

export interface SEOScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  issues: string[];
}

export interface SEOScoreResult {
  overall: number;
  breakdown: SEOScoreBreakdown[];
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface SEOScoreInput {
  name: string;
  body_html?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  tags?: string | null;
  image_url?: string | null;
  handle?: string | null;
}

// ─── helpers ───────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(text: string): number {
  const stripped = stripHtml(text);
  if (!stripped) return 0;
  // CJK characters count as individual words
  const cjk = stripped.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g)?.length || 0;
  const latin = stripped
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, "")
    .split(/\s+/)
    .filter(Boolean).length;
  return cjk + latin;
}

function hasTag(html: string, tag: string): boolean {
  return new RegExp(`<${tag}[\\s>]`, "i").test(html);
}

function countTags(html: string, tag: string): number {
  return (html.match(new RegExp(`<${tag}[\\s>]`, "gi")) || []).length;
}

const CTA_WORDS_EN = /\b(shop|buy|order|get|discover|try|learn|save|free|limited|exclusive|new|best|top|premium)\b/i;
const CTA_WORDS_CN = /(立即|马上|限时|免费|优惠|折扣|热卖|新品|精选|必备|推荐|抢购)/;

function hasCTA(text: string): boolean {
  return CTA_WORDS_EN.test(text) || CTA_WORDS_CN.test(text);
}

// ─── scoring functions ─────────────────────────────────────────

function scoreTitle(name: string): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;
  const len = name.length;

  // Length scoring (0-12)
  if (len >= 50 && len <= 60) {
    score += 12;
  } else if (len >= 30 && len <= 70) {
    score += 8;
    issues.push(`标题 ${len} 字符（最佳 50-60）`);
  } else if (len >= 15) {
    score += 4;
    issues.push(`标题 ${len} 字符，偏${len < 30 ? "短" : "长"}（最佳 50-60）`);
  } else {
    issues.push(`标题过短（${len} 字符，建议 50-60）`);
  }

  // Not all-caps (0-4)
  if (name === name.toUpperCase() && name.length > 10) {
    issues.push("标题全大写，不利于可读性");
  } else {
    score += 4;
  }

  // Contains meaningful content — not just brand name (0-4)
  const words = name.split(/[\s\-|,]+/).filter(Boolean);
  if (words.length >= 3) {
    score += 4;
  } else {
    score += 2;
    issues.push("标题词汇较少，建议包含关键词和卖点");
  }

  return { category: "商品标题", score, maxScore: 20, issues };
}

function scoreMetaTitle(
  metaTitle: string | null | undefined,
  name: string
): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;

  if (!metaTitle || !metaTitle.trim()) {
    issues.push("缺少 Meta Title");
    return { category: "SEO 标题", score: 0, maxScore: 15, issues };
  }

  const len = metaTitle.length;

  // Length (0-8)
  if (len >= 50 && len <= 60) {
    score += 8;
  } else if (len >= 30 && len <= 70) {
    score += 5;
    issues.push(`Meta Title ${len} 字符（最佳 50-60）`);
  } else {
    score += 2;
    issues.push(`Meta Title ${len} 字符，${len < 30 ? "过短" : "过长"}（最佳 50-60）`);
  }

  // Differentiated from product title (0-4)
  if (metaTitle.trim().toLowerCase() === name.trim().toLowerCase()) {
    issues.push("Meta Title 与商品标题完全相同，建议差异化");
    score += 1;
  } else {
    score += 4;
  }

  // Has structure (separators like | - : ) (0-3)
  if (/[|–\-:·]/.test(metaTitle)) {
    score += 3;
  } else {
    score += 1;
    issues.push("Meta Title 缺少分隔符结构（建议使用 | 或 - 分隔品牌和关键词）");
  }

  return { category: "SEO 标题", score, maxScore: 15, issues };
}

function scoreMetaDescription(
  metaDesc: string | null | undefined
): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;

  if (!metaDesc || !metaDesc.trim()) {
    issues.push("缺少 Meta Description");
    return { category: "SEO 描述", score: 0, maxScore: 15, issues };
  }

  const len = metaDesc.length;

  // Length (0-8)
  if (len >= 140 && len <= 160) {
    score += 8;
  } else if (len >= 100 && len <= 180) {
    score += 5;
    issues.push(`Meta Description ${len} 字符（最佳 140-160）`);
  } else {
    score += 2;
    issues.push(`Meta Description ${len} 字符，${len < 100 ? "过短" : "过长"}（最佳 140-160）`);
  }

  // Contains CTA (0-4)
  if (hasCTA(metaDesc)) {
    score += 4;
  } else {
    score += 1;
    issues.push("Meta Description 缺少行动号召（CTA）词汇");
  }

  // Not truncated — doesn't end mid-sentence (0-3)
  const lastChar = metaDesc.trim().slice(-1);
  if (/[.!?。！？)）]/.test(lastChar)) {
    score += 3;
  } else {
    score += 1;
    issues.push("Meta Description 可能被截断，建议以完整句子结尾");
  }

  return { category: "SEO 描述", score, maxScore: 15, issues };
}

function scoreBodyHtml(bodyHtml: string | null | undefined): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;

  if (!bodyHtml || !bodyHtml.trim()) {
    issues.push("缺少商品描述");
    return { category: "商品描述", score: 0, maxScore: 25, issues };
  }

  const wc = wordCount(bodyHtml);

  // Word count (0-10)
  if (wc >= 300) {
    score += 10;
  } else if (wc >= 150) {
    score += 6;
    issues.push(`描述约 ${wc} 字（建议 300+ 字以获得更好排名）`);
  } else if (wc >= 50) {
    score += 3;
    issues.push(`描述过短（约 ${wc} 字，建议 300+）`);
  } else {
    issues.push(`描述极短（约 ${wc} 字，建议 300+）`);
  }

  // Heading structure (0-5)
  if (hasTag(bodyHtml, "h2") || hasTag(bodyHtml, "h3")) {
    score += 5;
  } else if (hasTag(bodyHtml, "strong") || hasTag(bodyHtml, "b")) {
    score += 2;
    issues.push("描述缺少 H2/H3 标题结构（有加粗但建议用标题标签）");
  } else {
    issues.push("描述缺少标题结构（建议添加 H2/H3 小标题）");
  }

  // Paragraph structure (0-5)
  const pCount = countTags(bodyHtml, "p");
  if (pCount >= 3) {
    score += 5;
  } else if (pCount >= 1) {
    score += 3;
    issues.push("段落较少，建议分 3+ 段提升可读性");
  } else {
    issues.push("缺少段落标签，建议用 <p> 分段");
  }

  // Lists for scannability (0-5)
  if (hasTag(bodyHtml, "ul") || hasTag(bodyHtml, "ol")) {
    score += 5;
  } else {
    score += 1;
    issues.push("描述缺少列表，建议添加要点列表提升扫读体验");
  }

  return { category: "商品描述", score, maxScore: 25, issues };
}

function scoreTags(tags: string | null | undefined): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;

  if (!tags || !tags.trim()) {
    issues.push("缺少标签");
    return { category: "标签", score: 0, maxScore: 10, issues };
  }

  const tagList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const uniqueTags = new Set(tagList.map((t) => t.toLowerCase()));

  // Count (0-5)
  if (uniqueTags.size >= 5) {
    score += 5;
  } else if (uniqueTags.size >= 3) {
    score += 3;
    issues.push(`只有 ${uniqueTags.size} 个标签（建议 5+）`);
  } else {
    score += 1;
    issues.push(`标签过少（${uniqueTags.size} 个，建议 5+）`);
  }

  // Duplicates check
  if (tagList.length !== uniqueTags.size) {
    issues.push("存在重复标签");
  }

  // Quality — not single generic words (0-3)
  const genericTags = tagList.filter((t) => t.length <= 2);
  if (genericTags.length === 0) {
    score += 3;
  } else {
    score += 1;
    issues.push("部分标签过短/泛化，建议使用更具体的关键词标签");
  }

  // Multi-word tags present (0-2)
  const multiWord = tagList.filter((t) => t.includes(" ") || t.length >= 8);
  if (multiWord.length >= 2) {
    score += 2;
  } else {
    score += 1;
    issues.push("建议添加长尾关键词标签（多词组合）");
  }

  return { category: "标签", score, maxScore: 10, issues };
}

function scoreImage(imageUrl: string | null | undefined): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;

  if (imageUrl && imageUrl.trim()) {
    score += 10;
  } else {
    issues.push("缺少产品图片");
  }

  return { category: "图片", score, maxScore: 10, issues };
}

function scoreHandle(handle: string | null | undefined): SEOScoreBreakdown {
  const issues: string[] = [];
  let score = 0;

  if (!handle || !handle.trim()) {
    // No handle available (may not be synced)
    return { category: "URL Handle", score: 0, maxScore: 5, issues: ["Handle 未知"] };
  }

  // Contains hyphens (word-separated) (0-2)
  if (handle.includes("-")) {
    score += 2;
  } else if (handle.length > 20) {
    issues.push("Handle 缺少连字符分隔，建议用 - 分隔关键词");
  } else {
    score += 1;
  }

  // Not auto-generated numeric (0-2)
  if (/^\d+$/.test(handle)) {
    issues.push("Handle 是纯数字，无 SEO 价值");
  } else {
    score += 2;
  }

  // Reasonable length (0-1)
  if (handle.length <= 60 && handle.length >= 5) {
    score += 1;
  } else {
    issues.push(`Handle 长度 ${handle.length}（建议 5-60 字符）`);
  }

  return { category: "URL Handle", score, maxScore: 5, issues };
}

// ─── main scoring function ─────────────────────────────────────

function getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function calculateSEOScore(input: SEOScoreInput): SEOScoreResult {
  const breakdown = [
    scoreTitle(input.name),
    scoreMetaTitle(input.meta_title, input.name),
    scoreMetaDescription(input.meta_description),
    scoreBodyHtml(input.body_html),
    scoreTags(input.tags),
    scoreImage(input.image_url),
    scoreHandle(input.handle),
  ];

  const overall = breakdown.reduce((sum, b) => sum + b.score, 0);

  return {
    overall,
    breakdown,
    grade: getGrade(overall),
  };
}
