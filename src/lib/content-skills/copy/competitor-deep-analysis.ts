import { deepCompetitorScan } from "../../competitor-intel";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const competitorDeepAnalysisSkill: ContentSkill = {
  id: "competitor_deep_analysis",
  name: "竞品深度分析",
  category: "copy",
  description: "深度分析竞品的 SEO、定价、页面、广告、社媒策略，给出优化建议",
  icon: "Search",
  color: "red",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 30,
  agents: ["market_researcher"],
  inputs: [
    { key: "competitor_name", label: "竞品名称", type: "text", required: true, placeholder: "如：Gymshark, Lululemon" },
    { key: "competitor_url", label: "竞品网址（可选）", type: "text", placeholder: "https://..." },
    { key: "category", label: "品类", type: "text", default: "activewear" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const name = (input.competitor_name as string) || "";
    const url = (input.competitor_url as string) || "";
    const category = (input.category as string) || "activewear";

    const report = await deepCompetitorScan(name, url, category);

    return {
      skill_id: "competitor_deep_analysis",
      output: report as unknown as Record<string, unknown>,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
