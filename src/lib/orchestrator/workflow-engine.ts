/**
 * Workflow Engine — executes playbooks step-by-step, passing context between skills.
 *
 * Handles: sequential execution, parallel groups, conditional skipping,
 * approval gates, retries, and comprehensive logging.
 */

import { executeSkill } from "../content-skills/executor";
import { createApprovalTask } from "../supabase-approval";
import { supabase } from "../supabase";
import type { Playbook, WorkflowContext, WorkflowResult, WorkflowStep } from "./types";

function generateRunId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Execute a playbook with the given user inputs.
 * Returns a complete result with all deliverables.
 */
export async function runPlaybook(
  playbook: Playbook,
  userInputs: Record<string, unknown>,
  options?: {
    user_id?: string;
    integration_id?: string;
    dry_run?: boolean;
  }
): Promise<WorkflowResult> {
  const runId = generateRunId();
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();

  const ctx: WorkflowContext = {
    run_id: runId,
    playbook_id: playbook.id,
    user_inputs: userInputs,
    step_outputs: {},
    artifacts: [],
    decisions: {},
    log: [],
    user_id: options?.user_id,
    integration_id: options?.integration_id,
  };

  // Save initial run record for progress tracking
  await saveRun(ctx, playbook, "running");

  // Group steps by parallel_group; steps with no group run sequentially
  const stepGroups = groupSteps(playbook.steps);

  let completed = 0;
  let awaitingApproval = false;

  for (const group of stepGroups) {
    if (group.length === 1) {
      const step = group[0];
      const { status } = await executeStep(step, ctx, playbook, options?.dry_run);
      if (status === "completed") completed++;
      if (status === "awaiting_approval") {
        awaitingApproval = true;
        break;
      }
      if (status === "failed" && !step.optional) {
        break;
      }
    } else {
      // Parallel execution within the group
      const results = await Promise.allSettled(
        group.map(step => executeStep(step, ctx, playbook, options?.dry_run))
      );
      const hasCritialFail = results.some((r, i) => {
        const step = group[i];
        return r.status === "fulfilled" && r.value.status === "failed" && !step.optional;
      });
      completed += results.filter(r => r.status === "fulfilled" && r.value.status === "completed").length;
      if (hasCritialFail) break;
    }

    // Persist progress after each group
    await saveRun(ctx, playbook, "running");
  }

  const status: WorkflowResult["status"] = awaitingApproval
    ? "awaiting_approval"
    : completed === playbook.steps.length
      ? "completed"
      : completed > 0 ? "partial" : "failed";

  const result: WorkflowResult = {
    run_id: runId,
    playbook_id: playbook.id,
    status,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_seconds: Math.round((Date.now() - startedMs) / 1000),
    steps_completed: completed,
    steps_total: playbook.steps.length,
    context: ctx,
    summary: buildSummary(playbook, ctx, status),
    deliverables: ctx.artifacts.map(a => ({
      type: a.type,
      label: a.label,
      url: a.url,
      preview: typeof a.content === "string" ? a.content.slice(0, 200) : undefined,
    })),
  };

  await saveRun(ctx, playbook, status, result);
  return result;
}

