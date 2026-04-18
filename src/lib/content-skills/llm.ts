import Anthropic from "@anthropic-ai/sdk";
import { callOpenRouter, openRouterEnabled, type RouterTier } from "../openrouter";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type LLMTier = "fast" | "balanced" | "complex" | "reasoning";

// Anthropic-direct fallback models (when OPENROUTER_API_KEY not set)
const ANTHROPIC_MODEL_MAP: Record<LLMTier, string> = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-5",
  complex: "claude-sonnet-4-5",
  reasoning: "claude-sonnet-4-5",
};

function parseJson(content: string): Record<string, unknown> {
  try {
    const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/);
    const obj = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    return Array.isArray(obj) ? { items: obj } : obj;
  } catch {
    return { raw_text: content };
  }
}

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 3000,
  tier: LLMTier = "balanced"
): Promise<Record<string, unknown>> {
  // Route via OpenRouter when enabled (multi-model fallback + cost routing)
  if (openRouterEnabled()) {
    try {
      const res = await callOpenRouter(systemPrompt, userPrompt, {
        tier: tier as RouterTier,
        maxTokens,
      });
      const parsed = parseJson(res.text);
      parsed._llm_meta = {
        model: res.model_used,
        tier,
        duration_ms: res.duration_ms,
        input_tokens: res.input_tokens,
        output_tokens: res.output_tokens,
        cost_usd: res.cost_usd,
        provider: "openrouter",
      };
      return parsed;
    } catch (err) {
      // Fall through to Anthropic direct on any router error
      console.warn("OpenRouter failed, falling back to Anthropic:", err instanceof Error ? err.message : err);
    }
  }

  // Anthropic direct path
  const started = Date.now();
  const model = ANTHROPIC_MODEL_MAP[tier];

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0]?.type === "text" ? message.content[0].text : "{}";
  const parsed = parseJson(content);

  parsed._llm_meta = {
    model,
    tier,
    duration_ms: Date.now() - started,
    input_tokens: message.usage?.input_tokens,
    output_tokens: message.usage?.output_tokens,
    provider: "anthropic",
  };

  return parsed;
}
