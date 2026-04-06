import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 3000
): Promise<Record<string, unknown>> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0]?.type === "text" ? message.content[0].text : "{}";

  // 解析 JSON
  try {
    const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    return Array.isArray(parsed) ? { items: parsed } : parsed;
  } catch {
    return { raw_text: content };
  }
}
