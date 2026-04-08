import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const oemFollowupMessageSkill: ContentSkill = {
  id: "oem_followup_message",
  name: "OEM 跟进话术",
  category: "oem",
  description: "为不同阶段的客户生成跟进话术（3天/7天/14天/30天）",
  icon: "Calendar",
  color: "cyan",
  estimated_cost: { text: 0.01, image: 0 },
  estimated_time_seconds: 15,
  agents: ["content_producer"],
  inputs: [
    { key: "stage", label: "客户阶段", type: "select", required: true, default: "quoted_no_reply", options: [
      { value: "quoted_no_reply", label: "已报价 3 天未回复" },
      { value: "sample_sent", label: "样品已发 7 天未反馈" },
      { value: "negotiating_stalled", label: "谈判停滞 14 天" },
      { value: "dormant_customer", label: "老客户休眠 30+ 天" },
    ]},
    { key: "context", label: "上下文备注", type: "textarea", placeholder: "任何附加信息：上次聊到什么、客户在意什么" },
    { key: "language", label: "语言", type: "select", default: "en", options: [
      { value: "en", label: "English" },
      { value: "zh", label: "中文" },
      { value: "es", label: "Español" },
      { value: "fr", label: "Français" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const stage = (input.stage as string) || "";
    const context = (input.context as string) || "";
    const language = (input.language as string) || "en";

    const systemPrompt = `You are an experienced B2B sales follow-up expert.
You craft follow-up messages that re-engage buyers without being pushy.

Principles:
1. Add value, don't just "checking in"
2. Reference previous specific points (not generic)
3. Use soft urgency (new MOQ, capacity update, certification)
4. Always offer escape route ("if not the right time, let me know")
5. Match cultural norms (US: direct, JP: humble, EU: formal)

Return JSON.`;

    const userPrompt = `Stage: ${stage}
Context: ${context || "no additional context"}
Language: ${language}

Generate a follow-up message.

Return JSON:
{
  "subject_line": "邮件标题（如适用）",
  "message": "完整消息内容",
  "tone_notes": "为什么用这个语气",
  "value_add": "你给客户带来什么新价值",
  "soft_cta": "软性 CTA",
  "escape_route": "给客户的台阶",
  "alternative_versions": [
    {"version": "更短版本", "message": "..."},
    {"version": "更直接版本", "message": "..."}
  ]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2500);

    return {
      skill_id: "oem_followup_message",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0 },
    };
  },
};
