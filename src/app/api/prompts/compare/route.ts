import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { callLLM, type LLMTier } from "@/lib/content-skills/llm";
import { renderTemplate } from "@/lib/prompts";

export const maxDuration = 60;

/**
 * POST /api/prompts/compare
 * Body: { slug, versions: [v1, v2], vars: {...} }
 * 对同一输入，并行跑两个版本，返回对比结果
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { slug, versions, vars } = body as {
      slug: string;
      versions: number[];
      vars: Record<string, unknown>;
    };

    if (!slug || !Array.isArray(versions) || versions.length !== 2) {
      return NextResponse.json({ error: "需要 slug + 2 个 versions" }, { status: 400 });
    }

    const { data: promptsData } = await supabase
      .from("prompts")
      .select("*")
      .eq("slug", slug)
      .in("version", versions);

    if (!promptsData || promptsData.length !== 2) {
      return NextResponse.json({ error: "找不到指定版本" }, { status: 404 });
    }

    const runOne = async (prompt: {
      version: number;
      template: string;
      system_prompt: string | null;
      max_tokens: number;
      tier: string;
    }) => {
      const rendered = renderTemplate(prompt.template, vars);
      const system = prompt.system_prompt ? renderTemplate(prompt.system_prompt, vars) : "";
      const started = Date.now();
      try {
        const output = await callLLM(system, rendered, prompt.max_tokens, prompt.tier as LLMTier);
        return {
          version: prompt.version,
          output,
          latency_ms: Date.now() - started,
          error: null,
        };
      } catch (err) {
        return {
          version: prompt.version,
          output: null,
          latency_ms: Date.now() - started,
          error: err instanceof Error ? err.message : "failed",
        };
      }
    };

    // 并行跑两个版本
    const results = await Promise.all(promptsData.map(runOne));

    return NextResponse.json({
      slug,
      results: results.sort((a, b) => versions.indexOf(a.version) - versions.indexOf(b.version)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "compare failed" },
      { status: 500 }
    );
  }
}
