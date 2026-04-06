export type FindingCategory = "seo" | "product" | "inventory" | "sales" | "content";
export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type FindingStatus = "open" | "in_progress" | "resolved" | "dismissed";

export interface AffectedEntity {
  entity_type: "product" | "order" | "content";
  entity_id: string;
  name: string;
  shopify_product_id?: number;
}

export interface RecommendedAction {
  action_type: "seo_update" | "product_edit" | "inventory_update" | "content_publish" | "workflow_launch" | "info_only";
  agent_name?: string;
  task_type?: string;
  workflow_template?: string;
  display_label: string;
  estimated_impact?: "high" | "medium" | "low";
}

export interface DiagnosticFinding {
  id: string;
  report_id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string | null;
  affected_entities: AffectedEntity[];
  recommended_action: RecommendedAction;
  status: FindingStatus;
  execution_ref: { type: "approval_task" | "workflow_instance"; id: string } | null;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticSummary {
  overall_health: number;
  seo_score: number;
  product_score: number;
  inventory_score: number;
  sales_score: number;
  content_score: number;
  total_findings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface DiagnosticReport {
  id: string;
  user_id: string | null;
  status: "running" | "completed" | "failed";
  trigger_type: "manual" | "scheduled" | "dashboard_load";
  summary: DiagnosticSummary;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface DiagnosticReportWithFindings extends DiagnosticReport {
  findings: DiagnosticFinding[];
}

// Agent 返回的原始 finding 格式 (AI 生成)
export interface RawFinding {
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  affected_product_names?: string[];
  recommended_action_type: RecommendedAction["action_type"];
  recommended_action_label: string;
}
