import { supabase } from "./supabase";
import type { ApprovalTask, ApprovalStatus } from "./approval-types";

export async function getApprovalTasks(status?: ApprovalStatus) {
  let query = supabase
    .from("approval_tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ApprovalTask[];
}

export async function getApprovalTaskById(id: string) {
  const { data, error } = await supabase
    .from("approval_tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ApprovalTask;
}

export async function createApprovalTask(data: {
  type: string;
  entity_id?: string;
  entity_type?: string;
  title: string;
  description?: string;
  payload: Record<string, unknown>;
  created_by?: string;
}) {
  const { data: result, error } = await supabase
    .from("approval_tasks")
    .insert({ status: "pending", created_by: "ai", ...data })
    .select()
    .single();
  if (error) throw error;
  return result as ApprovalTask;
}

export async function updateApprovalTask(
  id: string,
  data: Record<string, unknown>
) {
  const { data: result, error } = await supabase
    .from("approval_tasks")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return result as ApprovalTask;
}

export async function getApprovalKPIs() {
  const { data: all, error } = await supabase
    .from("approval_tasks")
    .select("status, created_at");
  if (error) throw error;

  const tasks = all || [];
  const today = new Date().toISOString().split("T")[0];

  return {
    pending: tasks.filter((t) => t.status === "pending").length,
    approvedToday: tasks.filter(
      (t) => t.status === "executed" && t.created_at?.startsWith(today)
    ).length,
    executed: tasks.filter((t) => t.status === "executed").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    total: tasks.length,
  };
}

export async function getPendingCount() {
  const { count, error } = await supabase
    .from("approval_tasks")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count || 0;
}
