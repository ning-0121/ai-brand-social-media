import { supabase } from "./supabase";

export interface ReadinessCheck {
  category: "security" | "stability" | "business" | "cost";
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
  detail?: string;
}

export async function runAllChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  // Run all checks in parallel
  const [security, stability, business, cost] = await Promise.all([
    runSecurityChecks(),
    runStabilityChecks(),
    runBusinessChecks(),
    runCostChecks(),
  ]);

  checks.push(...security, ...stability, ...business, ...cost);
  return checks;
}

// ============ Security Checks ============

async function runSecurityChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  // CRON_SECRET configured
  checks.push({
    category: "security",
    name: "Cron Secret",
    status: process.env.CRON_SECRET ? "pass" : "fail",
    message: process.env.CRON_SECRET
      ? "CRON_SECRET 已配置"
      : "CRON_SECRET 未设置，定时任务不受保护",
  });

  // API keys configured
  checks.push({
    category: "security",
    name: "Anthropic API Key",
    status: process.env.ANTHROPIC_API_KEY ? "pass" : "warn",
    message: process.env.ANTHROPIC_API_KEY
      ? "已配置"
      : "未设置，AI 生成功能不可用",
  });

  checks.push({
    category: "security",
    name: "Gemini API Key",
    status: process.env.GEMINI_API_KEY ? "pass" : "warn",
    message: process.env.GEMINI_API_KEY
      ? "已配置"
      : "未设置，图片生成功能不可用",
  });

  // Check RLS — query for any remaining permissive policies
  try {
    const { data } = await supabase.rpc("check_permissive_policies");
    const count = typeof data === "number" ? data : 0;
    checks.push({
      category: "security",
      name: "RLS 策略",
      status: count === 0 ? "pass" : "fail",
      message:
        count === 0
          ? "所有表已强制 RLS"
          : `仍有 ${count} 条过度开放的策略`,
    });
  } catch {
    // RPC doesn't exist yet — check can't run
    checks.push({
      category: "security",
      name: "RLS 策略",
      status: "warn",
      message: "无法自动检查 RLS（需要 check_permissive_policies RPC）",
    });
  }

  return checks;
}

// ============ Stability Checks ============

async function runStabilityChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  // Error rate from audit_logs (last 24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: total } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);

    const { data: failures } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .eq("status", "failed");

    const totalCount = (total as unknown as number) || 0;
    const failCount = (failures as unknown as number) || 0;
    const errorRate = totalCount > 0 ? (failCount / totalCount) * 100 : 0;

    checks.push({
      category: "stability",
      name: "执行错误率 (24h)",
      status: errorRate < 5 ? "pass" : errorRate < 15 ? "warn" : "fail",
      message: `${errorRate.toFixed(1)}% (${failCount}/${totalCount})`,
    });
  } catch {
    checks.push({
      category: "stability",
      name: "执行错误率",
      status: "warn",
      message: "audit_logs 表尚未创建",
    });
  }

  // Stuck approval tasks
  try {
    const stuckSince = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: stuck } = await supabase
      .from("approval_tasks")
      .select("id")
      .eq("status", "pending")
      .lt("created_at", stuckSince);

    const stuckCount = stuck?.length || 0;
    checks.push({
      category: "stability",
      name: "滞留审批任务",
      status: stuckCount === 0 ? "pass" : stuckCount < 5 ? "warn" : "fail",
      message: stuckCount === 0 ? "无滞留" : `${stuckCount} 个任务等待超过 48h`,
    });
  } catch {
    checks.push({
      category: "stability",
      name: "滞留审批任务",
      status: "warn",
      message: "无法查询",
    });
  }

  // Auto-ops last run
  try {
    const { data: lastRun } = await supabase
      .from("auto_ops_logs")
      .select("created_at, run_type")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRun) {
      const hoursAgo = Math.round(
        (Date.now() - new Date(lastRun.created_at).getTime()) / 3600_000
      );
      checks.push({
        category: "stability",
        name: "自动运维最近执行",
        status: hoursAgo < 2 ? "pass" : hoursAgo < 25 ? "warn" : "fail",
        message: `${hoursAgo}h 前 (${lastRun.run_type})`,
      });
    } else {
      checks.push({
        category: "stability",
        name: "自动运维最近执行",
        status: "warn",
        message: "无运行记录",
      });
    }
  } catch {
    checks.push({
      category: "stability",
      name: "自动运维最近执行",
      status: "warn",
      message: "无法查询",
    });
  }

  return checks;
}

// ============ Business Checks ============

async function runBusinessChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  // Shopify integration connected
  try {
    const { data } = await supabase
      .from("integrations")
      .select("id, status")
      .eq("platform", "shopify")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    checks.push({
      category: "business",
      name: "Shopify 连接",
      status: data ? "pass" : "fail",
      message: data ? "已连接且活跃" : "未连接 Shopify",
    });
  } catch {
    checks.push({
      category: "business",
      name: "Shopify 连接",
      status: "fail",
      message: "无法查询",
    });
  }

  // Products count
  try {
    const { data } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });

    const count = (data as unknown as number) || 0;
    checks.push({
      category: "business",
      name: "产品数据",
      status: count > 0 ? "pass" : "warn",
      message: count > 0 ? `${count} 个产品已同步` : "尚无产品数据",
    });
  } catch {
    checks.push({
      category: "business",
      name: "产品数据",
      status: "warn",
      message: "无法查询",
    });
  }

  return checks;
}

// ============ Cost Checks ============

async function runCostChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Claude calls
    const { data: claudeCalls } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("provider", "claude")
      .gte("created_at", since);

    const claudeCount = (claudeCalls as unknown as number) || 0;
    // Rough estimate: ~$0.01-0.03 per call
    const claudeCost = claudeCount * 0.02;

    checks.push({
      category: "cost",
      name: "Claude API 调用 (24h)",
      status: claudeCount < 200 ? "pass" : claudeCount < 500 ? "warn" : "fail",
      message: `${claudeCount} 次 (~$${claudeCost.toFixed(2)})`,
    });

    // Gemini calls
    const { data: geminiCalls } = await supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("provider", "gemini")
      .gte("created_at", since);

    const geminiCount = (geminiCalls as unknown as number) || 0;
    const geminiCost = geminiCount * 0.01;

    checks.push({
      category: "cost",
      name: "Gemini API 调用 (24h)",
      status: geminiCount < 100 ? "pass" : geminiCount < 300 ? "warn" : "fail",
      message: `${geminiCount} 次 (~$${geminiCost.toFixed(2)})`,
    });
  } catch {
    checks.push({
      category: "cost",
      name: "API 成本追踪",
      status: "warn",
      message: "audit_logs 表尚未创建，无法统计",
    });
  }

  return checks;
}
