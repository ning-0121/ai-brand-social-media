import { executeSkill } from "../content-skills/executor";

export interface AiReplyContext {
  buyerMessage: string;
  buyerPhone: string;
  buyerDisplayName: string;
  conversationId: string;
  isFirstMessage: boolean;
}

export interface AiReplyResult {
  reply: string;
  confidence: number;
  language?: string;
  warnings?: string[];
}

export async function generateAiReply(ctx: AiReplyContext): Promise<AiReplyResult | null> {
  if (!ctx.buyerMessage || ctx.buyerMessage.trim().length === 0) return null;

  try {
    const { result } = await executeSkill(
      "oem_inquiry_reply",
      {
        buyer_message: ctx.buyerMessage,
        buyer_country: "",
        buyer_company: ctx.buyerDisplayName,
        tone: "professional",
      },
      {
        sourceModule: "whatsapp_auto",
      }
    );

    const out = result.output as Record<string, unknown>;
    const reply = (out.reply_text as string) || "";
    const confidence = (out.ai_confidence as number) || 0.7;
    const warnings = (out.warnings as string[]) || [];

    if (!reply) return null;

    return {
      reply,
      confidence,
      language: out.language as string,
      warnings,
    };
  } catch (err) {
    console.error("AI reply skill failed:", err);
    return null;
  }
}

/**
 * Decide if AI reply is safe enough to auto-send.
 * Multiple guardrails to prevent costly mistakes.
 */
export function shouldAutoSend(
  aiResult: AiReplyResult,
  buyerMessage: string,
  conversationMessageCount: number
): boolean {
  // 1. Confidence threshold
  if (aiResult.confidence < 0.85) return false;

  // 2. Has warnings from AI itself
  if (aiResult.warnings && aiResult.warnings.length > 0) return false;

  // 3. First message in conversation - always human review
  if (conversationMessageCount <= 1) return false;

  // 4. AI reply contains commitment language
  if (containsCommitment(aiResult.reply)) return false;

  // 5. Buyer message has high-stakes signals
  if (containsHighStakes(buyerMessage)) return false;

  // 6. Negative sentiment from buyer
  if (containsNegativeSentiment(buyerMessage)) return false;

  return true;
}

function containsCommitment(text: string): boolean {
  const patterns = [
    /\$[\d,.]+/,             // dollar amounts
    /€[\d,.]+/,
    /£[\d,.]+/,
    /\b(guarantee|guaranteed|promise|confirm|confirmed)\b/i,
    /\b(MOQ.*\d{3,}|lead time.*\d+\s*days?)\b/i,
    /\b(deposit|invoice|payment terms|contract)\b/i,
    /\b(承诺|保证|确认|定金|合同|发票)\b/,
  ];
  return patterns.some((p) => p.test(text));
}

function containsHighStakes(text: string): boolean {
  const patterns = [
    /\b(complaint|refund|return|defect|quality issue|claim)\b/i,
    /\b(投诉|退款|退货|质量问题|索赔)\b/,
    /\b(million|m\b|millions)\b/i,                  // very large orders
    /\b(\d{1,3},?\d{3},\d{3})\b/,                   // 1,000,000+ numerics
    /\b(lawyer|legal|sue|court|attorney)\b/i,
    /\b(律师|法律|起诉|法院)\b/,
  ];
  return patterns.some((p) => p.test(text));
}

function containsNegativeSentiment(text: string): boolean {
  const patterns = [
    /\b(angry|frustrat|disappointed|unhappy|terrible|awful|worst|hate)\b/i,
    /\b(生气|失望|糟糕|差劲|讨厌)\b/,
    /[!]{2,}/,                  // multiple exclamation marks
    /\b(WTF|wtf|stupid|fuck)\b/i,
  ];
  return patterns.some((p) => p.test(text));
}
