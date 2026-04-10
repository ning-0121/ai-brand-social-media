import type { AgentId, AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "./types";

/**
 * Base Agent — all 6 agents extend this.
 * Each agent can: analyze (proactive), execute (reactive), respond to events (collaborative).
 */
export abstract class BaseAgent {
  abstract readonly id: AgentId;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly capabilities: AgentCapability[];

  /**
   * Analyze current state and suggest tasks.
   * Called periodically by the cron job or manually.
   * Returns a list of suggested tasks the agent wants to do.
   */
  abstract analyze(): Promise<AnalysisResult>;

  /**
   * Execute a specific task.
   * The task-runner calls this after loading context and checking approval.
   * Returns the task with output filled in.
   */
  abstract execute(task: AgentTask): Promise<AgentTask>;

  /**
   * Respond to events from other agents.
   * Returns new tasks to create (cross-agent collaboration).
   */
  abstract onEvent(event: AgentEvent): Promise<AgentTask[]>;

  /**
   * Get the skill_id for a task type (maps to existing content skills).
   */
  getSkillId(taskType: string): string | undefined {
    return this.capabilities.find((c) => c.task_type === taskType)?.skill_id;
  }

  /**
   * Check if a task type can auto-execute without approval.
   */
  isAutoExecutable(taskType: string): boolean {
    return this.capabilities.find((c) => c.task_type === taskType)?.auto_executable ?? false;
  }
}
