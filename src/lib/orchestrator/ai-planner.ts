/**
 * AI Planner — maps a natural-language objective to the right playbook
 *
 * Usage: user says "我想把这款褪色的连衣裙清掉，库存还有 50 件"
 *   → planner picks `clearance_campaign` + fills in inputs
 */

import { callLLM } from "../content-skills/llm";
import { getPlaybookMetadata } from "./registry";

export interface PlanResult {
  matched_playbook_id: string | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  suggested_inputs: Record<string, unknown>;
  alternative_playbooks?: string[];
  clarifying_questions?: string[];
}

export async function planFromObjective(objective: string, context?: {
  available_products?: Array<{ id: string; name: string; price?: number; category?: string }>;
}): Promise<PlanResult> {
  const playbooks = getPlaybookMetadata();

  const result = await callLLM(
    `你是 DTC 运营指挥官。用户用自然语言描述想达成的业务目标，你的任务是：
1. 从可用的 Playbook 里选最匹配的一个
2. 如果信息不够，列出需要用户澄清的问题
3. 根据上下文建议初始输入值

可用的 Playbook:
${playbooks.map(p => `
- ID: ${p.id}
  名称: ${p.name}
  目标: ${p.objective}
  何时使用: ${p.when_to_use}
  必填输入: ${JSON.stringify(p.required_inputs.map(i => ({ key: i.key, label: i.label, type: i.type })))}`).join("\n")}

规则:
- 如果用户描述模糊（比如"帮我推广"），选最通用的但返回 clarifying_questions
- 如果用户有明确 SKU/产品，尽量把 product_id 预填
- 如果有两个 playbook 都可能匹配，主选一个 + 列 alternative_playbooks
- confidence: high = 信息完整且明确；medium = 基本能判断但需确认 1-2 个细节；low = 信息太少

返回 JSON:
{
  "matched_playbook_id": "ID 或 null",
  "confidence": "high | medium | low",
  "reasoning": "为什么选这个 playbook，一句话说清",
  "suggested_inputs": { "字段名": "推荐值" },
  "alternative_playbooks": ["可选的其他 playbook ID"],
  "clarifying_questions": ["需要用户回答的问题（最多3个）"]
}`,
    `用户目标: ${objective}

${context?.available_products ? `可用商品（最近常用）:
${context.available_products.slice(0, 10).map(p => `- [${p.id}] ${p.name} ($${p.price || "N/A"})`).join("\n")}` : ""}`,
    2000
  );

  return result as unknown as PlanResult;
}
