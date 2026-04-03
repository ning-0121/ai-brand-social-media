import type { AgentConfigMap } from "../agent-types";

export const marketResearcherConfig: AgentConfigMap = {
  competitor_research: {
    scene: "competitor_search",
    buildPrompt: (input) => {
      const category = input.category || "服饰时尚";
      const platform = input.platform || "shopify";
      return `品类: ${category}\n平台: ${platform}\n请搜索该品类在该平台上的主要竞争品牌/店铺，包括粉丝量、互动率、增长趋势和竞品特点。`;
    },
  },

  trend_search: {
    scene: "trend_search",
    buildPrompt: (input) => {
      const category = input.category || "服饰时尚";
      const platform = input.platform || "amazon";
      return `品类: ${category}\n平台: ${platform}\n请搜索该品类当前的热门商品趋势。`;
    },
  },

  trend_analysis: {
    scene: "trend_analysis",
    buildPrompt: (_input, _data, context) => {
      const trendData = context["0"] || {};
      return `基于以下市场数据进行深度趋势分析：\n${JSON.stringify(trendData).slice(0, 2000)}\n请找出市场机会和风险。`;
    },
  },
};
