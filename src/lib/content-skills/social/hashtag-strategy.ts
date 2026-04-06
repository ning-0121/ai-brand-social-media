import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const hashtagStrategySkill: ContentSkill = {
  id: "hashtag_strategy",
  name: "Hashtag 策略",
  category: "social",
  description: "生成核心 + 长尾 + 趋势三层 hashtag 策略",
  icon: "Hash",
  color: "violet",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["social_strategist"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "platform", label: "目标平台", type: "platform", required: true, default: "instagram" },
    { key: "audience", label: "目标人群（可选）", type: "text", placeholder: "如：25-35 岁女性" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const platform = (input.platform as string) || "instagram";
    const audience = (input.audience as string) || "";

    const systemPrompt = `你是顶级社媒 hashtag 策略专家，深谙各平台的标签算法。
hashtag 三层策略：
1. **核心标签 (3-5个)**：高搜索量，竞争激烈，用于品类定位
2. **长尾标签 (5-10个)**：中等搜索量，竞争适中，转化率高
3. **趋势标签 (3-5个)**：当下热门，借势流量
4. **品牌/个性标签 (2-3个)**：品牌专属，建立社群

返回 JSON。`;

    const userPrompt = `为以下商品生成 ${platform} hashtag 策略：

商品：${product.name}
品类：${product.category || "未知"}
${audience ? `目标人群：${audience}` : ""}

请生成 JSON：
{
  "platform": "${platform}",
  "core_hashtags": [
    {"tag": "#tag", "estimated_volume": "搜索量级", "rationale": "选择理由"}
  ],
  "long_tail_hashtags": [
    {"tag": "#tag", "estimated_volume": "搜索量级", "rationale": "选择理由"}
  ],
  "trending_hashtags": [
    {"tag": "#tag", "trend_reason": "为什么流行"}
  ],
  "brand_hashtags": [
    {"tag": "#tag", "purpose": "用途"}
  ],
  "usage_tips": [
    "使用建议1",
    "使用建议2"
  ],
  "avoid": ["要避免的标签1", "要避免的标签2"]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2000);

    return {
      skill_id: "hashtag_strategy",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
