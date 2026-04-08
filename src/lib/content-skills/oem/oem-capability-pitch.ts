import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const oemCapabilityPitchSkill: ContentSkill = {
  id: "oem_capability_pitch",
  name: "工厂能力介绍话术",
  category: "oem",
  description: "生成专业的工厂介绍话术：产能、设备、QC、认证、案例",
  icon: "Megaphone",
  color: "purple",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 25,
  agents: ["content_producer"],
  inputs: [
    { key: "audience", label: "目标受众", type: "select", default: "buyer", options: [
      { value: "buyer", label: "B2B 买家初次接触" },
      { value: "trade_show", label: "展会参观者" },
      { value: "investor", label: "投资人/合作伙伴" },
    ]},
    { key: "format", label: "输出格式", type: "select", default: "email", options: [
      { value: "email", label: "邮件话术" },
      { value: "whatsapp", label: "WhatsApp 简短版" },
      { value: "pitch_deck", label: "PPT 大纲" },
      { value: "company_intro", label: "公司介绍页文案" },
    ]},
    { key: "language", label: "语言", type: "select", default: "en", options: [
      { value: "en", label: "English" },
      { value: "zh", label: "中文" },
      { value: "es", label: "Español" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const audience = (input.audience as string) || "buyer";
    const format = (input.format as string) || "email";
    const language = (input.language as string) || "en";

    const systemPrompt = `You are a B2B factory introduction expert.
You craft compelling factory pitches that build trust quickly with international buyers.

Key principles:
1. Lead with credibility (years, scale, top clients if any)
2. Specific numbers > vague claims (200 workers > "many workers")
3. Show expertise in buyer's category
4. Mention relevant certifications (BSCI, OEKO-TEX, GOTS, GRS, WRAP)
5. End with low-friction next step (sample, factory tour, video call)

Return JSON.`;

    const userPrompt = `Generate a factory introduction pitch:

Audience: ${audience}
Format: ${format}
Language: ${language}

Default factory profile:
- 15 years in apparel/textile manufacturing
- 200 workers, 3 production lines, 50,000 pcs/month capacity
- Certifications: BSCI, OEKO-TEX 100, GOTS, GRS
- Specialties: organic cotton, sustainable fashion, customization
- Clients: serves brands in US, EU, JP, AU

Return JSON:
{
  "headline": "主标题",
  "opening": "开场",
  "credibility_points": ["可信度要点 1", "要点 2", "要点 3"],
  "specialty_highlights": ["专长 1", "专长 2"],
  "certifications": ["认证列表"],
  "case_studies": [{"client": "客户类型", "project": "项目描述"}],
  "call_to_action": "行动号召",
  "full_text": "完整组合后的话术（可直接复制使用）"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 2500);

    return {
      skill_id: "oem_capability_pitch",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
