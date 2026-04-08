import { supabase } from "./supabase";
import { executeAgent } from "./agent-executor";
import { getProducts } from "./supabase-queries";
import type {
  DiagnosticReport,
  DiagnosticReportWithFindings,
  DiagnosticFinding,
  DiagnosticSummary,
  RawFinding,
  AffectedEntity,
  RecommendedAction,
} from "./diagnostic-types";

export async function runDiagnostic(
  userId?: string,
  triggerType: "manual" | "scheduled" | "dashboard_load" = "manual"
): Promise<DiagnosticReportWithFindings> {
  // 1. 创建诊断报告
  const { data: report, error: createErr } = await supabase
    .from("diagnostic_reports")
    .insert({
      user_id: userId || null,
      status: "running",
      trigger_type: triggerType,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createErr || !report) {
    throw new Error(`创建诊断报告失败: ${createErr?.message}`);
  }

  try {
    // 2. 并行运行两个诊断 Agent
    const [seoResult, salesResult] = await Promise.allSettled([
      executeAgent("store_optimizer", "diagnostic_scan", {}, {}),
      executeAgent("data_analyst", "diagnostic_sales", {}, {}),
    ]);

    // 3. 解析 findings
    const rawFindings: RawFinding[] = [];

    if (seoResult.status === "fulfilled") {
      const items = parseFindingsFromResult(seoResult.value);
      rawFindings.push(...items);
    } else {
      console.error("SEO diagnostic failed:", seoResult.reason);
    }

    if (salesResult.status === "fulfilled") {
      const items = parseFindingsFromResult(salesResult.value);
      rawFindings.push(...items);
    } else {
      console.error("Sales diagnostic failed:", salesResult.reason);
    }

    // 4. 加载商品用于匹配
    const products = (await getProducts()) || [];
    const productById = new Map<string, { id: string; name: string; shopify_product_id?: number }>(
      products.map((p: { id: string; name: string; shopify_product_id?: number }) => [
        p.id,
        { id: p.id, name: p.name, shopify_product_id: p.shopify_product_id },
      ])
    );
    const productByName = new Map<string, { id: string; name: string; shopify_product_id?: number }>(
      products.map((p: { id: string; name: string; shopify_product_id?: number }) => [
        p.name.toLowerCase(),
        { id: p.id, name: p.name, shopify_product_id: p.shopify_product_id },
      ])
    );

    // 5. 转换为 DB findings
    const dbFindings = rawFindings.map((raw) => {
      const entities: AffectedEntity[] = [];

      // Preferred: AI returned product IDs (UUIDs from our prompt)
      if (raw.affected_product_ids && Array.isArray(raw.affected_product_ids)) {
        for (const id of raw.affected_product_ids) {
          const match = productById.get(id);
          if (match && match.shopify_product_id) {
            entities.push({
              entity_type: "product",
              entity_id: match.id,
              name: match.name,
              shopify_product_id: match.shopify_product_id,
            });
          }
        }
      }

      // Fallback: AI returned names (try fuzzy match)
      if (entities.length === 0 && raw.affected_product_names) {
        for (const name of raw.affected_product_names) {
          const match = productByName.get(name.toLowerCase());
          if (match) {
            entities.push({
              entity_type: "product",
              entity_id: match.id,
              name: match.name,
              shopify_product_id: match.shopify_product_id,
            });
            continue;
          }
          const lowerName = name.toLowerCase();
          const entries = Array.from(productByName.entries());
          const fuzzy = entries.find(([key]) => key.includes(lowerName) || lowerName.includes(key));
          if (fuzzy) {
            entities.push({
              entity_type: "product",
              entity_id: fuzzy[1].id,
              name: fuzzy[1].name,
              shopify_product_id: fuzzy[1].shopify_product_id,
            });
          }
        }
      }

      const action: RecommendedAction = {
        action_type: raw.recommended_action_type || "info_only",
        display_label: raw.recommended_action_label || "查看详情",
        estimated_impact: raw.severity === "critical" || raw.severity === "high" ? "high" : "medium",
      };

      // 根据类型设置 agent 信息
      if (action.action_type === "seo_update") {
        action.agent_name = "store_optimizer";
        action.task_type = entities.length > 3 ? "batch_seo_apply" : "seo_apply";
      } else if (action.action_type === "workflow_launch") {
        action.workflow_template = "seo_optimization";
      }

      return {
        report_id: report.id,
        category: raw.category,
        severity: raw.severity,
        title: raw.title,
        description: raw.description,
        affected_entities: entities,
        recommended_action: action,
        status: "open",
      };
    });

    // 6. 批量写入 findings
    if (dbFindings.length > 0) {
      const { error: insertErr } = await supabase
        .from("diagnostic_findings")
        .insert(dbFindings);
      if (insertErr) {
        console.error("写入 findings 失败:", insertErr);
      }
    }

    // 7. 计算健康分
    const summary = computeSummary(rawFindings);

    // 8. 更新报告
    await supabase
      .from("diagnostic_reports")
      .update({
        status: "completed",
        summary,
        completed_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    // 9. 获取完整报告
    const { data: findings } = await supabase
      .from("diagnostic_findings")
      .select("*")
      .eq("report_id", report.id)
      .order("severity", { ascending: true });

    return {
      ...report,
      status: "completed" as const,
      summary,
      completed_at: new Date().toISOString(),
      findings: (findings || []) as DiagnosticFinding[],
    };
  } catch (err) {
    // 诊断失败
    await supabase
      .from("diagnostic_reports")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", report.id);
    throw err;
  }
}

export async function getLatestReport(userId?: string): Promise<DiagnosticReportWithFindings | null> {
  let query = supabase
    .from("diagnostic_reports")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: reports } = await query;
  if (!reports?.length) return null;

  const report = reports[0] as DiagnosticReport;

  const { data: findings } = await supabase
    .from("diagnostic_findings")
    .select("*")
    .eq("report_id", report.id)
    .order("severity", { ascending: true });

  // severity 排序: critical > high > medium > low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedFindings = (findings || []).sort(
    (a, b) => (severityOrder[a.severity as keyof typeof severityOrder] || 4) - (severityOrder[b.severity as keyof typeof severityOrder] || 4)
  );

  return {
    ...report,
    findings: sortedFindings as DiagnosticFinding[],
  };
}

// ---- Helpers ----

function parseFindingsFromResult(result: Record<string, unknown>): RawFinding[] {
  // Agent 可能返回 { items: [...] } 或 { raw_text: "..." }
  if (Array.isArray(result.items)) {
    return result.items as RawFinding[];
  }
  if (typeof result.raw_text === "string") {
    try {
      const match = result.raw_text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]) as RawFinding[];
    } catch { /* ignore */ }
  }
  // 尝试直接作为数组
  if (Array.isArray(result)) {
    return result as RawFinding[];
  }
  return [];
}

