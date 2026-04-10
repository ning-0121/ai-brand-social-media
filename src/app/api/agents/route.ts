import { NextResponse } from "next/server";
import { getAgentRoles, getRecentAgentActivity } from "@/lib/supabase-workflows";
import { executeAgent } from "@/lib/agent-executor";
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "activity") {
      const activity = await getRecentAgentActivity(15);
      return NextResponse.json({ activity });
    }

    const agents = await getAgentRoles();
    return NextResponse.json({ agents });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "获取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { action, agent_name, task_type, input_data } = await request.json();

    if (action === "execute_standalone") {
      if (!agent_name || !task_type) {
        return NextResponse.json({ error: "缺少 agent_name 或 task_type" }, { status: 400 });
      }
      const result = await executeAgent(agent_name, task_type, input_data || {}, {});
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "执行失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
