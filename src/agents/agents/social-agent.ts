import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class SocialAgent extends BaseAgent {
  readonly id = "social" as const;
  readonly name = "社媒运营 Agent";
  readonly description = "自动生成发布计划、安排发布时间、识别爆款内容、管理发布队列";
  readonly capabilities: AgentCapability[] = [
    { task_type: "schedule_post", name: "排期发帖", description: "生成并排期社媒帖子", auto_executable: true, skill_id: "social_post_pack", estimated_duration_seconds: 30 },
    { task_type: "content_calendar", name: "内容日历", description: "生成 30 天发布计划", auto_executable: true, skill_id: "content_calendar", estimated_duration_seconds: 45 },
    { task_type: "hashtag_strategy", name: "Hashtag 策略", description: "生成三层标签策略", auto_executable: true, skill_id: "hashtag_strategy", estimated_duration_seconds: 15 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: queued } = await supabase.from("scheduled_posts").select("id").eq("status", "queued");
    const { data: accounts } = await supabase.from("social_accounts").select("id").eq("connected", true);

    const tasks: AnalysisResult["suggested_tasks"] = [];

    if ((queued?.length || 0) < 3) {
      tasks.push({
        task_type: "schedule_post",
        title: "排期不足，需要补充社媒内容",
        description: `当前排队中只有 ${queued?.length || 0} 条帖子，建议补充`,
        priority: "high",
        input: { platform: "instagram" },
        requires_approval: false,
        target_module: "social",
      });
    }

    return {
      suggested_tasks: tasks,
      summary: `排队 ${queued?.length || 0} 条，已连接 ${accounts?.length || 0} 个账号`,
      health_score: Math.min(100, (queued?.length || 0) * 20 + (accounts?.length || 0) * 30),
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    const skillId = this.getSkillId(task.task_type);
    if (!skillId) return { ...task, status: "failed", error: "Unknown task type" };

    const { result } = await executeSkill(skillId, task.input, { sourceModule: "social-agent" });
    return { ...task, status: "completed", output: result.output as Record<string, unknown> };
  }

  async onEvent(event: AgentEvent): Promise<AgentTask[]> {
    if (event.type === "social_post.completed") {
      // Content generated → add to publish queue
      return []; // publishing handled by social-publisher
    }
    return [];
  }
}
