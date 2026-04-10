import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adRoiGuardianSkill: ContentSkill = {
  id: "ad_roi_guardian",
  name: "ROI 红线守卫",
  category: "copy",
  description: "监控所有广告 ROI，低于红线自动预警，推荐暂停/优化/放量决策",
  icon: "Shield",
  color: "red",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 20,
  agents: ["ad_manager", "data_analyst"],
  inputs: [
    { key: "roi_floor", label: "ROAS 红线（低于此值预警）", type: "text", default: "1.5", placeholder: "如：1.5 表示花 1 块至少赚 1.5 块" },
    { key: "roi_target", label: "ROAS 目标（达标线）", type: "text", default: "3" },
    { key: "roi_excellent", label: "ROAS 优秀线（放量标准）", type: "text", default: "5" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const roiFloor = parseFloat((input.roi_floor as string) || "1.5");
    const roiTarget = parseFloat((input.roi_target as string) || "3");
    const roiExcellent = parseFloat((input.roi_excellent as string) || "5");

    const { data: campaigns } = await supabase.from("ad_campaigns").select("*")
      .in("status", ["active", "paused"]).order("spend", { ascending: false });

    const output = await callLLM(
      `You are an ROI guardian for e-commerce advertising. Your #1 priority is protecting the business from wasting money on ads.

ROI Standards:
- RED (kill): ROAS < ${roiFloor}x → immediate pause, no exceptions
- YELLOW (watch): ROAS ${roiFloor}x-${roiTarget}x → optimize within 48h or pause
- GREEN (maintain): ROAS ${roiTarget}x-${roiExcellent}x → maintain, test variations
- GOLD (scale): ROAS > ${roiExcellent}x → increase budget 20-50%

Be ruthless. Money-losing ads must be identified and stopped.

Return JSON.`,
      `Active/Paused campaigns:
${JSON.stringify(campaigns || []).slice(0, 2000)}

Return JSON:
{
  "overall_health": "healthy/warning/critical",
  "total_active_spend": 总日花费,
  "total_roas": 总体ROAS,
  "campaigns": [
    {
      "name": "计划名",
      "spend": 花费,
      "revenue": 收入,
      "roas": ROAS值,
      "zone": "red/yellow/green/gold",
      "action": "kill/optimize/maintain/scale",
      "specific_action": "具体执行什么",
      "deadline": "必须在什么时间前完成"
    }
  ],
  "immediate_actions": [
    {"action": "立即执行的动作", "campaign": "相关计划", "urgency": "high"}
  ],
  "budget_saved_if_actioned": "如果执行建议可节省的预算",
  "weekly_roi_forecast": "如果优化后预期周 ROI"
}`,
      2500
    );

    return {
      skill_id: "ad_roi_guardian",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
