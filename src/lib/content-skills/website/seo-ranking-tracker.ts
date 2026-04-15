import { getTopQueries, findQuickWins, getTopPages } from "../../google-search-console";
import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const seoRankingTrackerSkill: ContentSkill = {
  id: "seo_ranking_tracker",
  name: "SEO 排名追踪",
  category: "website",
  description: "追踪 Google 搜索关键词排名，发现快赢优化机会",
  icon: "TrendingUp",
  color: "green",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 10,
  agents: ["store_optimizer"],
  inputs: [
    { key: "days", label: "分析天数", type: "select", default: "28", options: [
      { value: "7", label: "最近 7 天" },
      { value: "28", label: "最近 28 天" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const days = parseInt(input.days as string) || 28;

    const [topQueries, quickWins, topPages] = await Promise.all([
      getTopQueries(days, 20),
      findQuickWins(days),
      getTopPages(days, 10),
    ]);

    // AI 诊断
    const diagnosis = await callLLM(
      "你是 SEO 操盘手。分析 Google Search Console 数据，用 3 句话说明：1）最有价值的关键词 2）最大的优化机会 3）下一步具体做什么。直接说，不要废话。",
      `Top 搜索词: ${JSON.stringify(topQueries.slice(0, 10).map(r => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position) })))}
快赢机会（排名 4-20，可冲首页）: ${JSON.stringify(quickWins.slice(0, 5))}
Top 页面: ${JSON.stringify(topPages.slice(0, 5).map(r => ({ page: r.keys[0], clicks: r.clicks })))}
返回纯文本。`,
      500
    );

    return {
      skill_id: "seo_ranking_tracker",
      output: {
        top_queries: topQueries.slice(0, 20),
        quick_wins: quickWins,
        top_pages: topPages.slice(0, 10),
        diagnosis: typeof diagnosis === "string" ? diagnosis : (diagnosis as Record<string, unknown>).raw_text || "暂无数据",
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
