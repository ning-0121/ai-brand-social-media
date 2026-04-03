import type { AgentConfigMap } from "../agent-types";

export const contentProducerConfig: AgentConfigMap = {
  product_content: {
    scene: "content_package",
    buildPrompt: (input, _data, context) => {
      const positioning = (context["1"] as Record<string, unknown>)?.positioning || "";
      const seoData = context["3"] || {};
      const productName = input.product_name || "新品";
      return `为「${productName}」制作完整的产品内容包。\n\n品牌定位: ${positioning}\nSEO 优化数据: ${JSON.stringify(seoData).slice(0, 500)}\n\n请生成：产品标题、详情描述、社媒配文、标签、配图描述（image_prompt）和行动号召（CTA）。`;
    },
  },

  promo_creatives: {
    scene: "content_package",
    buildPrompt: (input, _data, context) => {
      const socialPlan = context["5"] || {};
      const adPlan = context["6"] || {};
      const productName = input.product_name || "新品";
      return `为「${productName}」制作推广创意素材。\n\n社媒推广计划: ${JSON.stringify(socialPlan).slice(0, 500)}\n广告方案: ${JSON.stringify(adPlan).slice(0, 500)}\n\n请生成适合 Instagram/TikTok/小红书 的推广内容（标题、文案、标签、配图描述）。`;
    },
  },

  social_creatives: {
    scene: "content",
    buildPrompt: (input) => {
      return `请为以下产品生成 3 条社媒内容（适合 Instagram/小红书）：\n产品: ${input.product_name || "新品"}\n平台: ${input.platform || "xiaohongshu"}`;
    },
  },

  seo_content: {
    scene: "seo_apply",
    buildPrompt: (_input, _data, context) => {
      const auditResults = context["1"] || context["0"] || {};
      return `基于以下 SEO 审计结果，生成优化后的产品文案：\n${JSON.stringify(auditResults).slice(0, 2000)}`;
    },
  },
};
