import { NextResponse } from "next/server";
import { runDiagnostic, getLatestReport } from "@/lib/diagnostic-engine";
import { executeFinding, dismissFinding } from "@/lib/diagnostic-executor";

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
        const ref = await executeFinding(body.finding_id);
        return NextResponse.json({ success: true, execution_ref: ref });
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
    const msg = error instanceof Error ? error.message : "诊断操作失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
