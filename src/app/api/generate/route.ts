import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { rateLimitClaude } from "@/lib/rate-limiter";
import { validateBody, generateSchema } from "@/lib/api-validation";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============ Scene Configs ============

interface SceneConfig {
  system: string;
  formatHint: string;
  maxTokens?: number;
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

    // 内容工厂 - 完整内容包（文案+图片prompt+标签）
    case "content_package": {
      const platformGuide: Record<string, string> = {
        tiktok: "TikTok 短视频配文，包含 hook 开头和 CTA。图片描述应该是竖版 9:16，年轻活泼风格",
        instagram: "Instagram 帖子，包含吸引人的文案和 hashtags。图片描述应该是正方形 1:1，精致美学风格",
        xiaohongshu: "小红书种草笔记，口语化，有 emoji。图片描述应该是竖版，生活感强，真实自然",
        amazon: "Amazon 产品展示文案。图片描述应该是专业产品图，白底，高清",
        shopify: "Shopify 产品页面推广文案。图片描述应该是品牌感强的产品图",
        independent: "品牌独立站内容。图片描述应该是品牌调性一致的视觉素材",
      };
      const toneGuide: Record<string, string> = {
        professional: "专业严谨",
        casual: "轻松随意",
        humorous: "幽默风趣",
        inspirational: "激励人心",
      };
      return {
        system: `你是一个全能的品牌内容创作专家，擅长制作完整的社交媒体内容包。
根据主题生成一个完整的可发布内容包，包含文案和配图描述。
平台要求：${platformGuide[params.platform] || "社交媒体内容"}
语气要求：${toneGuide[params.tone] || "自然流畅"}`,
        formatHint: `返回 JSON 对象，包含以下字段：
{
  "title": "内容标题/封面文字",
  "body": "正文内容（包含排版和 emoji）",
  "hashtags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "image_prompt": "详细的英文图片生成描述，用于 AI 生成配图，描述画面内容、风格、构图、光线等",
  "cta": "行动号召语"
}
只返回 JSON，不要有其他文字。`,
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

    // 店铺优化 - SEO 关键词分析（Step 1：快速分析，不生成内容）
    case "seo_analyze": {
      return {
        system: `你是全球顶级电商 SEO 策略师，精通 Google、Bing、百度等搜索引擎算法。

你的任务：根据商品信息，分析出最佳 SEO 关键词策略。不要生成优化内容，只做分析。

分析框架：
1. **语言检测**：判断商品内容是英文还是中文，决定目标搜索引擎（Google vs 百度）
2. **搜索意图**：这个产品的买家在搜什么？是交易型（直接购买）、商业调研型（对比选品）还是信息型（了解产品）？
3. **主关键词**：买家最可能搜索的核心词（1个）
4. **次关键词**：相关的高搜索量变体词（2-3个）
5. **长尾关键词**：具体的购买意图长尾搜索词（2-3个）
6. **市场策略**：基于目标市场的 SEO 策略要点
7. **优化优先级**：当前最需要改进的 SEO 方面`,
        formatHint: `返回 JSON 对象：
{
  "detected_language": "en 或 cn",
  "primary_keyword": "主关键词",
  "secondary_keywords": ["次关键词1", "次关键词2"],
  "long_tail_keywords": ["长尾词1", "长尾词2"],
  "search_intent": "transactional 或 commercial 或 informational",
  "market_strategy": "目标市场 SEO 策略概述（1-2句）",
  "optimization_priorities": ["优先改进项1", "优先改进项2", "优先改进项3"]
}
只返回 JSON，不要有任何解释。`,
        maxTokens: 1000,
      };
    }

    // 店铺优化 - SEO 实际应用（生成可直接使用的新字段值）
    case "seo_apply": {
      return {
        system: `你是全球顶级电商 SEO 专家，精通 Google E-E-A-T 算法、搜索意图匹配和转化率优化。
你的任务是生成可直接应用到 Shopify 商品页的 SEO 优化文案。

══════ 核心方法论 ══════

【搜索意图匹配】
- 分析买家的搜索意图（交易型/商业调研/信息型），让内容精准匹配
- 交易型：强调价格优势、立即购买理由、库存紧张感
- 商业调研型：突出差异化卖点、vs 竞品优势、用户评价
- 信息型：教育性内容、使用场景、专业知识展示

【关键词策略】
- 自然融入关键词，密度 1-2%，绝不堆砌
- 主关键词出现在：标题前半部分、meta_title 开头、body_html 首段、H2 标题
- 次关键词分散在 body_html 各段和 tags 中
- 长尾关键词自然出现在描述段落中
- 如果用户提供了确认的关键词列表，严格使用这些关键词

【E-E-A-T 信号】
- Experience（经验）：加入使用场景、真实体验描述
- Expertise（专业）：使用行业术语、精确的产品参数
- Authoritativeness（权威）：品牌故事、认证信息、材质来源
- Trustworthiness（可信）：保修/售后信息、退换政策暗示

【双语市场适配】
- 英文内容 → 优化 Google SEO：Title Case 格式、Power Words、CTA 动词开头
- 中文内容 → 适配百度/搜索引擎：口语化关键词、场景化描述、信任背书

══════ 字段要求 ══════

1. title（商品标题）
   - 公式：[主关键词] [产品类型] - [品牌名] | [核心卖点/修饰词]
   - 50-60 字符最优，绝不超过 70
   - 主关键词尽量靠前
   - 保留品牌名

2. body_html（商品描述 HTML）
   - 开头立即嵌入 JSON-LD 结构化数据：<script type="application/ld+json">Product schema</script>
   - 首段 150 字内，包含主关键词，解决"为什么买"
   - 使用 H2/H3 小标题分段（每段一个卖点）
   - 包含至少 1 个 <ul> 列表（产品特点/参数）
   - 总字数 300-500 字（中文 200-400 字）
   - 末段包含 CTA 和关键词自然复现
   - JSON-LD 必须包含：@type Product, name, description, brand, offers(@type Offer, price, priceCurrency, availability)

3. meta_title（SEO 元标题）
   - 格式：[主关键词] [产品] | [品牌名] - [卖点]
   - 50-60 字符
   - 与 title 有差异，不能完全相同

4. meta_description（SEO 元描述）
   - 140-160 字符
   - 必须包含：主关键词 + USP（独特卖点）+ CTA（行动号召）
   - 以完整句子结尾，不能被截断
   - 英文用 Power Words 开头：Discover, Shop, Get, Save...
   - 中文用吸引词开头：精选、限时、热卖、必备...

5. tags（标签）
   - 逗号分隔，5-10 个
   - 覆盖：主关键词、产品类别、材质/成分、使用场景、目标人群、长尾词
   - 包含 2-3 个多词组合标签

6. handle_suggestion（URL Handle 建议）
   - 全小写，用连字符分隔
   - 包含主关键词
   - 3-6 个单词，简洁明了

7. seo_analysis（分析报告）
   - 记录你使用的关键词策略和搜索意图判断
   - 便于用户理解优化逻辑

绝对不允许任何字段返回空值。每个字段都必须有实际内容。`,
        formatHint: `直接返回 JSON 对象，必须包含全部字段。只返回 JSON，不要有任何解释文字。
格式：
{
  "title": "优化后商品标题",
  "body_html": "<script type=\\"application/ld+json\\">{...Product schema...}</script><h2>...</h2><p>...</p>",
  "meta_title": "SEO 元标题",
  "meta_description": "SEO 元描述",
  "tags": "标签1,标签2,标签3,标签4,标签5",
  "handle_suggestion": "seo-friendly-product-handle",
  "seo_analysis": {
    "detected_language": "en 或 cn",
    "primary_keyword": "使用的主关键词",
    "secondary_keywords": ["次关键词1", "次关键词2"],
    "long_tail_keywords": ["长尾词1", "长尾词2"],
    "search_intent": "transactional/commercial/informational",
    "optimization_reasoning": "一段话说明优化逻辑和策略"
  }
}`,
        maxTokens: 4000,
      };
    }

    // Dashboard - AI 每日运营洞察
    case "ai_daily_insight": {
      return {
        system: `你是一个资深的电商运营总监，擅长从运营数据中发现问题和机会。
根据当天的运营数据，给出 3-5 条今日最重要的可执行行动建议。
建议要具体、有优先级、立刻可以执行。`,
        formatHint: `返回 JSON 对象：
{
  "greeting": "一句简短的今日运营状态总结",
  "priority_actions": [
    { "title": "行动标题", "description": "具体说明", "priority": "high/medium/low", "category": "内容/店铺/社媒/广告/达人" }
  ],
  "insight": "一句深层洞察或提醒"
}
只返回 JSON。`,
      };
    }

    // Strategy - AI 用户画像生成
    case "persona_generation": {
      return {
        system: `你是一个用户研究专家，擅长根据品牌信息构建目标用户画像。
为品牌生成 3 个差异化的目标用户画像，每个画像要具体、有代入感、可指导运营。`,
        formatHint: `返回 JSON 数组，包含 3 个用户画像：
[{
  "name": "人物名称",
  "age": 25,
  "occupation": "职业",
  "description": "一句话描述",
  "pain_points": ["痛点1", "痛点2"],
  "motivations": ["动机1", "动机2"],
  "platforms": ["常用平台1", "平台2"],
  "purchasing_behavior": "消费行为描述"
}]
只返回 JSON。`,
      };
    }

    // Strategy - AI 品牌调性生成
    case "brand_tone": {
      return {
        system: `你是一个品牌设计与传播专家，擅长定义品牌视觉和语言调性。
根据品牌信息，生成完整的品牌调性指南。`,
        formatHint: `返回 JSON 对象：
{
  "tone_keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "voice_description": "品牌语言风格描述",
  "do_list": ["应该做的1", "应该做的2", "应该做的3"],
  "dont_list": ["不应该做的1", "不应该做的2", "不应该做的3"],
  "color_suggestions": [
    { "name": "主色", "hex": "#4F46E5", "usage": "用途" }
  ],
  "visual_style": "视觉风格描述"
}
只返回 JSON。`,
      };
    }

    // Live - AI 直播复盘分析
    case "live_review": {
      return {
        system: `你是一个直播运营数据分析专家，擅长从直播数据中发现问题并给出改进方案。
根据直播数据给出具体、量化、可执行的改进建议。`,
        formatHint: `返回 JSON 对象：
{
  "performance_summary": "总体表现评价",
  "score": 75,
  "strengths": ["做得好的1", "做得好的2"],
  "improvements": [
    { "area": "改进领域", "issue": "当前问题", "suggestion": "具体建议", "expected_impact": "预期效果" }
  ],
  "next_stream_tips": ["下场直播建议1", "建议2"]
}
只返回 JSON。`,
      };
    }

    // Ads - AI 投放优化建议
    case "ad_optimization": {
      return {
        system: `你是一个资深的广告投放优化专家，擅长分析广告数据并给出预算和策略调整建议。
根据广告投放数据，给出具体的优化方案。`,
        formatHint: `返回 JSON 对象：
{
  "overall_assessment": "整体投放评价",
  "budget_suggestions": [
    { "ad_name": "广告名", "current_spend": "当前花费", "suggestion": "调整建议", "reason": "原因" }
  ],
  "optimization_tips": ["优化建议1", "建议2", "建议3"],
  "stop_suggestions": ["建议暂停的广告及原因"],
  "scale_suggestions": ["建议加大的广告及原因"]
}
只返回 JSON。`,
      };
    }

    // Channels - AI 渠道评估
    case "channel_evaluation": {
      return {
        system: `你是一个多渠道电商运营专家，擅长评估渠道适配度和制定渠道拓展策略。
根据品牌现状和候选渠道信息，给出优先级排序和入驻建议。`,
        formatHint: `返回 JSON 对象：
{
  "overall_strategy": "整体渠道策略建议",
  "channel_rankings": [
    { "channel": "渠道名", "score": 85, "reason": "推荐理由", "priority": "high/medium/low", "estimated_monthly": "预估月销" }
  ],
  "entry_sequence": "建议入驻顺序说明",
  "risk_notes": ["风险提醒1", "提醒2"]
}
只返回 JSON。`,
      };
    }

    // Skills - AI 学习推荐
    case "skill_recommendation": {
      return {
        system: `你是一个电商运营培训专家，擅长根据用户当前能力和业务需求推荐学习路径。
根据用户信息和运营状况，推荐最应该优先学习的技能。`,
        formatHint: `返回 JSON 对象：
{
  "assessment": "对当前能力的评估",
  "recommended_skills": [
    { "skill": "技能名称", "category": "分类", "reason": "推荐理由", "priority": "high/medium/low", "estimated_hours": 5 }
  ],
  "learning_path": "建议的学习路径描述",
  "quick_wins": ["快速见效的行动1", "行动2"]
}
只返回 JSON。`,
      };
    }

    // Social - AI 排期建议
    case "social_scheduling": {
      return {
        system: `你是一个社交媒体运营专家，擅长分析最佳发布时间和内容策略。
根据社媒账号和内容数据，给出发布排期优化建议。`,
        formatHint: `返回 JSON 对象：
{
  "scheduling_strategy": "整体排期策略",
  "best_times": [
    { "platform": "平台名", "best_days": "最佳日期", "best_hours": "最佳时段", "reason": "原因" }
  ],
  "frequency_suggestions": [
    { "platform": "平台名", "recommended_freq": "建议频率", "content_mix": "内容配比" }
  ],
  "content_calendar_tips": ["排期建议1", "建议2"]
}
只返回 JSON。`,
      };
    }

    // 趋势雷达 - AI 商品趋势搜索（核心搜索功能）
    case "trend_search": {
      return {
        system: `你是一个专业的电商市场研究分析师，拥有各大电商平台的最新市场数据知识。
用户会给你一个商品品类和目标平台，你需要返回该品类在该平台上当前的热门商品趋势数据。

要求：
- 返回 8-12 个当前在该平台上热销或快速增长的真实商品
- 数据要尽量接近真实市场情况（基于你的训练数据）
- 包含具体的商品名称、价格区间、预估销量、增长趋势
- 按销量从高到低排序
- 如果是中国平台（小红书、抖音），商品名用中文
- 如果是海外平台（Amazon、Instagram、TikTok），商品名用英文`,
        formatHint: `返回 JSON 数组，每个元素代表一个热门商品：
[{
  "name": "商品名称（具体产品名，不是品类名）",
  "category": "所属细分品类",
  "sales_volume": 15000,
  "growth_rate": 23.5,
  "trend": "up",
  "price_range": "¥99-¥199",
  "rating": 4.7,
  "insight": "一句话说明为什么这个商品在增长"
}]
trend 只能是 "up"、"down" 或 "flat"。growth_rate 是百分比数字。只返回 JSON。`,
      };
    }

    // 趋势雷达 - AI 竞品搜索
    case "competitor_search": {
      return {
        system: `你是一个专业的电商竞品情报分析师。
用户会给你一个品类和平台，你需要返回该领域的主要竞争品牌/店铺信息。

要求：
- 返回 6-8 个该品类在该平台上的主要竞品品牌或店铺
- 数据要尽量接近真实市场情况
- 包含品牌名、粉丝量级、互动率、增长趋势等
- 按影响力从高到低排序`,
        formatHint: `返回 JSON 数组：
[{
  "name": "品牌/店铺名称",
  "top_category": "主营品类",
  "followers": 520000,
  "avg_engagement": 4.5,
  "growth_rate": 15.2,
  "trend": "up",
  "recent_campaigns": 8,
  "insight": "竞品特点/策略简述"
}]
只返回 JSON。`,
      };
    }

    // 趋势雷达 - AI 市场趋势分析
    case "trend_analysis": {
      return {
        system: `你是一个资深的电商市场分析专家，擅长从销量数据中发现趋势和机会。
根据提供的热门产品数据，给出市场趋势洞察。
分析要数据驱动、有深度、可执行。`,
        formatHint: `返回 JSON 对象：
{
  "market_summary": "市场整体趋势概述（2-3句话）",
  "opportunities": ["机会1", "机会2", "机会3"],
  "threats": ["威胁1", "威胁2"],
  "recommendations": ["建议1", "建议2", "建议3"],
  "hot_categories": ["值得关注的品类1", "品类2"],
  "predicted_trend": "未来30天预测"
}
只返回 JSON。`,
      };
    }

    // 趋势雷达 - AI 竞品策略分析
    case "competitor_analysis": {
      return {
        system: `你是一个资深的竞品分析专家，擅长从竞品数据中发现市场格局和竞争机会。
根据提供的竞品列表数据，给出全面的竞品分析报告。`,
        formatHint: `返回 JSON 对象：
{
  "market_position": "当前市场格局概述",
  "competitor_insights": [
    { "name": "竞品名称", "insight": "关键洞察", "threat_level": "high/medium/low" }
  ],
  "gaps": ["市场空白1", "市场空白2"],
  "strategy_suggestions": ["策略建议1", "策略建议2", "策略建议3"],
  "differentiation_points": ["差异化切入点1", "切入点2"]
}
只返回 JSON。`,
      };
    }

    // 达人中心 - AI 匹配度分析
    case "influencer_analysis": {
      return {
        system: `你是一个资深的达人营销专家，擅长评估达人与品牌的匹配度。
根据提供的达人信息和品牌/产品信息，进行全面的匹配度分析。
分析要数据驱动、有洞察力、可执行。`,
        formatHint: `返回 JSON 对象：
{
  "match_score": 85,
  "strengths": ["优势1", "优势2", "优势3"],
  "risks": ["风险1", "风险2"],
  "recommendation": "综合推荐意见，2-3句话",
  "estimated_roi": "预估 ROI 倍数，如 3.5",
  "suggested_content_types": ["适合的内容形式1", "内容形式2"],
  "budget_suggestion": "建议合作预算范围"
}
只返回 JSON。`,
      };
    }

    // 达人中心 - AI 外联话术生成
    case "influencer_outreach": {
      return {
        system: `你是一个专业的达人商务合作专家，擅长撰写品牌与达人的合作邀约话术。
话术要真诚、专业、有吸引力，突出合作的双赢价值。
根据达人的风格和平台特点定制话术。`,
        formatHint: `返回 JSON 数组，包含 3 个不同风格的外联话术版本：
[
  {
    "style": "正式商务",
    "subject": "邮件/私信标题",
    "message": "正文内容（200字左右）",
    "follow_up": "3天后跟进话术（100字左右）"
  }
]
只返回 JSON。`,
      };
    }

    // 达人中心 - AI 达人合作策略
    case "influencer_strategy": {
      return {
        system: `你是一个资深的达人营销策略师，擅长制定品牌的达人合作策略。
根据品牌目标和当前达人库情况，给出完整的合作策略建议。`,
        formatHint: `返回 JSON 对象：
{
  "strategy_summary": "整体策略概述",
  "recommended_mix": [
    { "tier": "头部达人", "count": 2, "budget_pct": 40, "purpose": "品牌背书" },
    { "tier": "腰部达人", "count": 5, "budget_pct": 35, "purpose": "种草转化" },
    { "tier": "尾部达人", "count": 10, "budget_pct": 25, "purpose": "口碑铺量" }
  ],
  "content_strategy": ["内容策略建议1", "建议2"],
  "timeline": "建议执行周期",
  "kpi_targets": ["KPI目标1", "KPI目标2"],
  "budget_total": "建议总预算范围"
}
只返回 JSON。`,
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
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const rl = await rateLimitClaude(auth.userId);
  if (!rl.allowed) return rl.error;

  try {
    const body = await request.json();
    const validated = validateBody(body, generateSchema);
    if (validated.error) return validated.error;

    const { scene = "content", topic, ...params } = validated.data;

    const config = getSceneConfig(scene, params as Record<string, string>);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: config.maxTokens || 3000,
      system: `${config.system}\n\n输出格式要求：\n${config.formatHint}`,
      messages: [
        { role: "user", content: topic },
      ],
    });

    const content = message.content[0]?.type === "text" ? message.content[0].text : "[]";

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
