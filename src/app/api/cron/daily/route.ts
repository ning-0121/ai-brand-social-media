import { NextResponse } from "next/server";
import { runDailyTasks } from "@/lib/auto-ops-engine";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDailyTasks();
    const success = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      status: "ok",
      run_type: "daily",
      tasks: results.length,
      success,
      failed,
      results,
    });
  } catch (err) {
    console.error("Daily cron error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    );
  }
}
