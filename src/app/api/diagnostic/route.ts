import { NextResponse } from "next/server";
import { runDiagnostic, getLatestReport } from "@/lib/diagnostic-engine";
import { executeFinding, dismissFinding } from "@/lib/diagnostic-executor";

// Allow up to 60s for AI generation (default 10s is too short)
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "latest";

    if (type === "latest") {
      const report = await getLatestReport();
      return NextResponse.json({ report });
    }

    return NextResponse.json({ error: "未知查询类型" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Diagnostic GET error:", error);
    const msg = error instanceof Error ? error.message : "获取诊断报告失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "run": {
        const report = await runDiagnostic(body.user_id, body.trigger_type || "manual");
        return NextResponse.json({ report });
      }

      case "execute_finding": {
        if (!body.finding_id) {
          return NextResponse.json({ error: "缺少 finding_id" }, { status: 400 });
        }
        const result = await executeFinding(body.finding_id);
        return NextResponse.json({
          success: true,
          execution_ref: result,
          generated_content: result.generated_content,
        });
      }

      case "dismiss_finding": {
        if (!body.finding_id) {
          return NextResponse.json({ error: "缺少 finding_id" }, { status: 400 });
        }
        await dismissFinding(body.finding_id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "未知操作" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Diagnostic POST error:", error);
    const msg = error instanceof Error
      ? `${error.message}${error.stack ? "\n" + error.stack.split("\n").slice(0, 3).join("\n") : ""}`
      : JSON.stringify(error);
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
