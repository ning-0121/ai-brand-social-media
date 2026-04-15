import { getCampaigns, getKeywordIdeas, getAdPerformance } from "../../google-ads-api";
import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const googleAdsManagerSkill: ContentSkill = {
  id: "google_ads_manager",
  name: "Google Ads 管理",
  category: "copy",
  description: "分析 Google Ads 表现 + 关键词研究 + 优化建议",
  icon: "Megaphone",
  color: "blue",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["ad_manager"],
  inputs: [
    { key: "action", label: "操作", type: "select", required: true, default: "analyze", options: [
      { value: "analyze", label: "分析当前广告表现" },
      { value: "keywords", label: "关键词研究" },
    ]},
    { key: "keywords", label: "关键词（逗号分隔，仅关键词研究需要）", type: "text", placeholder: "如：women activewear, yoga pants, tennis skort" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const action = (input.action as string) || "analyze";

    if (action === "keywords") {
      const kws = ((input.keywords as string) || "women activewear").split(",").map(k => k.trim());
      const ideas = await getKeywordIdeas(kws, "https://jojofeifei.com");

      const analysis = await callLLM(
        "你是 Google Ads 投手。分析这些关键词数据，推荐最值得投放的 5 个词，说明理由（搜索量、竞争度、预估 CPC）。直接列出，不要废话。",
        `关键词研究结果: ${JSON.stringify(ideas.slice(0, 20))}
品牌: JOJOFEIFEI（女性运动服饰，$49-$98）
返回纯文本。`,
        500
      );

      return {
        skill_id: "google_ads_manager",
        output: { action: "keywords", ideas: ideas.slice(0, 20), analysis: typeof analysis === "string" ? analysis : (analysis as Record<string, unknown>).raw_text || "" },
        generated_at: new Date().toISOString(),
        estimated_cost: { text: 0.01, image: 0 },
      };
    }

    // 分析广告表现
    const [campaigns, ads] = await Promise.all([getCampaigns(), getAdPerformance()]);

    const analysis = await callLLM(
      "你是 Google Ads 操盘手。分析广告数据，说明：1）哪个 campaign 效果最好 2）哪个该停 3）下一步怎么优化。直接说。",
      `Campaigns: ${JSON.stringify(campaigns.slice(0, 10))}
Ads: ${JSON.stringify(ads.slice(0, 10))}
如果没有数据说明还没投放，建议第一步怎么开始。
返回纯文本。`,
      500
    );

    return {
      skill_id: "google_ads_manager",
      output: { action: "analyze", campaigns, ads: ads.slice(0, 10), analysis: typeof analysis === "string" ? analysis : (analysis as Record<string, unknown>).raw_text || "" },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