function computeSummary(findings: RawFinding[]): DiagnosticSummary {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const categoryScores: Record<string, { issues: number; weight: number }> = {
    seo: { issues: 0, weight: 0 },
    product: { issues: 0, weight: 0 },
    inventory: { issues: 0, weight: 0 },
    sales: { issues: 0, weight: 0 },
    content: { issues: 0, weight: 0 },
  };

  const severityWeight = { critical: 10, high: 5, medium: 2, low: 1 };

  for (const f of findings) {
    counts[f.severity]++;
    if (categoryScores[f.category]) {
      categoryScores[f.category].issues++;
      categoryScores[f.category].weight += severityWeight[f.severity] || 1;
    }
  }

  // 每个类别满分 100，扣分 = weight * 5，最低 0
  const scoreFor = (cat: string) => Math.max(0, 100 - (categoryScores[cat]?.weight || 0) * 5);

  const seo_score = scoreFor("seo");
  const product_score = scoreFor("product");
  const inventory_score = scoreFor("inventory");
  const sales_score = scoreFor("sales");
  const content_score = scoreFor("content");

  const overall_health = Math.round(
    (seo_score * 0.25 + product_score * 0.2 + inventory_score * 0.2 + sales_score * 0.2 + content_score * 0.15)
  );

  return {
    overall_health,
    seo_score,
    product_score,
    inventory_score,
    sales_score,
    content_score,
    total_findings: findings.length,
    ...counts,
  };
}
