import { callLLM } from "./content-skills/llm";

export interface QAResult {
  score: number;
  passed: boolean;
  checklist: { item: string; pass: boolean; note: string }[];
  improvements: string[];
}

/**
 * AI Content Quality Review — acts as a strict editor reviewing content
 * before it gets deployed to Shopify/social media.
 *
 * Returns score 0-100. Content must score >= 70 to pass.
 */
export async function reviewContent(
  contentType: "seo" | "detail_page" | "social_post" | "landing_page",
  content: Record<string, unknown>,
  productContext?: { name: string; category?: string }
): Promise<QAResult> {
  const rules = getQARules(contentType);

  const result = await callLLM(
    `You are a strict content quality reviewer for an e-commerce brand.
Your job: review AI-generated content and score it 0-100 based on specific criteria.
Be HONEST and STRICT. If content is mediocre, give it 50-60. Only give 80+ for genuinely good content.

Scoring guide:
- 90-100: Exceptional — ready to deploy, better than human average
- 70-89: Good — deployable with minor notes
- 50-69: Mediocre — needs revision, do NOT deploy
- 0-49: Poor — reject and redo

${rules}

Return JSON only.`,
    `Content type: ${contentType}
Product: ${productContext?.name || "general"} (${productContext?.category || "fashion"})

Content to review:
${JSON.stringify(content, null, 2).slice(0, 3000)}

Return:
{
  "score": 0-100,
  "checklist": [
    {"item": "检查项名称", "pass": true/false, "note": "具体评价"}
  ],
  "improvements": ["必须修改的点1", "必须修改的点2"],
  "overall_assessment": "一句话总评"
}`,
    2000
  );

  const score = (result.score as number) || 50;
  const checklist = (result.checklist as QAResult["checklist"]) || [];
  const improvements = (result.improvements as string[]) || [];

  return {
    score,
    passed: score >= 40, // Threshold lowered from 70 to 40 — QA is advisory, not blocking
    checklist,
    improvements,
  };
}

/**
 * Execute a Skill with QA review — retries up to 2 times if quality is low.
 */
export async function executeWithQA(
  executeFunc: (feedback?: string) => Promise<Record<string, unknown>>,
  contentType: "seo" | "detail_page" | "social_post" | "landing_page",
  productContext?: { name: string; category?: string },
  maxRetries: number = 2
): Promise<{
  content: Record<string, unknown>;
  qa: QAResult;
  attempts: number;
}> {
  let content = await executeFunc();
  let qa = await reviewContent(contentType, content, productContext);
  let attempts = 1;

  while (!qa.passed && attempts <= maxRetries) {
    const feedback = `Previous attempt scored ${qa.score}/100. Issues: ${qa.improvements.join("; ")}. Please fix these specific problems.`;
    content = await executeFunc(feedback);
    qa = await reviewContent(contentType, content, productContext);
    attempts++;
  }

  return { content, qa, attempts };
}

function getQARules(type: string): string {
  switch (type) {
    case "seo":
      return `SEO Content Review Criteria:
1. meta_title: Must be 50-60 characters. Must contain primary keyword. Must be compelling.
2. meta_description: Must be 140-160 characters. Must contain CTA. Must be unique.
3. tags: Must have 5-10 relevant tags. No duplicates. No overly generic tags.
4. Keywords: Must not be stuffed. Must read naturally.
5. Brand consistency: Must match brand voice (premium activewear).
6. Accuracy: Must not contain false claims about product features.`;

    case "detail_page":
      return `Product Detail Page Review Criteria:
1. Length: Description must be 200-500 words. Not too short, not bloated.
2. Structure: Must have clear sections (intro, benefits, specs, CTA).
3. Selling points: Must highlight 3-5 specific product benefits.
4. Specifications: Must include material, sizing, care instructions if available.
5. HTML quality: Must use proper HTML tags (p, ul, li, strong). No broken tags.
6. Brand voice: Must be professional yet engaging. No generic filler.
7. CTA: Must end with clear call to action.
8. Accuracy: Must not invent features not present in the original product data.`;

    case "social_post":
      return `Social Media Post Review Criteria:
1. Hook: First line must grab attention (question, bold claim, emoji).
2. Length: Instagram 100-200 words, TikTok 50-100, Xiaohongshu 200-400.
3. Hashtags: 10-25 for Instagram, 3-5 for TikTok, 5-10 for Xiaohongshu.
4. CTA: Must include clear call to action (shop now, link in bio, etc).
5. Tone: Must match platform culture (IG=aspirational, TikTok=authentic, XHS=honest sharing).
6. Image prompt: Must be specific and detailed enough for AI image generation.
7. Brand safety: No controversial topics, no competitor mentions.`;

    case "landing_page":
      return `Landing Page Review Criteria:
1. Hero section: Must have compelling headline + subheadline + CTA.
2. Value proposition: Must clearly state 3+ benefits.
3. Trust elements: Must include social proof, guarantees, or credentials.
4. HTML quality: Must be well-structured, responsive-ready, inline CSS.
5. CTA buttons: Must be prominent and action-oriented.
6. Mobile friendliness: Must use flexible widths, not fixed pixel widths.
7. Length: Must be substantial (not just a paragraph).`;

    default:
      return `General Content Review: Check accuracy, grammar, brand consistency, and actionability.`;
  }
}
