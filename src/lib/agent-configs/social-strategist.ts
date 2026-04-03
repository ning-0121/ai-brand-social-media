import type { AgentConfigMap } from "../agent-types";

export const socialStrategistConfig: AgentConfigMap = {
  social_plan: {
    scene: "social_scheduling",
    buildPrompt: (input, _data, context) => {
      const productContent = context["4"] || {};
      const productName = input.product_name || "新品";
      return `为「${productName}」制定社媒推广计划。\n\n已有内容素材：${JSON.stringify(productContent).slice(0, 500)}\n\n请规划 Instagram、TikTok、小红书的发布排期、内容策略和最佳发布时间。`;
    },
  },

  schedule_review: {
    scene: "social_scheduling",
    buildPrompt: () => {
      return "请检查今日的社媒发布计划，给出排期优化建议。包括最佳发布时间、内容类型搭配、频率建议。";
    },
  },

  influencer_eval: {
    scene: "influencer_analysis",
    buildPrompt: (input) => {
      return `请分析以下达人与品牌的匹配度：\n${JSON.stringify(input).slice(0, 1500)}`;
    },
  },
};