/** Group adjacent steps with the same parallel_group for concurrent execution */
function groupSteps(steps: WorkflowStep[]): WorkflowStep[][] {
  const groups: WorkflowStep[][] = [];
  let currentGroup: WorkflowStep[] = [];
  let currentKey: string | undefined = undefined;

  for (const step of steps) {
    if (step.parallel_group && step.parallel_group === currentKey) {
      currentGroup.push(step);
    } else {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [step];
      currentKey = step.parallel_group;
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

/** Execute a single step — handles approval, skill call, retries, error capture */
async function executeStep(
  step: WorkflowStep,
  ctx: WorkflowContext,
  playbook: Playbook,
  dryRun?: boolean
): Promise<{ status: "completed" | "skipped" | "failed" | "awaiting_approval" }> {
  const startedMs = Date.now();
  const logEntry = {
    step_id: step.id,
    status: "running" as const,
    started_at: new Date().toISOString(),
  };
  ctx.log.push(logEntry);

  try {
    // Check condition
    if (step.condition && !step.condition(ctx)) {
      logEntry.status = "skipped" as typeof logEntry.status;
      (logEntry as Record<string, unknown>).completed_at = new Date().toISOString();
      return { status: "skipped" };
    }

    // Approval gate
    if (step.requires_approval && !dryRun) {
      const promptText = step.approval_prompt ? step.approval_prompt(ctx) : `${step.label} 需要审批后执行`;
      const approval = await createApprovalTask({
        type: "content_publish",
        title: `[工作流] ${playbook.name} — ${step.label}`,
        description: promptText,
        payload: {
          workflow_run_id: ctx.run_id,
          playbook_id: playbook.id,
          step_id: step.id,
          context_snapshot: {
            user_inputs: ctx.user_inputs,
            step_outputs: ctx.step_outputs,
            decisions: ctx.decisions,
          },
        },
      });
      ctx.artifacts.push({
        step_id: step.id,
        type: "approval_task",
        label: `审批：${step.label}`,
        url: `/approvals/${approval.id}`,
      });
      logEntry.status = "awaiting_approval" as typeof logEntry.status;
      (logEntry as Record<string, unknown>).completed_at = new Date().toISOString();
      return { status: "awaiting_approval" };
    }

    // Dry run — skip actual execution, record what would happen
    if (dryRun) {
      ctx.step_outputs[step.id] = { dry_run: true };
      logEntry.status = "completed" as typeof logEntry.status;
      (logEntry as Record<string, unknown>).output_summary = "[dry run]";
      (logEntry as Record<string, unknown>).completed_at = new Date().toISOString();
      return { status: "completed" };
    }

    const maxRetries = step.max_retries || 1;
    let lastError: Error | null = null;
    let output: Record<string, unknown> | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (step.handler) {
          output = await step.handler(ctx);
        } else if (step.skill_id) {
          const inputs = await Promise.resolve(step.inputs(ctx));
          const { result } = await executeSkill(step.skill_id, inputs as Parameters<typeof executeSkill>[1], {
            sourceModule: "orchestrator",
          });
          output = result.output as Record<string, unknown>;
        } else {
          throw new Error(`Step ${step.id} has neither skill_id nor handler`);
        }
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
    }

    if (output === null) {
      throw lastError || new Error("Step failed without error");
    }

    ctx.step_outputs[step.id] = output;

    // Extract decisions/artifacts from output
    if (step.extract) step.extract(output, ctx);

    // Auto-detect artifacts from common output keys
    autoExtractArtifacts(step, output, ctx);

    const durationMs = Date.now() - startedMs;
    logEntry.status = "completed" as typeof logEntry.status;
    (logEntry as Record<string, unknown>).completed_at = new Date().toISOString();
    (logEntry as Record<string, unknown>).duration_ms = durationMs;
    (logEntry as Record<string, unknown>).output_summary = summarizeOutput(output);

    return { status: "completed" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    (logEntry as Record<string, unknown>).status = "failed";
    (logEntry as Record<string, unknown>).error = msg;
    (logEntry as Record<string, unknown>).completed_at = new Date().toISOString();
    return { status: "failed" };
  }
}

/** Auto-detect common artifact patterns in step output */
function autoExtractArtifacts(
  step: WorkflowStep,
  output: Record<string, unknown>,
  ctx: WorkflowContext
) {
  const o = output as Record<string, unknown>;
  if (typeof o.output_url === "string") {
    ctx.artifacts.push({
      step_id: step.id,
      type: o.video_url ? "video_url" : "image_url",
      label: step.label,
      url: o.output_url,
    });
  }
  if (typeof o.video_url === "string") {
    ctx.artifacts.push({
      step_id: step.id, type: "video_url", label: step.label, url: o.video_url,
    });
  }
  if (typeof o.page_url === "string") {
    ctx.artifacts.push({
      step_id: step.id, type: "page_url", label: step.label, url: o.page_url,
    });
  }
  if (typeof o.body_html === "string") {
    ctx.artifacts.push({
      step_id: step.id, type: "content", label: step.label, content: o.body_html,
    });
  }
}

function summarizeOutput(output: Record<string, unknown>): string {
  const keys = Object.keys(output).slice(0, 5);
  return keys.map(k => {
    const v = output[k];
    if (typeof v === "string") return `${k}: ${v.slice(0, 60)}`;
    if (typeof v === "number" || typeof v === "boolean") return `${k}: ${v}`;
    if (Array.isArray(v)) return `${k}: [${v.length} items]`;
    return `${k}: {...}`;
  }).join(" | ");
}

function buildSummary(playbook: Playbook, ctx: WorkflowContext, status: WorkflowResult["status"]): string {
  const completedSteps = ctx.log.filter(l => l.status === "completed").length;
  const totalSteps = playbook.steps.length;
  const artifactCount = ctx.artifacts.length;
  const statusText = status === "completed" ? "✅ 已完成"
    : status === "awaiting_approval" ? "⏸ 等待审批"
    : status === "partial" ? "⚠️ 部分完成"
    : "❌ 失败";
  return `${statusText} · ${playbook.name} · ${completedSteps}/${totalSteps} 步骤完成 · 产出 ${artifactCount} 个交付物`;
}

/** Persist workflow run to DB for tracking and resume */
async function saveRun(
  ctx: WorkflowContext,
  playbook: Playbook,
  status: string,
  result?: WorkflowResult
) {
  try {
    await supabase.from("workflow_runs").upsert({
      run_id: ctx.run_id,
      playbook_id: playbook.id,
      playbook_name: playbook.name,
      status,
      user_id: ctx.user_id || null,
      context: ctx as unknown as Record<string, unknown>,
      result: result as unknown as Record<string, unknown> | null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "run_id" });
  } catch {
    // Non-fatal — workflow continues even if persistence fails
  }
}

/** Helper for playbook steps to read previous step output with type hinting */
export function readStepOutput<T = Record<string, unknown>>(
  ctx: WorkflowContext,
  stepId: string
): T | undefined {
  return ctx.step_outputs[stepId] as T | undefined;
}
