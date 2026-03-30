import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============ Scene Configs ============

interface SceneConfig {
  system: string;
  formatHint: string;
}

function getSceneConfig(scene: string, params: Record<string, string>): SceneConfig {
  switch (scene) {
    // 内容工厂 - 批量内容生成
    case "content": {
      const platformGuide: Record<string, string> = {
        tiktok: "TikTok 短视频脚本，包含开头 hook、正文和结尾 CTA，适合 15-60 秒",
        instagram: "Instagram 帖子文案，包含吸引人的开头、正文内容和话题标签",
        xiaohongshu: "小红书种草笔记，使用口语化表达，包含标题、正文和标签，加入适当的 emoji",
        amazon: "Amazon 产品描述，包含产品亮点 bullet points 和详细描述",
        shopify: "Shopify 独立站产品页文案，包含 SEO 标题、产品描述和卖点",
        independent: "品牌独立站内容，包含品牌故事感和专业度",
      };
      const toneGuide: Record<string, string> = {
        professional: "专业严谨的语气",
        casual: "轻松随意的口吻，像朋友聊天",
        humorous: "幽默风趣，带有网感",
        inspirational: "激励人心，积极正能量",
      };
      const count = Math.min(Number(params.quantity) || 3, 5);
      return {
        system: `你是一个专业的品牌内容运营专家。根据主题生成 ${count} 条不同角度的内容。
平台要求：${platformGuide[params.platform] || "社交媒体内容"}
语气要求：${toneGuide[params.tone] || "自然流畅"}`,
        formatHint: `用 JSON 数组返回，每个元素包含 title 和 body。只返回 JSON。
示例：[{"title":"标题","body":"正文"}]`,
      };
    }

    // 直播中心 - 话术生成
    case "live_script": {
      const scriptTypes: Record<string, string> = {
        opening: "直播开场话术：热情打招呼、自我介绍、预告今天内容、引导关注",
        product: "产品讲解话术：产品亮点、使用场景、对比竞品、用户痛点解决",
        closing: "促单转化话术：限时优惠、库存紧张、倒计时、下单引导",
        interaction: "互动留人话术：提问互动、抽奖预告、粉丝福利、弹幕互动",
        ending: "直播结束话术：感谢观看、预告下场、引导关注、分享提醒",
      };
      return {
        system: `你是一个专业的直播运营专家，擅长写高转化率的直播话术。
话术类型：${scriptTypes[params.script_type] || "通用直播话术"}
要求：口语化、有感染力、适合直播间使用，每段话术 100-200 字。`,
        formatHint: `用 JSON 数组返回 3 个不同版本，每个包含 title（话术标题）和 body（话术内容）。只返回 JSON。
示例：[{"title":"版本A","body":"话术内容"}]`,
      };
    }

    // 广告投放 - 广告文案生成
    case "ad_copy": {
      const adPlatforms: Record<string, string> = {
        facebook: "Facebook/Meta 广告，注意文案长度限制，突出视觉冲击",
        google: "Google 搜索广告，标题30字符内，描述90字符内",
        tiktok: "TikTok 信息流广告，年轻化表达，前3秒抓住注意力",
        xiaohongshu: "小红书信息流广告，种草风格，自然不硬广",
      };
      return {
        system: `你是一个资深的广告投放专家，擅长写高点击率的广告文案。
广告平台：${adPlatforms[params.ad_platform] || "社交媒体广告"}
目标受众：${params.audience || "品牌目标用户"}
要求：文案简洁有力，包含明确的 CTA，能引起目标受众共鸣。`,
        formatHint: `用 JSON 数组返回 3 个不同风格的广告文案，每个包含 title（广告标题）和 body（广告正文），以及 cta（行动号召按钮文字）。只返回 JSON。
示例：[{"title":"标题","body":"正文","cta":"立即购买"}]`,
      };
    }

    // 品牌策略 - 品牌定位分析
    case "brand_analysis": {
      return {
        system: `你是一个资深的品牌策略顾问，擅长品牌定位分析和市场洞察。
根据用户提供的品牌/产品信息，进行全面的品牌定位分析。
分析要深入、有洞察力、可执行。`,
        formatHint: `用 JSON 返回分析结果，包含以下字段：
{
  "positioning": "一句话品牌定位",
  "target_audience": "目标用户画像描述",
  "core_values": ["核心价值1", "核心价值2", "核心价值3"],
  "differentiators": ["差异化优势1", "差异化优势2"],
  "tone_keywords": ["品牌调性关键词1", "关键词2", "关键词3"],
  "suggestions": ["策略建议1", "策略建议2", "策略建议3"]
}
只返回 JSON。`,
      };
    }

    // 店铺优化 - SEO 建议
    case "seo_optimize": {
      return {
        system: `你是一个电商 SEO 专家，擅长优化产品页面和独立站 SEO。
根据用户提供的产品或页面信息，给出具体可执行的 SEO 优化建议。
建议要具体、可操作、有优先级。`,
        formatHint: `用 JSON 数组返回优化建议，每个包含 category（类别：标题/描述/关键词/图片/结构）、priority（优先级：high/medium/low）、current（当前问题）和 suggestion（优化建议）。只返回 JSON。
示例：[{"category":"标题","priority":"high","current":"标题过长且缺少关键词","suggestion":"建议修改为..."}]`,
      };
    }

    default:
      return {
        system: "你是一个专业的品牌运营 AI 助手。",
        formatHint: "用 JSON 数组返回结果，每个元素包含 title 和 body。只返回 JSON。",
      };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scene = "content", topic, ...params } = body;

    if (!topic) {
      return NextResponse.json({ error: "请输入内容" }, { status: 400 });
    }

    const config = getSceneConfig(scene, params);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${config.system}\n\n输出格式要求：\n${config.formatHint}`,
        },
        { role: "user", content: topic },
      ],
      temperature: 0.8,
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content || "[]";

    let results;
    try {
      const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/);
      results = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      results = [{ title: "AI 生成结果", body: content }];
    }

    // Normalize: if result is object (not array), wrap in array
    if (!Array.isArray(results)) {
      results = [results];
    }

    return NextResponse.json({ results, scene });
  } catch (error: unknown) {
    console.error("AI generation error:", error);
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
