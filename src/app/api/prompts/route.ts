import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/api-auth";
import { setActiveVersion, getRollingScore, runPrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  // List all prompts grouped by slug, or details for one slug
  if (!slug) {
    const { data: prompts } = await supabase
      .from("prompts").select("*")
      .order("slug").order("version", { ascending: false });

    // Group by slug
    const grouped: Record<string, typeof prompts> = {};
    for (const p of prompts || []) {
      if (!grouped[p.slug]) grouped[p.slug] = [];
      grouped[p.slug]!.push(p);
    }

    // Attach rolling scores for each slug
    const slugs = Object.keys(grouped);
    const scores: Record<string, { avg: number | null; samples: number }> = {};
    await Promise.all(slugs.map(async (s) => {
      scores[s] = await getRollingScore(s, undefined, 20);
    }));

    return NextResponse.json({ grouped, scores });
  }

  // Single-slug detail
  const [{ data: versions }, { data: recentRuns }] = await Promise.all([
    supabase.from("prompts").select("*").eq("slug", slug).order("version", { ascending: false }),
    supabase.from("prompt_runs").select("*").eq("prompt_slug", slug).order("created_at", { ascending: false }).limit(20),
  ]);

  const scores: Record<number, { avg: number | null; samples: number }> = {};
  for (const v of versions || []) {
    scores[v.version] = await getRollingScore(slug, v.version, 20);
  }

  return NextResponse.json({ versions, recent_runs: recentRuns, scores });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { action } = body;

  if (action === "set_active") {
    await setActiveVersion(body.slug, body.version);
    return NextResponse.json({ success: true });
  }

  if (action === "create_version") {
    // Create new version (auto-increment version number)
    const { data: existing } = await supabase
      .from("prompts").select("version").eq("slug", body.slug)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const newVersion = (existing?.version || 0) + 1;

    const { data } = await supabase.from("prompts").insert({
      slug: body.slug,
      version: newVersion,
      title: body.title,
      description: body.description,
      template: body.template,
      system_prompt: body.system_prompt,
      model: body.model || "anthropic/claude-sonnet-4.5",
      tier: body.tier || "balanced",
      max_tokens: body.max_tokens || 3000,
      temperature: body.temperature ?? 0.7,
      tags: body.tags || [],
      is_active: false,
    }).select().single();
    return NextResponse.json({ success: true, prompt: data });
  }

  if (action === "test_run") {
    try {
      const output = await runPrompt(body.slug, body.vars || {}, { source: "playground_test" });
      return NextResponse.json({ success: true, output });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "test failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
