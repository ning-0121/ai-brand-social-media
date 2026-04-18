import { callLLM } from "../llm";
import { tryRunPrompt } from "../../prompts";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const ugcResponseSkill: ContentSkill = {
  id: "ugc_response",
  name: "UGC 回应模板",
  category: "social",
  description: "为用户评论/帖子生成回复、合作邀请和二次传播策略",
  icon: "MessageSquare",
  color: "rose",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["social_strategist"],
  inputs: [
    { key: "ugc_content", label: "用户内容", type: "textarea", required: true, placeholder: "粘贴用户评论或帖子内容" },
    { key: "sentiment", label: "情绪倾向", type: "select", default: "positive", options: [
      { value: "positive", label: "正面" },
      { value: "neutral", label: "中性" },
      { value: "negative", label: "负面" },
      { value: "question", label: "提问" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const ugc = (input.ugc_content as string) || "";
    const sentiment = (input.sentiment as string) || "positive";

    const dbOut = await tryRunPrompt("social.ugc.response", {
      ugc_content: ugc,
      sentiment,
    }, { source: "ugc_response" });
    if (dbOut) {
      return {
        skill_id: "ugc_response",
        output: dbOut,
        generated_at: new Date().toISOString(),
        estimated_cost: { text: 0.01, image: 0 },
      };
    }

    const systemPrompt = `你是顶级品牌社媒运营官，擅长处理 UGC（用户生成内容）。
你的回复有这些特点：
1. 真诚不模板化
2. 体现品牌温度
3. 推动二次传播
4. 处理负面评论时专业冷静

返回 JSON。`;

    const userPrompt = `分析以下用户内容并生成应对策略：

用户内容：${ugc}
情绪倾向：${sentiment}

请生成 JSON：
{
  "analysis": {
    "sentiment": "情绪分析",
    "intent": "用户意图",
    "opportunity": "营销机会"
  },
  "responses": [
    {
      "type": "公开回复",
      "text": "回复文案",
      "tone": "语气说明"
    },
    {
      "type": "私信回复",
      "text": "私信文案",
      "tone": "语气说明"
    }
  ],
  "next_actions": [
    {
      "action": "下一步动作",
      "rationale": "理由"
    }
  ],
  "ugc_amplification": {
    "should_amplify": true,
    "tactics": ["二次传播策略1", "策略2"],
    "permission_request": "授权使用话术"
  },
  "collaboration_invite": {
    "fit_score": "匹配度评分 1-10",
    "outreach_message": "合作邀请话术"
  }
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2500, "fast");

    return {
      skill_id: "ugc_response",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
