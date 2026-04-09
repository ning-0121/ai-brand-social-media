import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const liveStreamScriptSkill: ContentSkill = {
  id: "live_stream_script",
  name: "直播脚本",
  category: "video",
  description: "生成电商直播脚本（开场、产品讲解、互动、逼单、收尾）",
  icon: "Video",
  color: "rose",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 35,
  agents: ["content_producer"],
  inputs: [
    { key: "products", label: "直播商品", type: "products", required: true },
    { key: "duration", label: "直播时长", type: "select", default: "60min", options: [
      { value: "30min", label: "30 分钟" },
      { value: "60min", label: "1 小时" },
      { value: "120min", label: "2 小时" },
    ]},
    { key: "style", label: "直播风格", type: "select", default: "selling", options: [
      { value: "selling", label: "卖货型（强转化）" },
      { value: "sharing", label: "分享型（种草）" },
      { value: "tutorial", label: "教程型（教学）" },
      { value: "launch", label: "新品发布" },
    ]},
    { key: "platform", label: "直播平台", type: "platform", default: "tiktok" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const products = input.products || [];
    const duration = (input.duration as string) || "60min";
    const style = (input.style as string) || "selling";
    const platform = (input.platform as string) || "tiktok";

    const productList = products.map((p) => `${p.name} ($${p.price || "?"})`).join("; ");

    const output = await callLLM(
      `You are a top live streaming script writer for e-commerce. Generate a structured, time-coded live streaming script.

Return JSON:
{
  "title": "直播标题",
  "thumbnail_text": "封面文案",
  "total_duration": "${duration}",
  "script_sections": [
    {
      "time": "0:00-5:00",
      "phase": "开场暖场",
      "actions": ["具体动作 1", "动作 2"],
      "talking_points": ["话术 1", "话术 2"],
      "screen_overlay": "屏幕文字/贴纸建议",
      "interaction": "互动策略（点赞/评论引导）"
    }
  ],
  "product_order": [{"name": "商品名", "time_slot": "时间段", "price_reveal_tactic": "价格策略"}],
  "closing_tactics": ["逼单策略 1", "策略 2"],
  "equipment_checklist": ["设备 1", "设备 2"],
  "common_qa": [{"q": "观众常见问题", "a": "建议回答"}]
}`,
      `Products: ${productList || "fashion collection"}
Duration: ${duration}
Style: ${style}
Platform: ${platform}

Create a ${style} style live script for ${platform}. ${duration} total. Include time codes, specific talking points (not vague), and interaction triggers every 3-5 minutes.`,
      4000
    );

    return {
      skill_id: "live_stream_script",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
