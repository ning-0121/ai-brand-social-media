import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { supabase } from "@/lib/supabase";
import {
  getActiveRun,
  getRuns,
  getTasksForRun,
  getIssues,
  getFeedback,
  createPilotRun,
} from "@/lib/pilot-data";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    switch (type) {
      case "active_run": {
        const run = await getActiveRun();
        const tasks = run ? await getTasksForRun(run.id) : [];
        return NextResponse.json({ run, tasks });
      }
      case "runs":
        return NextResponse.json({ runs: await getRuns() });
      case "issues":
        return NextResponse.json({ issues: await getIssues(url.searchParams.get("run_id") || undefined) });
      case "feedback":
        return NextResponse.json({ feedback: await getFeedback(url.searchParams.get("run_id") || undefined) });
      default: {
        const run = await getActiveRun();
        const tasks = run ? await getTasksForRun(run.id) : [];
        const issues = await getIssues(run?.id);
        const feedback = await getFeedback(run?.id);
        return NextResponse.json({ run, tasks, issues, feedback });
      }
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "start_run": {
        const { name = "7 天试跑" } = body;
        const run = await createPilotRun(name, auth.userId);
        return NextResponse.json({ success: true, run });
      }

      case "complete_run": {
        const { run_id, summary } = body;
        if (!run_id) return NextResponse.json({ error: "缺少 run_id" }, { status: 400 });
        await supabase.from("pilot_runs").update({ status: "completed", summary }).eq("id", run_id);
        return NextResponse.json({ success: true });
      }

      case "update_task": {
        const { task_id, status, actual_result, blocker, time_spent_minutes } = body;
        if (!task_id) return NextResponse.json({ error: "缺少 task_id" }, { status: 400 });
        const updates: Record<string, unknown> = {};
        if (status) updates.status = status;
        if (actual_result !== undefined) updates.actual_result = actual_result;
        if (blocker !== undefined) updates.blocker = blocker;
        if (time_spent_minutes !== undefined) updates.time_spent_minutes = time_spent_minutes;
        await supabase.from("pilot_tasks").update(updates).eq("id", task_id);
        return NextResponse.json({ success: true });
      }

      case "create_issue": {
        const { run_id, severity, module_name, title, description, reproduction_steps, affects_revenue, affects_execution, suggested_fix } = body;
        if (!title || !severity || !module_name) {
          return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
        }
        const { data, error } = await supabase.from("pilot_issues").insert({
          run_id, severity, module_name, title, description,
          reproduction_steps, affects_revenue, affects_execution, suggested_fix,
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, issue: data });
      }

      case "update_issue": {
        const { issue_id, ...updates } = body;
        if (!issue_id) return NextResponse.json({ error: "缺少 issue_id" }, { status: 400 });
        delete updates.action;
        await supabase.from("pilot_issues").update(updates).eq("id", issue_id);
        return NextResponse.json({ success: true });
      }

      case "submit_feedback": {
        const { run_id, module_name, score, feedback, most_useful, least_useful, time_saved_minutes, would_continue } = body;
        if (!module_name || !score) {
          return NextResponse.json({ error: "缺少模块名或评分" }, { status: 400 });
        }
        const { data, error } = await supabase.from("pilot_feedback").insert({
          run_id, user_id: auth.userId, module_name, score,
          feedback, most_useful, least_useful, time_saved_minutes, would_continue,
        }).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, feedback: data });
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "操作失败" }, { status: 500 });
  }
}
