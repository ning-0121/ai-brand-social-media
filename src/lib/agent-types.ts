// ============ Agent System Types ============

export type AgentDepartment = "operations" | "social" | "product" | "content";

export type AgentName =
  | "store_optimizer"
  | "data_analyst"
  | "ad_manager"
  | "social_strategist"
  | "brand_strategist"
  | "market_researcher"
  | "content_producer";

export interface AgentRole {
  id: string;
  name: AgentName;
  display_name: string;
  department: AgentDepartment;
  description: string;
  system_prompt: string | null;
  capabilities: string[];
  data_access: string[];
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Workflow Types ============

export type WorkflowCategory = "launch" | "daily_ops" | "campaign" | "research" | "optimization";
export type WorkflowStatus = "active" | "paused" | "completed" | "failed" | "cancelled";
export type TaskStatus =
  | "pending"
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export interface WorkflowStep {
  index: number;
  agent_name: AgentName;
  task_type: string;
  title: string;
  description: string;
  requires_approval: boolean;
  depends_on: number[];
  parallel_group?: string;
  input_mapping?: Record<string, string>;
  condition?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: WorkflowCategory;
  steps: WorkflowStep[];
  estimated_duration: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  user_id: string | null;
  template_id: string | null;
  name: string;
  status: WorkflowStatus;
  current_step: number;
  total_steps: number;
  input_data: Record<string, unknown>;
  context: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTask {
  id: string;
  workflow_id: string;
  parent_task_id: string | null;
  step_index: number;
  agent_name: string;
  task_type: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  requires_approval: boolean;
  approval_task_id: string | null;
  retry_count: number;
  max_retries: number;
  parallel_group: string | null;
  depends_on: number[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentOutput {
  id: string;
  task_id: string | null;
  agent_name: string;
  output_type: string;
  title: string | null;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
}

// ============ Agent Config Types ============

export interface AgentTaskConfig {
  scene: string;
  systemPromptOverride?: string;
  dataQueries?: () => Promise<Record<string, unknown>>;
  buildPrompt: (
    input: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ) => string;
  postProcess?: (
    output: Record<string, unknown>,
    task: WorkflowTask,
    workflowContext: Record<string, unknown>
  ) => Promise<void>;
}

export type AgentConfigMap = Record<string, AgentTaskConfig>;
