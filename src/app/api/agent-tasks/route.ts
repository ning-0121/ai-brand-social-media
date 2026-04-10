import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runTask, runNextPendingTask, analyzeAll } from "@/agents/task-runner";
import { requireAuth } from "@/lib/api-auth";
import { rateLimitAgent } from "@/lib/rate-limiter";

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agent_id");
    const status = url.searchParams.get("status");
    const mod = url.searchParams.get("module");
    const limit = parseInt(url.searchParams.get("limit") || "20");

    let query = supabase.from("agent_tasks_v2").select("*").order("created_at", { ascending: false }).limit(limit);

    if (agentId) query = query.eq("agent_id", agentId);
    if (status) query = query.eq("status", status);
    if (mod) {
      // Whitelist module names to prevent filter injection
      const safeModule = mod.replace(/[^a-zA-Z0-9_-]/g, "");
      query = query.or(`source_module.eq.${safeModule},target_module.eq.${safeModule}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // KPIs
    const all = data || [];
    return NextResponse.json({
      tasks: all,
      kpis: {
        total: all.length,
        pending: all.filter((t) => t.status === "pending").length,
        running: all.filter((t) => t.status === "running").length,
        completed: all.filter((t) => t.status === "completed").length,
        failed: all.filter((t) => t.status === "failed" || t.status === "qa_rejected").length,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rl = await rateLimitAgent(auth.userId);
  if (!rl.allowed) return rl.error;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "analyze_all": {
        const result = await analyzeAll();
        return NextResponse.json({ success: true, ...result });
      }

      case "run_task": {
        if (!body.task_id) return NextResponse.json({ error: "缺少 task_id" }, { status: 400 });
        const task = await runTask(body.task_id);
        return NextResponse.json({ success: true, task });
      }

      case "run_next": {
        const result = await runNextPendingTask();
        return NextResponse.json({ success: true, ...result });
      }

      case "create": {
        const { data: task, error } = await supabase.from("agent_tasks_v2").insert({
          agent_id: body.agent_id,
          task_type: body.task_type,
          title: body.title,
          description: body.description,
          priority: body.priority || "medium",
          input: body.input || {},
          source_module: body.source_module,
          target_module: body.target_module,
          requires_approval: body.requires_approval ?? false,
          status: "pending",
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, task });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (err) {
    console.error("Agent tasks error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "操作失败" }, { status: 500 });
  }
}
