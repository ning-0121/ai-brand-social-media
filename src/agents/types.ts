// ============ Agent System V2 Types ============

export type TaskStatus = "pending" | "running" | "completed" | "approved" | "rejected" | "failed" | "qa_rejected";
export type Priority = "critical" | "high" | "medium" | "low";
export type AgentId = "trend" | "content" | "store" | "social" | "support" | "ads";

export interface AgentTask {
  id: string;
  agent_id: AgentId;
  task_type: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  source_module: string;
  target_module?: string;
  requires_approval: boolean;
  approval_id?: string;
  execution_result?: Record<string, unknown>;
  qa_score?: number;
  error?: string;
  created_at: string;
  executed_at?: string;
  updated_at?: string;
}

export interface AgentEvent {
  type: string; // e.g. "trend.opportunity_found", "store.seo_issue", "content.generated"
  source_agent: AgentId;
  payload: Record<string, unknown>;
  target_agents?: AgentId[];
  timestamp: string;
}

export interface AgentCapability {
  task_type: string;
  name: string;
  description: string;
  auto_executable: boolean; // can run without approval
  skill_id?: string; // maps to existing content skill
  estimated_duration_seconds: number;
}

export interface AgentAnalysis {
  agent_id: AgentId;
  tasks: Omit<AgentTask, "id" | "created_at" | "status">[];
  summary: string;
  urgency: Priority;
}

// What an Agent returns when analyzing the current state
export interface AnalysisResult {
  suggested_tasks: Array<{
    task_type: string;
    title: string;
    description: string;
    priority: Priority;
    input: Record<string, unknown>;
    requires_approval: boolean;
    target_module?: string;
    skill_id?: string;
  }>;
  summary: string;
  health_score: number; // 0-100
}

// Approval request with full context
export interface ApprovalRequest {
  task_id: string;
  agent_id: AgentId;
  task_type: string;
  title: string;
  risk_level: Priority;
  expected_impact: string;
  ai_suggestion: Record<string, unknown>;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  estimated_revenue_impact?: string;
}
