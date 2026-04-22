/**
 * Orchestrator — Multi-skill workflow engine
 *
 * Solves: 50+ isolated skills have no commander. This layer turns them
 * into coordinated "battle units" that achieve business objectives.
 */

/** Loosened input type — playbooks can pass any fields; runtime casts handle conversion to SkillInputData */
export type PlaybookStepInput = Record<string, unknown>;

/** A single step in a workflow — typically a skill call or pipeline call */
export interface WorkflowStep {
  /** Unique step ID (used to reference outputs in later steps) */
  id: string;
  /** Human-readable label shown in progress UI */
  label: string;
  /** Which skill to run (skill_id from registry) */
  skill_id?: string;
  /** OR a custom handler (for pipelines, non-skill operations) */
  handler?: (ctx: WorkflowContext) => Promise<Record<string, unknown>>;
  /** Map from workflow context → skill input */
  inputs: (ctx: WorkflowContext) => PlaybookStepInput | Promise<PlaybookStepInput>;
  /** Extract key decisions from this step's output into the context */
  extract?: (output: Record<string, unknown>, ctx: WorkflowContext) => void;
  /** Skip this step if condition is false */
  condition?: (ctx: WorkflowContext) => boolean;
  /** Steps with the same parallel_group run concurrently */
  parallel_group?: string;
  /** Require human approval before execution */
  requires_approval?: boolean;
  /** Approval prompt if approval required */
  approval_prompt?: (ctx: WorkflowContext) => string;
  /** Retry policy: how many times to retry if fails */
  max_retries?: number;
  /** If true, workflow continues even if this step fails */
  optional?: boolean;
}

/** A complete workflow ("playbook") — multiple steps achieving a business goal */
export interface Playbook {
  id: string;
  name: string;
  description: string;
  /** What business outcome this achieves (human-readable) */
  objective: string;
  /** When should this playbook be used (helps AI planner choose) */
  when_to_use: string;
  /** What inputs the user needs to provide before running */
  required_inputs: Array<{
    key: string;
    label: string;
    type: "text" | "product" | "products" | "number" | "date" | "select";
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
    placeholder?: string;
  }>;
  /** Ordered list of steps */
  steps: WorkflowStep[];
  /** Estimated total runtime in seconds (sum of all steps, accounting for parallelism) */
  estimated_duration_seconds: number;
  /** Category for UI grouping */
  category: "growth" | "optimization" | "campaign" | "content" | "inventory";
  /** Icon name (lucide) */
  icon: string;
  /** Tailwind color class */
  color: string;
}

/** Runtime context — carries data between steps */
export interface WorkflowContext {
  /** Unique run ID for logging/tracking */
  run_id: string;
  /** Playbook being executed */
  playbook_id: string;
  /** User's initial inputs (product, budget, goal, etc.) */
  user_inputs: Record<string, unknown>;
  /** Map of step_id → step output (for downstream steps to reference) */
  step_outputs: Record<string, Record<string, unknown>>;
  /** Named artifacts produced (URLs, IDs of deliverables) */
  artifacts: Array<{
    step_id: string;
    type: "page_url" | "image_url" | "video_url" | "content" | "pdf" | "approval_task";
    label: string;
    url?: string;
    content?: unknown;
  }>;
  /** Key decisions extracted by steps for human review */
  decisions: Record<string, unknown>;
  /** Log of what happened at each step */
  log: Array<{
    step_id: string;
    status: "pending" | "running" | "completed" | "skipped" | "failed" | "awaiting_approval";
     started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    error?: string;
    output_summary?: string;
  }>;
  /** User ID running this workflow */
  user_id?: string;
  /** Integration ID (Shopify) if relevant */
  integration_id?: string;
}

export interface WorkflowResult {
  run_id: string;
  playbook_id: string;
  status: "completed" | "partial" | "failed" | "awaiting_approval";
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  steps_completed: number;
  steps_total: number;
  context: WorkflowContext;
  summary: string;
  deliverables: Array<{
    type: string;
    label: string;
    url?: string;
    preview?: string;
  }>;
}
