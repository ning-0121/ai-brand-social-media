import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillContext, SkillResult } from "../types";

export const socialPostPackSkill: ContentSkill = {
  id: "social_post_pack",
  name: "社媒爆款帖子包",
  category: "social",
  description: "生成 3 条不同角度的帖子（种草、场景、证言）+ 配图 prompt + hashtag",
  icon: "Sparkles",
  color: "pink",
  estimated_cost: { text: 0.02, image: 0.12 },
  estimated_time_seconds: 60,
  requires_image: true,
  agents: ["content_producer", "social_strategist"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "platform", label: "目标平台", type: "platform", required: true, default: "xiaohongshu" },
  ],
  async execute(input: SkillInputData, context?: SkillContext): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const platform = (input.platform as string) || "xiaohongshu";
    const tone = context?.brand_tone || "";

    const platformGuide: Record<string, string> = {
      xiaohongshu: `小红书种草笔记规则：
- 标题：emoji + 钩子词 + 核心卖点（如：💛真的会回购！这款XX绝了）
- 正文：分段、每段 emoji 开头、口语化、有真实感
- 结尾：CTA + 邀请互动
- hashtag：3-5 个核心词 + 5-8 个长尾词`,
      instagram: `Instagram 帖子规则：
- 文案简短有力（前 125 字符是关键，会直接显示）
- 视觉优先，文案是补充
- 3-5 个核心 hashtag + 20-30 个长尾 hashtag
- CTA 简单直接`,
      tiktok: `TikTok 文案规则：
- 前 3 秒钩子（用悬念、反差、痛点）
- 简短有力，营造情绪
- 3-5 个高流量 hashtag
- CTA 引导评论或点赞`,
    };

    const systemPrompt = `你是顶级社媒运营专家，精通各平台算法和用户心理。
${platformGuide[platform] || platformGuide.xiaohongshu}

你的内容有以下特点：
1. 真实感强，不像广告
2. 痛点直击，价值明确
3. 节奏感好，引发互动
4. hashtag 策略科学

返回 JSON。`;

    const userPrompt = `为以下商品生成 3 条不同角度的 ${platform} 帖子：

商品：${product.name}
描述：${(product.body_html || product.description || "").slice(0, 300)}
价格：${product.price || "未知"}
${tone ? `品牌调性：${tone}` : ""}

3 个角度：
1. 产品种草角度（强调卖点和价值）
2. 场景使用角度（具体使用场景和体验）
3. 用户证言角度（第一人称真实体验）

请生成 JSON：
{
  "platform": "${platform}",
  "posts": [
    {
      "angle": "种草",
      "title": "帖子标题",
      "body": "正文内容",
      "image_prompt": "配图 AI prompt（英文，详细）",
      "hashtags": ["#标签1", "#标签2"],
      "cta": "CTA 文案"
    },
    {
      "angle": "场景",
      "title": "帖子标题",
      "body": "正文内容",
      "image_prompt": "配图 AI prompt",
      "hashtags": ["#标签1", "#标签2"],
      "cta": "CTA 文案"
    },
    {
      "angle": "证言",
      "title": "帖子标题",
      "body": "正文内容",
      "image_prompt": "配图 AI prompt",
      "hashtags": ["#标签1", "#标签2"],
      "cta": "CTA 文案"
    }
  ]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3500);

    return {
      skill_id: "social_post_pack",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0.12 },
    };
  },
};
