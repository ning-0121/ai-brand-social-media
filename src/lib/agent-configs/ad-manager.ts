import type { AgentConfigMap } from "../agent-types";

export const adManagerConfig: AgentConfigMap = {
  ad_campaign: {
    scene: "ad_copy",
    buildPrompt: (input, _data, context) => {
      const positioning = (context["1"] as Record<string, unknown>)?.positioning || "";
      const productName = input.product_name || "新品";
      const platform = input.platform || "Instagram/TikTok";
      return `产品: ${productName}\n品牌定位: ${positioning}\n广告平台: ${platform}\n\n请生成 3 组不同角度的广告文案（标题+正文+CTA），适合 ${platform} 投放。`;
    },
  },

  ad_optimize: {
    scene: "ad_optimization",
    buildPrompt: (input) => {
      return `当前广告数据：\n${JSON.stringify(input, null, 2).slice(0, 2000)}\n请分析广告表现并给出优化建议。`;
    },
  },
};
