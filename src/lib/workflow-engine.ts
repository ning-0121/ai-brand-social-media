import {
  getWorkflowTemplateById,
  createWorkflowInstance,
  updateWorkflowInstance,
  createWorkflowTask,
  updateWorkflowTask,
  getWorkflowTasks,
  getWorkflowInstanceById,
  getWorkflowTaskById,
  createAgentOutput,
} from "./supabase-workflows";
import { createApprovalTask } from "./supabase-approval";
import { executeAgent } from "./agent-executor";
import type { WorkflowStep } from "./agent-types";

// ============ Launch Workflow ============

export async function launchWorkflow(
  templateId: string,
  inputData: Record<string, unknown>,
  userId?: string
) {
  // Load template
  const template = await getWorkflowTemplateById(templateId);
  const steps = template.steps as WorkflowStep[];

  // Create workflow instance
  const instance = await createWorkflowInstance({
    user_id: userId,
    template_id: templateId,
    name: template.display_name,
    total_steps: steps.length,
    input_data: inputData,
  });

  // Create all tasks
  for (const step of steps) {
    await createWorkflowTask({
      workflow_id: instance.id,
      step_index: step.index,
      agent_name: step.agent_name,
      task_type: step.task_type,
      title: step.title,
      description: step.description,
      requires_approval: step.requires_approval,
      parallel_group: step.parallel_group || undefined,
      depends_on: step.depends_on,
    });
  }

  // Start first eligible tasks (those with no dependencies)
  const tasks = await getWorkflowTasks(instance.id);
  const startable = tasks.filter(
    (t) => !t.depends_on || t.depends_on.length === 0
  );

  for (const task of startable) {
    await processTask(task.id);
  }

  return instance;
}

// ============ Process Task ============

export async function processTask(taskId: string) {
  const task = await getWorkflowTaskById(taskId);
  if (task.status !== "pending" && task.status !== "queued") return;

  // Mark as running
  await updateWorkflowTask(taskId, {
    status: "running",
    started_at: new Date().toISOString(),
  });

  // Update workflow current step
  await updateWorkflowInstance(task.workflow_id, {
    current_step: task.step_index,
  });

  try {
    // Load workflow context
    const workflow = await getWorkflowInstanceById(task.workflow_id);

    // Execute the agent
    const output = await executeAgent(
      task.agent_name,
      task.task_type,
      {
        ...task.input_data,
        ...workflow.input_data,
      },
      workflow.context
    );

    if (task.requires_approval) {
      // Create approval task and pause
      const approvalTask = await createApprovalTask({
        type: "content_publish", // generic type for workflow approvals
        title: `[${task.title}] — 需要审批`,
        description: `工作流「${workflow.name}」的第 ${task.step_index + 1} 步需要你的审批`,
        payload: {
          workflow_task_id: taskId,
          agent_name: task.agent_name,
          agent_output: output,
        },
        created_by: "ai",
      });

      // Save agent output
      await createAgentOutput({
        task_id: taskId,
        agent_name: task.agent_name,
        output_type: task.task_type,
        title: task.title,
        data: output,
      });

      await updateWorkflowTask(taskId, {
        status: "awaiting_approval",
        output_data: output,
        approval_task_id: approvalTask.id,
      });
    } else {
      // Auto-complete
      await completeTask(taskId, output);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "执行失败";

    if (task.retry_count < task.max_retries) {
      // Retry
      await updateWorkflowTask(taskId, {
        status: "pending",
        retry_count: task.retry_count + 1,
        error_message: errorMsg,
      });
      await processTask(taskId);
    } else {
      // Mark as failed
      await updateWorkflowTask(taskId, {
        status: "failed",
        error_message: errorMsg,
        completed_at: new Date().toISOString(),
      });
    }
  }
}

// ============ Complete Task ============

export async function completeTask(
  taskId: string,
  output: Record<string, unknown>
) {
  const task = await getWorkflowTaskById(taskId);

  // Update task
  await updateWorkflowTask(taskId, {
    status: "completed",
    output_data: output,
    completed_at: new Date().toISOString(),
  });

  // Save agent output
  await createAgentOutput({
    task_id: taskId,
    agent_name: task.agent_name,
    output_type: task.task_type,
    title: task.title,
    data: output,
  });

  // Merge output into workflow context
  const workflow = await getWorkflowInstanceById(task.workflow_id);
  const newContext = {
    ...workflow.context,
    [String(task.step_index)]: output,
  };
  await updateWorkflowInstance(task.workflow_id, { context: newContext });

  // Check for next tasks to start
  await advanceWorkflow(task.workflow_id);
}

// ============ Advance Workflow ============

async function advanceWorkflow(workflowId: string) {
  const tasks = await getWorkflowTasks(workflowId);

  const completedIndices = new Set(
    tasks.filter((t) => t.status === "completed").map((t) => t.step_index)
  );

  // Find pending tasks whose dependencies are all completed
  const startable = tasks.filter((t) => {
    if (t.status !== "pending") return false;
    const deps = t.depends_on || [];
    return deps.every((d) => completedIndices.has(d));
  });

  if (startable.length > 0) {
    // Start all eligible tasks (handles parallel groups)
    for (const task of startable) {
      await processTask(task.id);
    }
  } else {
    // Check if workflow is complete
    const allDone = tasks.every(
      (t) =>
        t.status === "completed" ||
        t.status === "skipped" ||
        t.status === "cancelled"
    );
    const anyActive = tasks.some(
      (t) =>
        t.status === "running" ||
        t.status === "awaiting_approval" ||
        t.status === "queued"
    );

    if (allDone) {
      await updateWorkflowInstance(workflowId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } else if (!anyActive && tasks.some((t) => t.status === "failed")) {
      await updateWorkflowInstance(workflowId, { status: "failed" });
    }
  }
}

// ============ Approval Callback ============

export async function onApprovalDecision(
  workflowTaskId: string,
  decision: "approved" | "rejected"
) {
  const task = await getWorkflowTaskById(workflowTaskId);
  if (task.status !== "awaiting_approval") return;

  if (decision === "approved") {
    await completeTask(workflowTaskId, task.output_data || {});
  } else {
    await updateWorkflowTask(workflowTaskId, {
      status: "failed",
      error_message: "审批被拒绝",
      completed_at: new Date().toISOString(),
    });
    await advanceWorkflow(task.workflow_id);
  }
}

// ============ Workflow Control ============

export async function pauseWorkflow(workflowId: string) {
  await updateWorkflowInstance(workflowId, { status: "paused" });
}

export async function cancelWorkflow(workflowId: string) {
  await updateWorkflowInstance(workflowId, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
  });

  // Cancel all pending/queued tasks
  const tasks = await getWorkflowTasks(workflowId);
  for (const task of tasks) {
    if (["pending", "queued", "running"].includes(task.status)) {
      await updateWorkflowTask(task.id, { status: "cancelled" });
    }
  }
}
