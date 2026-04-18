/**
 * Prompt Playground — 版本化 prompt 模板 + 执行记录
 *
 * 理念：
 * - 所有 prompt 存在 DB 里，有版本号。不改代码就能调 prompt。
 * - 每次执行记录延迟、成本、质量分。
 * - is_active 标记当前生效版本。
 * - 督察根据 rolling score 自动"晋升"新版本（>5% 超过旧冠军时）。
 */

import { supabase } from "./supabase";
import { callLLM, type LLMTier } from "./content-skills/llm";

export interface PromptRow {
  id: string;
  slug: string;
  version: number;
  title: string | null;
  description: string | null;
  template: string;
  system_prompt: string | null;
  model: string;
  tier: string;
  max_tokens: number;
  temperature: number;
  tags: string[];
  is_active: boolean;
  is_champion: boolean;
}

/** 简单 Mustache-style 渲染：{{var}} 替换，不支持逻辑语法 */
export function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    const path = key.split(".");
    let cur: unknown = vars;
    for (const p of path) {
      if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
      else return "";
    }
    if (cur == null) return "";
    if (typeof cur === "object") return JSON.stringify(cur);
    return String(cur);
  });
}

/** 获取一个 slug 当前生效的 prompt（优先 is_active，否则最高 version） */
export async function getActivePrompt(slug: string): Promise<PromptRow | null> {
  const { data: active } = await supabase
    .from("prompts").select("*")
    .eq("slug", slug).eq("is_active", true)
    .limit(1).maybeSingle();
  if (active) return active as PromptRow;

  const { data: latest } = await supabase
    .from("prompts").select("*")
    .eq("slug", slug)
    .order("version", { ascending: false })
    .limit(1).maybeSingle();
  return (latest as PromptRow) || null;
}

export interface RunPromptOptions {
  source?: string;                // 调用来源（skill name / pipeline name）
  extraTags?: string[];
  /** 运行后立即用另一个 prompt 打分 */
  scoreWithSlug?: string;
  scoreContext?: Record<string, unknown>;
}

/**
 * Helper：尝试用 DB prompt 执行，如果 slug 不在 DB 里则返回 null
 * 用于 skill 渐进式迁移：DB 里有就用 DB，没有就回退硬编码
 */
export async function tryRunPrompt(
  slug: string,
  vars: Record<string, unknown>,
  options: RunPromptOptions = {}
): Promise<Record<string, unknown> | null> {
  const prompt = await getActivePrompt(slug);
  if (!prompt) return null;
  try {
    return await runPrompt(slug, vars, options);
  } catch (err) {
    console.warn(`DB prompt ${slug} failed, caller should fallback:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * 执行一个存储的 prompt，自动记录 prompt_runs
 */
export async function runPrompt(
  slug: string,
  vars: Record<string, unknown>,
  options: RunPromptOptions = {}
): Promise<Record<string, unknown>> {
  const prompt = await getActivePrompt(slug);
  if (!prompt) throw new Error(`Prompt not found: ${slug}`);

  const rendered = renderTemplate(prompt.template, vars);
  const systemPrompt = prompt.system_prompt
    ? renderTemplate(prompt.system_prompt, vars)
    : "";

  let output: Record<string, unknown> = {};
  let success = true;
  let errorMessage: string | null = null;

  try {
    output = await callLLM(
      systemPrompt,
      rendered,
      prompt.max_tokens,
      prompt.tier as LLMTier
    );
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const meta = (output._llm_meta as Record<string, unknown>) || {};

  // Optional auto-scoring
  let score: number | null = null;
  if (success && options.scoreWithSlug) {
    try {
      const judgeOut = await runPrompt(options.scoreWithSlug, {
        ...options.scoreContext,
        candidate: output,
        input: vars,
      }, { source: `judge:${slug}` });
      const s = judgeOut.score as number | undefined;
      if (typeof s === "number") score = Math.max(0, Math.min(100, s));
    } catch {
      // judge failures don't break main call
    }
  }

  await supabase.from("prompt_runs").insert({
    prompt_id: prompt.id,
    prompt_slug: slug,
    prompt_version: prompt.version,
    input: vars,
    output: success ? output : null,
    rendered_user_prompt: rendered.slice(0, 8000),
    model_used: meta.model as string,
    latency_ms: meta.duration_ms as number,
    input_tokens: meta.input_tokens as number,
    output_tokens: meta.output_tokens as number,
    cost_usd: meta.cost_usd as number,
    score,
    success,
    error_message: errorMessage,
    source: options.source || null,
    tags: options.extraTags || [],
  });

  if (!success) throw new Error(errorMessage || "prompt execution failed");
  return output;
}

/** 人工/督察把某版本标记为 active（同 slug 的其他版本自动取消 active） */
export async function setActiveVersion(slug: string, version: number): Promise<void> {
  await supabase.from("prompts").update({ is_active: false }).eq("slug", slug);
  await supabase.from("prompts").update({ is_active: true }).eq("slug", slug).eq("version", version);
}

/** 滚动平均分：最近 N 次 runs 的 avg score */
export async function getRollingScore(
  slug: string,
  version?: number,
  windowSize = 20
): Promise<{ avg: number | null; samples: number }> {
  let q = supabase.from("prompt_runs")
    .select("score").eq("prompt_slug", slug)
    .not("score", "is", null)
    .order("created_at", { ascending: false })
    .limit(windowSize);
  if (version != null) q = q.eq("prompt_version", version);

  const { data } = await q;
  const rows = (data || []) as Array<{ score: number }>;
  if (rows.length === 0) return { avg: null, samples: 0 };
  const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length;
  return { avg: Math.round(avg * 10) / 10, samples: rows.length };
}

/**
 * 督察晋升：如果新版本滚动分比当前 champion 高 5%+ 就晋升
 */
export async function autoPromoteChampion(slug: string): Promise<{
  promoted: boolean;
  from_version: number | null;
  to_version: number | null;
  score_gain: number;
}> {
  const { data: versions } = await supabase
    .from("prompts").select("id, version, is_active, is_champion")
    .eq("slug", slug).order("version", { ascending: false });

  if (!versions || versions.length < 2) {
    return { promoted: false, from_version: null, to_version: null, score_gain: 0 };
  }

  const champion = versions.find((v) => v.is_champion) || versions[versions.length - 1];
  const challenger = versions[0];
  if (champion.version === challenger.version) {
    return { promoted: false, from_version: null, to_version: null, score_gain: 0 };
  }

  const [champScore, challScore] = await Promise.all([
    getRollingScore(slug, champion.version),
    getRollingScore(slug, challenger.version),
  ]);

  if (
    champScore.avg != null &&
    challScore.avg != null &&
    challScore.samples >= 10 &&
    challScore.avg >= champScore.avg * 1.05
  ) {
    await supabase.from("prompts").update({ is_champion: false }).eq("slug", slug);
    await supabase.from("prompts").update({ is_champion: true, is_active: true }).eq("id", challenger.id);
    await supabase.from("prompts").update({ is_active: false })
      .eq("slug", slug).neq("id", challenger.id);
    return {
      promoted: true,
      from_version: champion.version,
      to_version: challenger.version,
      score_gain: Math.round((challScore.avg - champScore.avg) * 10) / 10,
    };
  }

  return { promoted: false, from_version: null, to_version: null, score_gain: 0 };
}
