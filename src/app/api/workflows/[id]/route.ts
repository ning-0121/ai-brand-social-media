import { NextResponse } from "next/server";
import {
  getWorkflowInstanceById,
  getWorkflowTasks,
} from "@/lib/supabase-workflows";
import { processTask } from "@/lib/workflow-engine";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workflow = await getWorkflowInstanceById(params.id);
    const tasks = await getWorkflowTasks(params.id);

    const completedCount = tasks.filter((t) => t.status === "completed").length;
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    return NextResponse.json({
      workflow,
      tasks,
      progress,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
) {
  try {
    const { action, task_id } = await request.json();

    if (action === "process_next" && task_id) {
      await processTask(task_id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
