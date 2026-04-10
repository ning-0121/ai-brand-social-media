import { NextResponse } from "next/server";
import { runHourlyTasks } from "@/lib/auto-ops-engine";

export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify cron secret (Vercel injects CRON_SECRET automatically)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runHourlyTasks();
    const success = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      status: "ok",
      run_type: "hourly",
      tasks: results.length,
      success,
      failed,
      results,
    });
  } catch (err) {
    console.error("Hourly cron error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron failed" },
      { status: 500 }
    );
  }
}
