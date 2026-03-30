import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PLATFORM_PROMPTS: Record<string, string> = {
  tiktok: "TikTok 短视频脚本，包含开头 hook、正文和结尾 CTA，适合 15-60 秒",
  instagram: "Instagram 帖子文案，包含吸引人的开头、正文内容和话题标签",
  xiaohongshu: "小红书种草笔记，使用口语化表达，包含标题、正文和标签，加入适当的 emoji",
  amazon: "Amazon 产品描述，包含产品亮点 bullet points 和详细描述",
  shopify: "Shopify 独立站产品页文案，包含 SEO 标题、产品描述和卖点",
  independent: "品牌独立站内容，包含品牌故事感和专业度",
};

const TONE_PROMPTS: Record<string, string> = {
  professional: "专业严谨的语气",
  casual: "轻松随意的口吻，像朋友聊天",
  humorous: "幽默风趣，带有网感",
  inspirational: "激励人心，积极正能量",
};

export async function POST(request: Request) {
  try {
    const { platform, topic, tone, quantity } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: "请输入内容主题" }, { status: 400 });
    }

    const platformGuide = PLATFORM_PROMPTS[platform] || "社交媒体内容";
    const toneGuide = TONE_PROMPTS[tone] || "自然流畅的语气";
    const count = Math.min(Number(quantity) || 3, 5);

    const systemPrompt = `你是一个专业的品牌内容运营专家，擅长为各大社交媒体平台创作高互动率的内容。
你需要根据用户给出的主题，生成 ${count} 条不同角度的内容。

平台要求：${platformGuide}
语气要求：${toneGuide}

输出格式：用 JSON 数组返回，每个元素包含 title（标题）和 body（正文内容）。
只返回 JSON，不要其他文字。示例：
[{"title": "标题1", "body": "正文1"}, {"title": "标题2", "body": "正文2"}]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `主题：${topic}` },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || "[]";

    // Parse the JSON response
    let results;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      results = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      results = [{ title: "生成的内容", body: content }];
    }

    return NextResponse.json({ results, platform, tone });
  } catch (error: unknown) {
    console.error("AI generation error:", error);
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
