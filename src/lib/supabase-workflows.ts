import { supabase } from "./supabase";
import type {
  AgentRole,
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowTask,
  AgentOutput,
  WorkflowStatus,
} from "./agent-types";

// ============ Agent Roles ============

export async function getAgentRoles() {
  const { data, error } = await supabase
    .from("agent_roles")
    .select("*")
    .eq("is_active", true)
    .order("department");
  if (error) throw error;
  return data as AgentRole[];
}

export async function getAgentByName(name: string) {
  const { data, error } = await supabase
    .from("agent_roles")
    .select("*")
    .eq("name", name)
    .single();
  if (error) throw error;
  return data as AgentRole;
}

// ============ Workflow Templates ============

export async function getWorkflowTemplates() {
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;
  return data as WorkflowTemplate[];
}

export async function getWorkflowTemplateById(id: string) {
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as WorkflowTemplate;
}

export async function getWorkflowTemplateByName(name: string) {
  const { data, error } = await supabase
    .from("workflow_templates")
    .select("*")
    .eq("name", name)
    .single();
  if (error) throw error;
  return data as WorkflowTemplate;
}

// ============ Workflow Instances ============

export async function getWorkflowInstances(status?: WorkflowStatus) {
  let query = supabase
    .from("workflow_instances")
    .select("*")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as WorkflowInstance[];
}

export async function getWorkflowInstanceById(id: string) {
  const { data, error } = await supabase
    .from("workflow_instances")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as WorkflowInstance;
}

export async function createWorkflowInstance(data: {
  user_id?: string;
  template_id?: string;
  name: string;
  total_steps: number;
  input_data?: Record<string, unknown>;
}) {
  const { data: result, error } = await supabase
    .from("workflow_instances")
    .insert({ status: "active", current_step: 0, context: {}, ...data })
    .select()
    .single();
  if (error) throw error;
  return result as WorkflowInstance;
}

export async function updateWorkflowInstance(
  id: string,
  data: Record<string, unknown>
) {
  const { data: result, error } = await supabase
    .from("workflow_instances")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as WorkflowInstance;
}

// ============ Workflow Tasks ============

export async function getWorkflowTasks(workflowId: string) {
  const { data, error } = await supabase
    .from("workflow_tasks")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("step_index");
  if (error) throw error;
  return data as WorkflowTask[];
}

export async function getWorkflowTaskById(id: string) {
  const { data, error } = await supabase
    .from("workflow_tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as WorkflowTask;
}

export async function createWorkflowTask(data: {
  workflow_id: string;
  step_index: number;
  agent_name: string;
  task_type: string;
  title: string;
  description?: string;
  requires_approval?: boolean;
  parallel_group?: string;
  depends_on?: number[];
  input_data?: Record<string, unknown>;
}) {
  const { data: result, error } = await supabase
    .from("workflow_tasks")
    .insert({ status: "pending", priority: 0, ...data })
    .select()
    .single();
  if (error) throw error;
  return result as WorkflowTask;
}

export async function updateWorkflowTask(
  id: string,
  data: Record<string, unknown>
) {
  const { data: result, error } = await supabase
    .from("workflow_tasks")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as WorkflowTask;
}

// ============ Agent Outputs ============

export async function createAgentOutput(data: {
  task_id?: string;
  agent_name: string;
  output_type: string;
  title?: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const { data: result, error } = await supabase
    .from("agent_outputs")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as AgentOutput;
}

export async function getAgentOutputsByWorkflow(workflowId: string) {
  const { data, error } = await supabase
    .from("agent_outputs")
    .select("*, workflow_tasks!inner(workflow_id)")
    .eq("workflow_tasks.workflow_id", workflowId)
    .order("created_at");
  if (error) throw error;
  return data as AgentOutput[];
}

// ============ Workflow KPIs ============

export async function getWorkflowKPIs() {
  const { data, error } = await supabase
    .from("workflow_instances")
    .select("status");
  if (error) return { active: 0, completed: 0, total: 0 };
  const workflows = data || [];
  return {
    active: workflows.filter((w) => w.status === "active").length,
    completed: workflows.filter((w) => w.status === "completed").length,
    total: workflows.length,
  };
}

export async function getRecentAgentActivity(limit = 10) {
  const { data, error } = await supabase
    .from("workflow_tasks")
    .select("id, agent_name, task_type, title, status, started_at, completed_at, updated_at")
    .in("status", ["completed", "running", "awaiting_approval", "failed"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Pick<
    WorkflowTask,
    "id" | "agent_name" | "task_type" | "title" | "status" | "started_at" | "completed_at" | "updated_at"
  >[];
}
