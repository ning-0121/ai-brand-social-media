import { supabase } from "@/lib/supabase";
import type { AgentEvent, AgentTask } from "./types";

type EventHandler = (event: AgentEvent) => Promise<AgentTask[]>;

/**
 * Simple event bus for cross-agent communication.
 * When one agent does something, other agents can react.
 *
 * Examples:
 * - TrendAgent finds opportunity → ContentAgent creates content tasks
 * - StoreAgent finds SEO issue → ContentAgent generates SEO copy
 * - SupportAgent gets complaint → StoreAgent checks product
 * - AdsAgent detects low ROI → auto-pause campaign
 */
class AgentEventBus {
  private handlers = new Map<string, EventHandler[]>();

  /**
   * Register an event handler.
   * Pattern: "agent_id.event_type" or "*" for all events.
   */
  on(pattern: string, handler: EventHandler): void {
    const existing = this.handlers.get(pattern) || [];
    existing.push(handler);
    this.handlers.set(pattern, existing);
  }

  /**
   * Emit an event. All matching handlers are called.
   * Returns new tasks created by handlers.
   */
  async emit(event: AgentEvent): Promise<AgentTask[]> {
    const allTasks: AgentTask[] = [];

    // Log event
    console.log(`[EventBus] ${event.source_agent}.${event.type}:`, JSON.stringify(event.payload).slice(0, 200));

    // Find matching handlers
    const patterns = [
      `${event.source_agent}.${event.type}`, // exact match
      `*.${event.type}`,                       // any source
      `${event.source_agent}.*`,               // any event from this agent
      "*",                                      // catch all
    ];

    for (const pattern of patterns) {
      const handlers = this.handlers.get(pattern) || [];
      for (const handler of handlers) {
        try {
          const tasks = await handler(event);
          allTasks.push(...tasks);
        } catch (err) {
          console.error(`[EventBus] Handler for ${pattern} failed:`, err);
        }
      }
    }

    // Also notify specific target agents
    if (event.target_agents) {
      for (const targetId of event.target_agents) {
        const targetHandlers = this.handlers.get(`${targetId}._incoming`) || [];
        for (const handler of targetHandlers) {
          try {
            const tasks = await handler(event);
            allTasks.push(...tasks);
          } catch (err) {
            console.error(`[EventBus] Target handler for ${targetId} failed:`, err);
          }
        }
      }
    }

    // Save new tasks to DB
    for (const task of allTasks) {
      try {
        await supabase.from("agent_tasks_v2").insert({
          agent_id: task.agent_id,
          task_type: task.task_type,
          title: task.title,
          description: task.description,
          status: "pending",
          priority: task.priority,
          input: task.input,
          source_module: task.source_module,
          target_module: task.target_module,
          requires_approval: task.requires_approval,
        });
      } catch (err) {
        console.error("[EventBus] Failed to save task:", err);
      }
    }

    return allTasks;
  }
}

// Singleton
export const eventBus = new AgentEventBus();
