import { supabase } from "./supabase";

export interface DispatchOptions {
  skill_id: string;
  source_module: string;
  source_ref?: Record<string, unknown>;
  product_id?: string;
  product_name?: string;
  inputs?: Record<string, unknown>;
}

/**
 * 跨模块任务分发器
 * 任何模块都可以调用此函数把内容需求送入内容工厂
 */
export async function dispatchContentTask(options: DispatchOptions) {
  const { data, error } = await supabase
    .from("content_tasks")
    .insert({
      skill_id: options.skill_id,
      source_module: options.source_module,
      source_ref: options.source_ref || null,
      product_id: options.product_id || null,
      product_name: options.product_name || null,
      inputs: options.inputs || {},
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`分发任务失败: ${error.message}`);
  return data;
}

export async function getPendingTasks(limit: number = 20) {
  const { data } = await supabase
    .from("content_tasks")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getCompletedTasks(limit: number = 20) {
  const { data } = await supabase
    .from("content_tasks")
    .select("*")
    .in("status", ["completed", "approved"])
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data || [];
}
