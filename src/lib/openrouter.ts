/**
 * OpenRouter 路由层
 * - 一个 API 调用多家模型（Anthropic / OpenAI / Google / DeepSeek）
 * - 自动 fallback：主模型过载/限流时，按优先级尝试备用模型
 * - 成本/延迟统一埋点
 *
 * 启用方式：设置 OPENROUTER_API_KEY 环境变量。未设置时 callLLM 继续走 Anthropic direct。
 */

export type RouterTier = "fast" | "balanced" | "complex" | "reasoning";

// 按质价比排序；首选 + 2 个备用
const TIER_MODELS: Record<RouterTier, string[]> = {
  // 短 JSON（hashtag、日历）— 最便宜够用
  fast: [
    "google/gemini-2.5-flash",
    "openai/gpt-4.1-mini",
    "deepseek/deepseek-v3.1",
  ],
  // 默认（SEO、社媒文案、详情页片段）
  balanced: [
    "anthropic/claude-sonnet-4.5",
    "google/gemini-2.5-pro",
    "openai/gpt-4.1",
  ],
  // 长 HTML、复杂推理
  complex: [
    "anthropic/claude-sonnet-4.5",
    "openai/gpt-4.1",
    "google/gemini-2.5-pro",
  ],
  // QA 评审（需要严谨判断）
  reasoning: [
    "openai/o4-mini",
    "deepseek/deepseek-r1",
    "anthropic/claude-sonnet-4.5",
  ],
};

export interface OpenRouterCallResult {
  text: string;
  model_used: string;
  duration_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  cost_usd?: number;
}

export function openRouterEnabled(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  options: {
    tier?: RouterTier;
    models?: string[];
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<OpenRouterCallResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY 未设置");

  const tier = options.tier || "balanced";
  const models = options.models?.length ? options.models : TIER_MODELS[tier];

  const started = Date.now();

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://brandmind-ai-eight.vercel.app",
      "X-Title": "BrandMind AI",
    },
    body: JSON.stringify({
      model: models[0],
      models,
      route: "fallback",
      max_tokens: options.maxTokens || 3000,
      temperature: options.temperature ?? 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };

  return {
    text: data.choices?.[0]?.message?.content || "",
    model_used: data.model,
    duration_ms: Date.now() - started,
    input_tokens: data.usage?.prompt_tokens,
    output_tokens: data.usage?.completion_tokens,
    cost_usd: data.usage?.cost,
  };
}
