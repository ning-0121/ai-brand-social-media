import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adPerformanceOptimizerSkill: ContentSkill = {
  id: "ad_performance_optimizer",
  name: "广告效果优化大师",
  category: "copy",
  description: "分析在投广告的数据，找出问题，给出具体优化方案（创意/受众/出价/时段）",
  icon: "TrendingUp",
  color: "green",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 30,
  agents: ["ad_manager"],
  inputs: [
    { key: "campaign_id", label: "广告计划 ID（可选）", type: "text", placeholder: "留空则分析全部在投广告" },
    { key: "roi_target", label: "目标 ROAS", type: "text", default: "3", placeholder: "如：3 表示 1 块钱广告费赚 3 块" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const campaignId = input.campaign_id as string;
    const roiTarget = parseFloat((input.roi_target as string) || "3");

    let campaigns;
    if (campaignId) {
      const { data } = await supabase.from("ad_campaigns").select("*").eq("id", campaignId);
      campaigns = data;
    } else {
      const { data } = await supabase.from("ad_campaigns").select("*").in("status", ["active", "paused"]);
      campaigns = data;
    }

    const { data: creatives } = await supabase.from("ad_creatives").select("*");

    const output = await callLLM(
      `You are a performance marketing expert with $10M+ in ad spend experience.
Analyze the campaign data and provide SPECIFIC, ACTIONABLE optimization recommendations.
Focus on ROI — the target ROAS is ${roiTarget}x.

Be brutally honest. If a campaign is burning money, say so. If creative is weak, explain why.

Return JSON.`,
      `Target ROAS: ${roiTarget}x

Active campaigns:
${JSON.stringify(campaigns || []).slice(0, 2000)}

Ad creatives:
${JSON.stringify(creatives || []).slice(0, 1000)}

Return JSON:
{
  "overall_assessment": "整体评估",
  "total_spend": 总花费,
  "total_revenue": 总收入,
  "current_roas": 当前ROAS,
  "campaign_analysis": [
    {
      "campaign_name": "计划名",
      "status": "healthy/warning/critical",
      "roas": 当前ROAS,
      "issues": ["问题1", "问题2"],
      "optimizations": [
        {"action": "具体操作", "expected_impact": "预期效果", "priority": "high/medium/low"}
      ],
      "should_pause": true/false,
      "budget_recommendation": "预算建议"
    }
  ],
  "creative_recommendations": ["创意优化建议"],
  "audience_recommendations": ["受众优化建议"],
  "budget_reallocation": {"from": "差的计划", "to": "好的计划", "amount": "$X"},
  "next_7_day_plan": "未来 7 天具体执行计划"
}`,
      3500
    );

    return {
      skill_id: "ad_performance_optimizer",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
