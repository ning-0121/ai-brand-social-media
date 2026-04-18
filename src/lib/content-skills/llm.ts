import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type LLMTier = "fast" | "balanced" | "complex";

const MODEL_MAP: Record<LLMTier, string> = {
  fast: "claude-haiku-4-5-20251001",     // ~3-5x faster, cheap
  balanced: "claude-sonnet-4-5",          // default, good quality
  complex: "claude-sonnet-4-5",           // reserved for hardest tasks
};

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 3000,
  tier: LLMTier = "balanced"
): Promise<Record<string, unknown>> {
  const started = Date.now();
  const model = MODEL_MAP[tier];

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0]?.type === "text" ? message.content[0].text : "{}";

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/);
    const obj = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    parsed = Array.isArray(obj) ? { items: obj } : obj;
  } catch {
    parsed = { raw_text: content };
  }

  // Attach perf telemetry so inspector can track speed per call
  parsed._llm_meta = {
    model,
    tier,
    duration_ms: Date.now() - started,
    input_tokens: message.usage?.input_tokens,
    output_tokens: message.usage?.output_tokens,
  };

  return parsed;
}
