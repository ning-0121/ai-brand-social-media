import Anthropic from "@anthropic-ai/sdk";
import { callOpenRouter, openRouterEnabled, type RouterTier } from "../openrouter";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type LLMTier = "fast" | "balanced" | "complex" | "reasoning";

// Anthropic-direct fallback models (when OPENROUTER_API_KEY not set)
// Use consistent versioned IDs to avoid silent breakage if aliases are deprecated
const ANTHROPIC_MODEL_MAP: Record<LLMTier, string> = {
  fast: "claude-haiku-4-5-20251001",
  balanced: "claude-sonnet-4-5-20250929",
  complex: "claude-sonnet-4-5-20250929",
  reasoning: "claude-sonnet-4-5-20250929",
};

function parseJson(content: string): Record<string, unknown> {
  // 1. 剥离 markdown 代码围栏 ```json ... ``` 或 ``` ... ```
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const cleaned = fenceMatch ? fenceMatch[1] : content;

  // 2. 先尝试整块
  try {
    const obj = JSON.parse(cleaned.trim());
    return Array.isArray(obj) ? { items: obj } : obj;
  } catch { /* fallthrough */ }

  // 3. 尝试找最大的对象块 {...}（用平衡匹配）
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      return Array.isArray(obj) ? { items: obj } : obj;
    } catch { /* fallthrough */ }
  }

  // 4. 尝试数组
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const obj = JSON.parse(arrMatch[0]);
      return Array.isArray(obj) ? { items: obj } : obj;
    } catch { /* fallthrough */ }
  }

  return { raw_text: content };
}

/** 指数退避重试（限流/临时错误） */
async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // 只对限流/过载类错误重试；其他直接抛
      const retriable = /429|529|overload|rate.?limit|timeout|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!retriable || i === attempts) break;
      const delay = 1000 * Math.pow(2, i) + Math.random() * 500; // 1s → 2s → 4s
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
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
      const res = await withRetry(() => callOpenRouter(systemPrompt, userPrompt, {
        tier: tier as RouterTier,
        maxTokens,
      }));
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

  const message = await withRetry(() => anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  }));

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
