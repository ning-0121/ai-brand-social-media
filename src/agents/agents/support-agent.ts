import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class SupportAgent extends BaseAgent {
  readonly id = "support" as const;
  readonly name = "客服 Agent";
  readonly description = "自动回复客户消息、识别紧急问题、标记高价值客户";
  readonly capabilities: AgentCapability[] = [
    { task_type: "auto_reply_d2c", name: "D2C 客服回复", description: "自动回复网站/Chat 客户", auto_executable: true, skill_id: "d2c_customer_reply", estimated_duration_seconds: 20 },
    { task_type: "auto_reply_oem", name: "OEM 询盘回复", description: "自动回复 WhatsApp/邮件询盘", auto_executable: true, skill_id: "oem_inquiry_reply", estimated_duration_seconds: 20 },
    { task_type: "urgent_escalation", name: "紧急升级", description: "识别需要人工介入的对话", auto_executable: true, estimated_duration_seconds: 5 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: unreplied } = await supabase.from("whatsapp_conversations")
      .select("id, display_name, unread_count, channel, business_type")
      .gt("unread_count", 0).eq("status", "active");

    const tasks: AnalysisResult["suggested_tasks"] = [];

    for (const conv of (unreplied || []).slice(0, 5)) {
      tasks.push({
        task_type: conv.business_type === "oem" ? "auto_reply_oem" : "auto_reply_d2c",
        title: `回复 ${conv.display_name || "未知"} (${conv.unread_count} 条未读)`,
        description: `${conv.channel} 渠道，${conv.business_type} 客户`,
        priority: conv.unread_count > 3 ? "high" : "medium",
        input: { conversation_id: conv.id, business_type: conv.business_type },
        requires_approval: false,
      });
    }

    return {
      suggested_tasks: tasks,
      summary: `${unreplied?.length || 0} 个对话待回复`,
      health_score: (unreplied?.length || 0) === 0 ? 100 : Math.max(0, 100 - (unreplied?.length || 0) * 15),
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    if (task.task_type === "urgent_escalation") {
      return { ...task, status: "completed", output: { escalated: true } };
    }

    const skillId = this.getSkillId(task.task_type);
    if (!skillId) return { ...task, status: "failed", error: "Unknown task type" };

    const { result } = await executeSkill(skillId, task.input, { sourceModule: "support-agent" });
    return { ...task, status: "completed", output: result.output as Record<string, unknown> };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e;
    return [];
  }
}
