import { analyzeCompetitorPricing, analyzeProfitMargins, generateMarketingCalendar, generateRestockRecommendations, generateInfluencerStrategy } from "../../market-intelligence";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const competitorPricingSkill: ContentSkill = {
  id: "competitor_pricing",
  name: "竞品定价分析",
  category: "copy",
  description: "分析竞品价格策略，给出定价建议和市场定位",
  icon: "TrendingUp",
  color: "blue",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 10,
  agents: ["market_researcher"],
  inputs: [
    { key: "competitors", label: "竞品品牌（逗号分隔）", type: "text", placeholder: "如 Alo Yoga, Gymshark, Fabletics" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const competitors = ((input.competitors as string) || "Alo Yoga, Gymshark, Fabletics").split(",").map(s => s.trim());
    const result = await analyzeCompetitorPricing(competitors);
    return { skill_id: "competitor_pricing", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};

export const profitAnalysisSkill: ContentSkill = {
  id: "profit_analysis",
  name: "利润率分析",
  category: "copy",
  description: "分析每个产品的预估成本、毛利率和广告预算空间",
  icon: "TrendingUp",
  color: "green",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 10,
  agents: ["data_analyst"],
  inputs: [],
  async execute(): Promise<SkillResult> {
    const result = await analyzeProfitMargins();
    return { skill_id: "profit_analysis", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};

export const marketingCalendarSkill: ContentSkill = {
  id: "marketing_calendar",
  name: "营销日历策划",
  category: "copy",
  description: "生成未来 3 个月营销日历 — 节日、大促、季节性活动策划",
  icon: "Calendar",
  color: "amber",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 12,
  agents: ["brand_strategist"],
  inputs: [
    { key: "months", label: "规划月数", type: "select", default: "3", options: [
      { value: "1", label: "1 个月" },
      { value: "3", label: "3 个月" },
      { value: "6", label: "6 个月" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const months = parseInt(input.months as string) || 3;
    const result = await generateMarketingCalendar(months);
    return { skill_id: "marketing_calendar", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};

export const restockPlannerSkill: ContentSkill = {
  id: "restock_planner",
  name: "备货建议",
  category: "copy",
  description: "分析库存状况，给出补货优先级和促销清仓建议",
  icon: "TrendingUp",
  color: "orange",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 8,
  agents: ["store_optimizer"],
  inputs: [],
  async execute(): Promise<SkillResult> {
    const result = await generateRestockRecommendations();
    return { skill_id: "restock_planner", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.01, image: 0 } };
  },
};

export const influencerStrategySkill: ContentSkill = {
  id: "influencer_strategy",
  name: "达人合作策略",
  category: "copy",
  description: "制定 KOL 合作方案 — 分层策略、预算分配、外联话术",
  icon: "Users",
  color: "pink",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 12,
  agents: ["social_strategist"],
  inputs: [],
  async execute(): Promise<SkillResult> {
    const result = await generateInfluencerStrategy();
    return { skill_id: "influencer_strategy", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
