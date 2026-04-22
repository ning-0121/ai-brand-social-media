import { NextResponse } from "next/server";
import { getPlaybook, getPlaybookMetadata } from "@/lib/orchestrator/registry";
import { runPlaybook } from "@/lib/orchestrator/workflow-engine";
import { planFromObjective } from "@/lib/orchestrator/ai-planner";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "list";

  if (action === "list") {
    return NextResponse.json({ playbooks: getPlaybookMetadata() });
  }

  if (action === "get") {
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
    const pb = getPlaybook(id);
    if (!pb) return NextResponse.json({ error: "playbook 不存在" }, { status: 404 });
    return NextResponse.json({ playbook: pb });
  }

  if (action === "runs") {
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const { data } = await supabase
      .from("workflow_runs")
      .select("run_id, playbook_id, playbook_name, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return NextResponse.json({ runs: data || [] });
  }

  if (action === "run_detail") {
    const runId = url.searchParams.get("run_id");
    if (!runId) return NextResponse.json({ error: "缺少 run_id" }, { status: 400 });
    const { data } = await supabase
      .from("workflow_runs")
      .select("*")
      .eq("run_id", runId)
      .single();
    return NextResponse.json({ run: data });
  }

  return NextResponse.json({ error: "未知 action" }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "plan") {
      // Natural language → playbook match
      const { objective, context } = body;
      if (!objective) return NextResponse.json({ error: "缺少 objective" }, { status: 400 });
      const plan = await planFromObjective(objective, context);
      return NextResponse.json(plan);
    }

    if (action === "run") {
      const { playbook_id, inputs, integration_id, dry_run } = body;
      if (!playbook_id) return NextResponse.json({ error: "缺少 playbook_id" }, { status: 400 });
      const pb = getPlaybook(playbook_id);
      if (!pb) return NextResponse.json({ error: "playbook 不存在" }, { status: 404 });

      const result = await runPlaybook(pb, inputs || {}, {
        integration_id,
        dry_run: !!dry_run,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "未知 action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "orchestrator 失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
