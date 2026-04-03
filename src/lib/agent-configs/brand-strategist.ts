import type { AgentConfigMap } from "../agent-types";

export const brandStrategistConfig: AgentConfigMap = {
  positioning: {
    scene: "brand_analysis",
    buildPrompt: (input, _data, context) => {
      const competitors = context["0"] || {};
      const productName = input.product_name || "新品";
      const category = input.category || "服饰时尚";
      return `产品: ${productName}\n品类: ${category}\n\n竞品调研数据：${JSON.stringify(competitors).slice(0, 1000)}\n\n请分析产品定位，包括目标用户、核心价值、差异化优势和品牌调性建议。`;
    },
  },

  persona_research: {
    scene: "persona_generation",
    buildPrompt: (input) => {
      return `品牌品类: ${input.category || "服饰时尚"}\n目标市场: ${input.market || "全球"}\n请生成 3 个目标用户画像。`;
    },
  },

  tone_definition: {
    scene: "brand_tone",
    buildPrompt: (input) => {
      return `品牌品类: ${input.category || "服饰时尚"}\n品牌定位: ${input.positioning || ""}\n请生成品牌调性指南。`;
    },
  },
};
