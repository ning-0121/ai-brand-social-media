import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const contentCalendarSkill: ContentSkill = {
  id: "content_calendar",
  name: "30 天内容日历",
  category: "social",
  description: "基于商品库、季节、节日生成 30 天内容主题表",
  icon: "Calendar",
  color: "teal",
  estimated_cost: { text: 0.05, image: 0 },
  estimated_time_seconds: 45,
  agents: ["social_strategist", "content_producer"],
  inputs: [
    { key: "products", label: "商品池", type: "products", required: true },
    { key: "platforms", label: "目标平台（多选用逗号分隔）", type: "text", default: "instagram,xiaohongshu,tiktok" },
    { key: "frequency", label: "发布频率", type: "select", default: "daily", options: [
      { value: "daily", label: "每天 1 篇" },
      { value: "every2", label: "每 2 天 1 篇" },
      { value: "every3", label: "每 3 天 1 篇" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const products = input.products || [];
    const platforms = ((input.platforms as string) || "instagram,xiaohongshu").split(",").map((p) => p.trim());
    const frequency = (input.frequency as string) || "daily";

    const systemPrompt = `你是顶级社媒内容策划专家，精通内容日历、节奏控制和受众心理。
你的内容日历有这些特点：
1. 内容类型多样（产品种草、教程、用户证言、互动、节日营销）
2. 节奏感好，避免审美疲劳
3. 紧跟节日和热点
4. 商品组合科学（不重复推同一商品）
5. 跨平台差异化（同主题不同表达）

返回 JSON。`;

    const today = new Date();
    const productNames = products.map((p) => p.name).slice(0, 20).join(", ");

    const userPrompt = `生成未来 30 天的社媒内容日历：

起始日期：${today.toISOString().split("T")[0]}
目标平台：${platforms.join(", ")}
发布频率：${frequency}
商品池（共 ${products.length} 个）：${productNames}

请考虑：
- 国际节日（圣诞、新年、情人节等）
- 季节性主题
- 内容类型轮换（不要连续发同类型）
- 商品轮换

请生成 JSON：
{
  "calendar": [
    {
      "date": "YYYY-MM-DD",
      "day_of_week": "周几",
      "platform": "平台",
      "content_type": "类型（种草/教程/UGC/活动/节日）",
      "theme": "内容主题",
      "product": "关联商品",
      "hook": "内容钩子",
      "rationale": "选择理由"
    }
  ],
  "themes_overview": [
    {"week": 1, "focus": "本周重点"},
    {"week": 2, "focus": "本周重点"},
    {"week": 3, "focus": "本周重点"},
    {"week": 4, "focus": "本周重点"}
  ],
  "key_dates": [{"date": "日期", "event": "节日/事件", "content_idea": "内容创意"}]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 4500);

    return {
      skill_id: "content_calendar",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.05, image: 0 },
    };
  },
};
