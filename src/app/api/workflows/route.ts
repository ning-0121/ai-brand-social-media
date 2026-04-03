import { NextResponse } from "next/server";
import { launchWorkflow, pauseWorkflow, cancelWorkflow } from "@/lib/workflow-engine";
import {
  getWorkflowInstances,
  getWorkflowTemplates,
  getWorkflowKPIs,
} from "@/lib/supabase-workflows";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "templates") {
      const templates = await getWorkflowTemplates();
      return NextResponse.json({ templates });
    }

    if (type === "kpis") {
      const kpis = await getWorkflowKPIs();
      return NextResponse.json(kpis);
    }

    const status = searchParams.get("status") as "active" | "completed" | null;
    const workflows = await getWorkflowInstances(status || undefined);
    return NextResponse.json({ workflows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case "launch": {
        const { template_id, input_data, user_id } = params;
        if (!template_id) {
          return NextResponse.json({ error: "缺少 template_id" }, { status: 400 });
        }
        const instance = await launchWorkflow(template_id, input_data || {}, user_id);
        return NextResponse.json({ success: true, workflow: instance });
      }

      case "pause": {
        const { workflow_id } = params;
        if (!workflow_id) return NextResponse.json({ error: "缺少 workflow_id" }, { status: 400 });
        await pauseWorkflow(workflow_id);
        return NextResponse.json({ success: true });
      }

      case "cancel": {
        const { workflow_id } = params;
        if (!workflow_id) return NextResponse.json({ error: "缺少 workflow_id" }, { status: 400 });
        await cancelWorkflow(workflow_id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
