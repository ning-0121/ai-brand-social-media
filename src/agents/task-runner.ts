import { supabase } from "@/lib/supabase";
import { reviewContent } from "@/lib/content-qa";
import { eventBus } from "./event-bus";
import { getAgent } from "./registry";
import type { AgentTask, AgentEvent } from "./types";

/**
 * Unified Task Runner — the single execution path for ALL agent tasks.
 *
 * Flow:
 * 1. Load agent
 * 2. Mark task as running
 * 3. Agent executes the task
 * 4. QA review (if applicable)
 * 5. If needs approval → create approval task
 * 6. If auto-executable → deploy result
 * 7. Emit events for other agents
 * 8. Update DB
 */
export async function runTask(taskId: string): Promise<AgentTask> {
  // Load task from DB
  const { data: task, error } = await supabase
    .from("agent_tasks_v2")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error || !task) throw new Error(`Task not found: ${taskId}`);

  const agent = getAgent(task.agent_id);
  if (!agent) throw new Error(`Agent not found: ${task.agent_id}`);

  // Mark running
  await supabase
    .from("agent_tasks_v2")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", taskId);

  try {
    // Execute
    const result = await agent.execute(task as AgentTask);

    // QA review for content-producing tasks
    const contentTypes = ["seo_fix", "detail_page", "social_post", "landing_page", "ad_creative"];
    let qaScore: number | undefined;

    if (contentTypes.includes(task.task_type) && result.output) {
      const qaType = task.task_type === "social_post" ? "social_post"
        : task.task_type === "landing_page" ? "landing_page"
        : task.task_type === "seo_fix" ? "seo"
        : "detail_page";
      const qa = await reviewContent(qaType as "seo" | "detail_page" | "social_post" | "landing_page", result.output || {});
      qaScore = qa.score;

      if (!qa.passed) {
        await supabase.from("agent_tasks_v2").update({
          status: "qa_rejected",
          output: result.output,
          qa_score: qaScore,
          error: qa.improvements.join("; "),
          updated_at: new Date().toISOString(),
        }).eq("id", taskId);
        return { ...task, status: "qa_rejected", qa_score: qaScore } as AgentTask;
      }
    }

    // Check approval requirement
    if (task.requires_approval) {
      const { data: approval } = await supabase.from("approval_tasks").insert({
        type: mapTaskToApprovalType(task.task_type),
        title: `[${agent.name}] ${task.title}`,
        description: task.description,
        entity_type: "products",
        payload: {
          agent_task_id: taskId,
          agent_id: task.agent_id,
          task_type: task.task_type,
          output: result.output,
          qa_score: qaScore,
        },
        status: "pending",
        created_by: "ai",
      }).select().single();

      await supabase.from("agent_tasks_v2").update({
        status: "approved", // waiting for approval
        output: result.output,
        qa_score: qaScore,
        approval_id: approval?.id,
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
    } else {
      // Auto-execute — mark completed
      await supabase.from("agent_tasks_v2").update({
        status: "completed",
        output: result.output,
        execution_result: result.execution_result,
        qa_score: qaScore,
        executed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", taskId);
    }

    // Emit event for cross-agent collaboration
    const event: AgentEvent = {
      type: `${task.task_type}.completed`,
      source_agent: task.agent_id,
      payload: {
        task_id: taskId,
        task_type: task.task_type,
        output: result.output,
      },
      timestamp: new Date().toISOString(),
    };
    await eventBus.emit(event);

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Execution failed";
    await supabase.from("agent_tasks_v2").update({
      status: "failed",
      error: errorMsg,
      updated_at: new Date().toISOString(),
    }).eq("id", taskId);
    throw err;
  }
}

/**
 * Run the next pending task for any agent.
 * Called by cron to process the task queue.
 */
export async function runNextPendingTask(): Promise<{ ran: boolean; task_id?: string }> {
  const { data: tasks } = await supabase
    .from("agent_tasks_v2")
    .select("id")
    .eq("status", "pending")
    .order("priority", { ascending: true }) // critical first
    .order("created_at", { ascending: true })
    .limit(1);

  if (!tasks || tasks.length === 0) return { ran: false };

  await runTask(tasks[0].id);
  return { ran: true, task_id: tasks[0].id };
}

/**
 * Have all agents analyze current state and create tasks.
 */
export async function analyzeAll(): Promise<{ tasks_created: number }> {
  const agentIds = ["trend", "content", "store", "social", "support", "ads"] as const;
  let tasksCreated = 0;

  for (const agentId of agentIds) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    try {
      const analysis = await agent.analyze();
      for (const suggestion of analysis.suggested_tasks) {
        await supabase.from("agent_tasks_v2").insert({
          agent_id: agentId,
          task_type: suggestion.task_type,
          title: suggestion.title,
          description: suggestion.description,
          status: "pending",
          priority: suggestion.priority,
          input: suggestion.input,
          source_module: agentId,
          target_module: suggestion.target_module,
          requires_approval: suggestion.requires_approval,
        });
        tasksCreated++;
      }
    } catch (err) {
      console.error(`[TaskRunner] ${agentId} analyze failed:`, err);
    }
  }

  return { tasks_created: tasksCreated };
}

function mapTaskToApprovalType(taskType: string): string {
  const map: Record<string, string> = {
    seo_fix: "seo_update",
    detail_page: "product_edit",
    social_post: "social_post",
    landing_page: "content_publish",
    ad_creative: "content_publish",
    price_adjust: "price_update",
    discount_event: "content_publish",
  };
  return map[taskType] || "content_publish";
}
