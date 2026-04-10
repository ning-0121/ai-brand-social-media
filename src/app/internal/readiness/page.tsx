import { runAllChecks, type ReadinessCheck } from "@/lib/readiness-checks";

export const dynamic = "force-dynamic";

const STATUS_ICON: Record<string, string> = {
  pass: "●",
  warn: "◐",
  fail: "○",
};

const STATUS_COLOR: Record<string, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  security: "安全检查",
  stability: "稳定性",
  business: "业务正确性",
  cost: "成本控制",
};

export default async function ReadinessPage() {
  const checks = await runAllChecks();

  const categories = ["security", "stability", "business", "cost"] as const;
  const grouped = categories.map((cat) => ({
    key: cat,
    label: CATEGORY_LABELS[cat],
    checks: checks.filter((c) => c.category === cat),
  }));

  const totalPass = checks.filter((c) => c.status === "pass").length;
  const totalWarn = checks.filter((c) => c.status === "warn").length;
  const totalFail = checks.filter((c) => c.status === "fail").length;

  const overallStatus =
    totalFail > 0 ? "fail" : totalWarn > 0 ? "warn" : "pass";

  return (
    <div className="min-h-screen bg-background p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">商用就绪检查</h1>
        <p className="text-muted-foreground text-sm">
          上次检查: {new Date().toLocaleString("zh-CN")}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-6 mb-8 p-4 rounded-lg border border-border bg-card">
        <div className={`text-3xl font-bold ${STATUS_COLOR[overallStatus]}`}>
          {overallStatus === "pass"
            ? "就绪"
            : overallStatus === "warn"
              ? "有风险"
              : "未就绪"}
        </div>
        <div className="flex gap-4 items-center text-sm">
          <span className={STATUS_COLOR.pass}>
            {STATUS_ICON.pass} {totalPass} 通过
          </span>
          <span className={STATUS_COLOR.warn}>
            {STATUS_ICON.warn} {totalWarn} 警告
          </span>
          <span className={STATUS_COLOR.fail}>
            {STATUS_ICON.fail} {totalFail} 失败
          </span>
        </div>
      </div>

      {/* Category sections */}
      {grouped.map((group) => (
        <div key={group.key} className="mb-6">
          <h2 className="text-lg font-semibold mb-3 pb-1 border-b border-border">
            {group.label}
          </h2>
          <div className="space-y-2">
            {group.checks.map((check: ReadinessCheck, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-md bg-card border border-border"
              >
                <span
                  className={`mt-0.5 ${STATUS_COLOR[check.status]} text-lg leading-none`}
                >
                  {STATUS_ICON[check.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{check.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {check.message}
                  </p>
                  {check.detail && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {check.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-8 p-4 rounded-lg bg-muted text-xs text-muted-foreground">
        <p>此页面仅对已登录用户可见。刷新页面重新执行所有检查。</p>
        <p className="mt-1">
          数据来源: Supabase audit_logs, integrations, approval_tasks, auto_ops_logs, products
        </p>
      </div>
    </div>
  );
}
