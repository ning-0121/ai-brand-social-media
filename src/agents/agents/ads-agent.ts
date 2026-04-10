import { BaseAgent } from "../base-agent";
import { supabase } from "@/lib/supabase";
import { executeSkill } from "@/lib/content-skills/executor";
import type { AgentTask, AgentEvent, AgentCapability, AnalysisResult } from "../types";

export class AdsAgent extends BaseAgent {
  readonly id = "ads" as const;
  readonly name = "广告投放 Agent";
  readonly description = "监控广告 ROI、自动暂停亏损广告、生成创意、优化预算";
  readonly capabilities: AgentCapability[] = [
    { task_type: "roi_check", name: "ROI 巡检", description: "检查所有广告 ROI，预警亏损", auto_executable: true, skill_id: "ad_roi_guardian", estimated_duration_seconds: 20 },
    { task_type: "creative_gen", name: "创意生成", description: "批量生成 A/B 测试创意", auto_executable: false, skill_id: "ad_creative_generator", estimated_duration_seconds: 30 },
    { task_type: "budget_optimize", name: "预算优化", description: "优化预算分配", auto_executable: false, skill_id: "ad_budget_planner", estimated_duration_seconds: 25 },
    { task_type: "pause_campaign", name: "暂停广告", description: "暂停亏损广告", auto_executable: true, estimated_duration_seconds: 5 },
  ];

  async analyze(): Promise<AnalysisResult> {
    const { data: campaigns } = await supabase.from("ad_campaigns").select("*").eq("status", "active");

    const tasks: AnalysisResult["suggested_tasks"] = [];

    for (const c of campaigns || []) {
      const roas = c.spend > 0 ? c.revenue / c.spend : 0;

      if (c.spend > 50 && roas < 1) {
        tasks.push({
          task_type: "pause_campaign",
          title: `暂停亏损广告: ${c.name} (ROAS ${roas.toFixed(1)}x)`,
          description: `花费 $${c.spend}，收入 $${c.revenue}，ROAS 低于红线`,
          priority: "critical",
          input: { campaign_id: c.id, campaign_name: c.name, roas },
          requires_approval: true, // 暂停广告需要审批
        });
      } else if (c.spend > 100 && roas > 5) {
        tasks.push({
          task_type: "budget_optimize",
          title: `放量高 ROI 广告: ${c.name} (ROAS ${roas.toFixed(1)}x)`,
          description: `表现优异，建议增加 20-50% 预算`,
          priority: "medium",
          input: { campaign_id: c.id, campaign_name: c.name, roas },
          requires_approval: true,
        });
      }
    }

    const totalSpend = (campaigns || []).reduce((s, c) => s + Number(c.spend || 0), 0);
    const totalRevenue = (campaigns || []).reduce((s, c) => s + Number(c.revenue || 0), 0);
    const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

    return {
      suggested_tasks: tasks,
      summary: `${campaigns?.length || 0} 个在投广告，总 ROAS ${overallRoas.toFixed(1)}x`,
      health_score: overallRoas >= 3 ? 90 : overallRoas >= 1.5 ? 60 : overallRoas >= 1 ? 30 : 10,
    };
  }

  async execute(task: AgentTask): Promise<AgentTask> {
    if (task.task_type === "pause_campaign") {
      const campaignId = task.input.campaign_id as string;
      if (campaignId) {
        await supabase.from("ad_campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", campaignId);
      }
      return { ...task, status: "completed", output: { paused: true }, execution_result: { action: "campaign_paused" } };
    }

    const skillId = this.getSkillId(task.task_type);
    if (!skillId) return { ...task, status: "failed", error: "Unknown task type" };

    const { result } = await executeSkill(skillId, task.input, { sourceModule: "ads-agent" });
    return { ...task, status: "completed", output: result.output as Record<string, unknown> };
  }

  async onEvent(_e: AgentEvent): Promise<AgentTask[]> { void _e;
    return [];
  }
}
