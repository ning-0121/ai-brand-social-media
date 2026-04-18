import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const shortVideoScriptSkill: ContentSkill = {
  id: "short_video_script",
  name: "短视频脚本",
  category: "video",
  description: "生成 15s/30s/60s 短视频分镜脚本、BGM 建议、标签",
  icon: "Video",
  color: "indigo",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "platform", label: "目标平台", type: "platform", required: true, default: "tiktok" },
    { key: "duration", label: "视频时长", type: "select", default: "30s", options: [
      { value: "15s", label: "15 秒" },
      { value: "30s", label: "30 秒" },
      { value: "60s", label: "60 秒" },
    ]},
    { key: "style", label: "视频风格", type: "select", default: "engaging", options: [
      { value: "engaging", label: "强互动型" },
      { value: "demo", label: "产品演示" },
      { value: "story", label: "故事剧情" },
      { value: "tutorial", label: "教程教学" },
      { value: "ugc_style", label: "UGC 风格" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const platform = (input.platform as string) || "tiktok";
    const duration = (input.duration as string) || "30s";
    const style = (input.style as string) || "engaging";

    const systemPrompt = `你是顶级短视频编剧，曾创作过多个百万播放的短视频。
你的脚本特点：
1. 前 3 秒必须有强钩子（反差、悬念、痛点、福利）
2. 节奏快，每 3-5 秒一个新镜头
3. 视觉冲击力强
4. CTA 自然不突兀
5. 适配平台算法（TikTok 重情绪，IG Reels 重美感，小红书重真实）

返回 JSON。`;

    const userPrompt = `为以下商品生成 ${duration} 短视频脚本：

商品：${product.name}
描述：${(product.body_html || product.description || "").slice(0, 200)}
平台：${platform}
风格：${style}
时长：${duration}

请生成 JSON：
{
  "platform": "${platform}",
  "duration": "${duration}",
  "title": "视频标题",
  "hook": "前 3 秒钩子（具体台词或动作）",
  "scenes": [
    {
      "second": "0-3s",
      "visual": "画面描述",
      "voiceover": "旁白/台词",
      "text_overlay": "屏幕文字",
      "action": "动作指导"
    }
  ],
  "cta": "结尾 CTA",
  "bgm_suggestion": "BGM 风格建议",
  "props_needed": ["道具1", "道具2"],
  "shooting_tips": ["拍摄建议1", "建议2"],
  "hashtags": ["#标签1", "#标签2"],
  "caption": "视频文案"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3500, "fast");

    return {
      skill_id: "short_video_script",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
