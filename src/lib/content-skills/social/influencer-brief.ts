import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const influencerBriefSkill: ContentSkill = {
  id: "influencer_brief",
  name: "达人合作 Brief",
  category: "social",
  description: "为达人合作生成拍摄要求、文案建议、卖点和视频结构",
  icon: "Users",
  color: "orange",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["social_strategist", "content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "influencer_type", label: "达人类型", type: "select", default: "micro", options: [
      { value: "nano", label: "纳米达人 (1k-10k)" },
      { value: "micro", label: "微型达人 (10k-100k)" },
      { value: "macro", label: "中型达人 (100k-1M)" },
      { value: "mega", label: "大型达人 (1M+)" },
    ]},
    { key: "platform", label: "目标平台", type: "platform", required: true, default: "instagram" },
    { key: "content_type", label: "内容形式", type: "select", default: "review", options: [
      { value: "review", label: "测评" },
      { value: "haul", label: "开箱" },
      { value: "tutorial", label: "教程" },
      { value: "lifestyle", label: "生活方式植入" },
      { value: "before_after", label: "前后对比" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const influencerType = (input.influencer_type as string) || "micro";
    const platform = (input.platform as string) || "instagram";
    const contentType = (input.content_type as string) || "review";

    const systemPrompt = `你是顶级达人营销专家，曾管理过上百个达人合作项目。
你的 brief 有这些特点：
1. 明确不可妥协项（必须的卖点、品牌声明、CTA）
2. 给达人创作空间（不限制太死）
3. 拍摄要求具体可执行
4. 数据指标清晰

返回 JSON。`;

    const userPrompt = `为以下达人合作生成 brief：

商品：${product.name}
描述：${(product.body_html || product.description || "").slice(0, 200)}
价格：${product.price || "未知"}
达人类型：${influencerType}
目标平台：${platform}
内容形式：${contentType}

请生成 JSON：
{
  "brief_title": "Brief 标题",
  "campaign_overview": "项目概述",
  "product_facts": {
    "name": "商品名",
    "key_benefits": ["核心卖点1", "卖点2", "卖点3"],
    "differentiators": ["差异化点1", "差异化点2"],
    "target_pain_points": ["痛点1", "痛点2"]
  },
  "must_includes": [
    "必须提到的卖点",
    "必须使用的话术",
    "必须的画面元素"
  ],
  "must_avoid": [
    "禁止的话术",
    "禁止的内容"
  ],
  "creative_direction": {
    "tone": "调性",
    "visual_style": "视觉风格",
    "emotional_arc": "情感曲线"
  },
  "shooting_requirements": {
    "duration": "时长建议",
    "shots_needed": ["镜头1", "镜头2", "镜头3"],
    "lighting": "灯光要求",
    "props": ["道具1", "道具2"]
  },
  "script_outline": {
    "hook": "开头钩子建议",
    "body": "中间内容建议",
    "cta": "结尾 CTA"
  },
  "deliverables": [
    {"type": "成品类型", "quantity": "数量", "format": "格式"}
  ],
  "kpis": ["KPI1", "KPI2"],
  "compensation_note": "报酬说明（仅作参考）"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3500);

    return {
      skill_id: "influencer_brief",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
