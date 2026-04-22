import { callLLM } from "../llm";
import { tryRunPrompt } from "../../prompts";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const shortVideoScriptSkill: ContentSkill = {
  id: "short_video_script",
  name: "短视频脚本",
  category: "video",
  description: "生成高播放率短视频脚本：前3秒钩子公式 + BAB/PASTOR框架 + 平台专属标签策略",
  icon: "Video",
  color: "indigo",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "platform", label: "目标平台", type: "platform", required: true, default: "tiktok" },
    { key: "duration", label: "视频时长", type: "select", default: "30s", options: [
      { value: "15s", label: "15 秒（钩子+展示+CTA）" },
      { value: "30s", label: "30 秒（完整 BAB 框架）" },
      { value: "60s", label: "60 秒（深度种草 PASTOR）" },
    ]},
    { key: "style", label: "视频风格", type: "select", default: "bab", options: [
      { value: "bab", label: "BAB — Before/After/Bridge（高转化）" },
      { value: "hook_reveal", label: "钩子悬念揭秘" },
      { value: "try_on_haul", label: "试穿/开箱 Haul（最高互动）" },
      { value: "problem_solution", label: "痛点解决方案" },
      { value: "day_in_life", label: "生活日常种草" },
      { value: "ugc_authentic", label: "UGC 真实分享风" },
    ]},
    { key: "hook_type", label: "钩子类型", type: "select", default: "auto", options: [
      { value: "auto", label: "AI 自动选最优" },
      { value: "contrarian", label: "反常识「没人告诉你...」" },
      { value: "question", label: "好奇心问题「你有没有...」" },
      { value: "direct_address", label: "直接点名「你正在犯这个错误」" },
      { value: "pattern_interrupt", label: "视觉/听觉突破惯性" },
      { value: "benefit_promise", label: "利益承诺「3 秒看懂为什么值」" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const platform = (input.platform as string) || "tiktok";
    const duration = (input.duration as string) || "30s";
    const style = (input.style as string) || "bab";
    const hookType = (input.hook_type as string) || "auto";

    const dbOut = await tryRunPrompt("social.video.script", {
      platform,
      duration,
      style,
      hook_type: hookType,
      product: { name: product.name },
      product_desc: (product.body_html || product.description || "").slice(0, 200),
    }, { source: "short_video_script" });
    if (dbOut) {
      return {
        skill_id: "short_video_script",
        output: dbOut,
        generated_at: new Date().toISOString(),
        estimated_cost: { text: 0.02, image: 0 },
      };
    }

    // Platform-specific rules based on algorithm behavior
    const platformRules: Record<string, string> = {
      tiktok: `TIKTOK ALGORITHM RULES:
- First 2 seconds determine if algorithm promotes: must hook emotionally or visually
- Emotionally resonant hooks drive 2.7x higher completion rate
- "You/Your" language: 74% better engagement (direct address)
- Try-on hauls (3-7 pieces): highest-performing format for apparel
- Comments drive distribution: write copy that provokes a response
- Hashtag formula: 3-5 broad (10M+ posts) + 3-4 niche (100K-1M) + 2-3 micro (10K-100K) = 8-12 total
- Spark Ads: write as if organic, helper/advisor tone, NOT advertiser tone`,

      instagram: `INSTAGRAM REELS RULES:
- First 1-2 seconds: pattern interrupt or visual hook
- Aesthetic matters: color grading, composition, visual storytelling
- Caption structure: 2-line hook (visible before "more") → core value → engagement question → CTA
- Hashtag formula: 8-12 total — mix broad + niche + brand-specific
- Reels: 7-15 seconds performs best for discovery; 20-30s for engaged audience
- Text overlays: large, readable, positioned for mobile portrait view`,

      youtube_shorts: `YOUTUBE SHORTS RULES:
- Subscribers matter less: algorithm shows to non-subscribers based on watch time
- Vertical 9:16 format, full screen
- Hook + loop structure: end suggests rewatching
- Titles are searchable: use keyword-rich title`,

      xiaohongshu: `小红书 RULES:
- 真实感 > 精致感: authentic > polished
- 封面图 + 标题决定点击: cover photo + title with numbers/symbols
- 笔记结构: 开头钩子 → 干货/故事 → 总结清单 → 互动问题
- 标签: 品类词 + 场景词 + 品牌词 + 趋势词
- 多图笔记: 第一张封面最重要`,

      douyin: `抖音 RULES:
- 前 3 秒极其关键: 必须留住刷到的用户
- 情感共鸣优先: 打动人心 > 展示产品
- 完播率是核心指标: 结尾要有回扣感
- BGM 选热门: 算法加权当前热门音乐
- 评论区互动: 多回复，制造讨论`,
    };

    // Script framework blueprints
    const frameworkGuide: Record<string, string> = {
      bab: `BAB FRAMEWORK (Before-After-Bridge) — Research shows +120% engagement vs other formats:
BEFORE (5-10s): Show the problem/pain state vividly. Make the viewer think "that's me!"
  - Be specific: not "bad style" but "wearing the same 3 outfits every week"
  - Visual: show the before situation or recreate it
AFTER (5-10s): Show the transformed result. Make it aspirational but attainable.
  - Specific outcome: "Now I have 12 outfit combinations from 4 pieces"
  - Visual: show the transformation/result clearly
BRIDGE (10-25s): Reveal the product as the bridge between states.
  - How it works (brief, not feature-dumping)
  - Social proof: "3,000 women already made this switch"
  - CTA: natural, not salesy ("link in bio if you want it")`,

      hook_reveal: `HOOK-REVEAL FRAMEWORK:
HOOK (0-3s): Create a question that DEMANDS an answer
  - "Wait, you can actually style this 7 different ways?"
  - "Nobody told me this about [product category]..."
  - The viewer must stay to find out
BUILD-UP (3-20s): Tease the reveal, add tension
  - Show partial reveals, build curiosity
  - Layer in proof points
REVEAL (20-end): Pay off the hook promise
  - Satisfy the curiosity completely
  - Drop the CTA after the payoff, not before`,

      try_on_haul: `TRY-ON/HAUL FRAMEWORK — Highest-performing format for fashion apparel:
INTRO (0-3s): "I ordered [X] pieces and here's what I got" / "Styling [product] 5 ways"
EACH PIECE (3-5s per look):
  - Show the item before wearing
  - Quick clip of putting it on / styling
  - 1-2 second "finished look" moment
  - Honest comment: comfort, fit, material feel
OVERALL VERDICT (last 10s):
  - Honest recommendation: what you'd re-buy, what didn't work
  - Price context: "for $X this is actually..."
CTA: Natural mention of where to find it, not a hard sell`,

      problem_solution: `PROBLEM-SOLUTION FRAMEWORK:
PAIN POINT (0-5s): Name the specific problem in the first second
  - "If you hate [specific problem]..."
  - Show the pain visually, not just describe it
AGITATION (5-15s): Make the pain feel real and urgent
  - "I spent [time] dealing with this..."
  - Social proof that others have this problem
SOLUTION REVEAL (15-30s): Introduce product as solution
  - Demonstrate, don't just state
  - Show the "after" clearly
PROOF (last 10s): Social proof + CTA`,

      day_in_life: `DAY-IN-LIFE FRAMEWORK (高authenticity, 适合种草):
CONTEXT SETTING (0-5s): "My morning routine with [product]"
NATURAL USE (5-40s): Show product integrated into real daily life
  - Multiple real-use moments
  - Genuine reactions and comments
  - Show it being practical, not staged
HONEST TAKE (last 10s): Personal genuine recommendation
  - What you love about it after [time] of use
  - Who it's perfect for`,

      ugc_authentic: `UGC AUTHENTIC FRAMEWORK (Spark Ads strategy — 69% higher CVR than standard ads):
TONE: Speak like you're texting a friend, not advertising
  - "Okay I need to tell you about this..."
  - "Nobody asked but I'm obsessed with..."
  - First person, genuine, slightly imperfect is better than polished
CONTENT: Real use case, real opinion
  - What you actually love (specific)
  - Honest caveat if any (makes rest more credible)
  - Context: how long you've been using it, how many times worn
CTA: Natural mention, not scripted ("I linked it" / "search [brand] on TikTok")`,
    };

    // Hook type formulas
    const hookFormulas: Record<string, string> = {
      contrarian: `CONTRARIAN HOOK: Start with something that contradicts common belief
  Examples: "Nobody talks about the fact that [surprising truth]..."
            "I was wrong about [product category] until I tried this..."
            "Stop buying expensive [X] until you've tried [this]..."`,
      question: `QUESTION HOOK: Curiosity-gap question that demands an answer (avoid yes/no)
  Examples: "Have you ever wondered why [specific styling problem]?"
            "What if you could [desired outcome] in literally 30 seconds?"
            "Why does everyone who wears [brand] look [specific quality]?"`,
      direct_address: `DIRECT ADDRESS HOOK: Call out the viewer specifically (74% better engagement)
  Examples: "If you wear [size/body type], you NEED to see this..."
            "For everyone who [specific situation] — this is for you..."
            "You're making this [specific mistake] and it's costing you [outcome]..."`,
      pattern_interrupt: `PATTERN INTERRUPT HOOK: Unexpected visual or audio in first 1-2 seconds
  Ideas: Unexpected sound effect, rapid visual cut, text appearing dramatically
         Zoom into unexpected detail, color pop, slow motion reveal
         Start mid-sentence or mid-action (creates disorientation = attention)`,
      benefit_promise: `BENEFIT PROMISE HOOK: Lead with the outcome, make them want to know how
  Examples: "I went from [before state] to [after state] in [timeframe]..."
            "This single piece gave me 15 new outfit combinations..."
            "[Product] is the reason I stopped buying [expensive alternative]..."`,
      auto: `AUTO-SELECT (choose whichever works best for this specific product and platform):
  - For fashion apparel: try contrarian or benefit_promise
  - For TikTok: direct_address or pattern_interrupt get highest 3-second hold rates
  - For Instagram: benefit_promise or question work well aesthetically
  - Priority: emotional resonance > cleverness`,
    };

    const systemPrompt = `You are a top-tier short video content strategist with proven results in fashion DTC. You've written scripts that achieved millions of views.

YOUR CRAFT PRINCIPLES:
1. The hook IS the script — if first 3 seconds don't work, nothing else matters
2. People scroll past features, they pause for feelings — write to emotions
3. Specificity converts: "47 women bought this last week" > "very popular"
4. Authentic > polished for apparel content: UGC outperforms studio ads
5. Every frame must earn its place — no filler, no wasted seconds
6. CTA must feel earned, not tacked-on — place after the payoff moment

HOOK SCIENCE (research-backed):
- Emotionally resonant hooks → 2.7x completion rate
- "You/Your" language → 74% better engagement
- Contrarian statements create pattern interrupt
- First 2 seconds are critical for algorithm promotion decision
- Best 3-second holds: Direct address > Contrarian > Benefit promise > Question

Return a detailed JSON script.`;

    const userPrompt = `Generate a ${duration} short video script for:

PRODUCT: ${product.name}
DESCRIPTION: ${(product.body_html || product.description || "").slice(0, 300)}
PLATFORM: ${platform}
STYLE/FRAMEWORK: ${style}
HOOK TYPE: ${hookType}
PRICE: ${product.price || "N/A"}
${product.image_url ? `PRODUCT IMAGE: ${product.image_url}` : ""}

PLATFORM ALGORITHM RULES TO FOLLOW:
${platformRules[platform] || platformRules.tiktok}

SCRIPT FRAMEWORK:
${frameworkGuide[style] || frameworkGuide.bab}

HOOK FORMULA TO USE:
${hookFormulas[hookType] || hookFormulas.auto}

Generate complete script as JSON:
{
  "platform": "${platform}",
  "duration": "${duration}",
  "framework": "${style}",
  "hook_type": "the hook type chosen",
  "hook": "EXACT opening line/action — first 3 seconds, make it undeniable",
  "hook_rationale": "why this hook works for this product",
  "scenes": [
    {
      "timestamp": "0-3s",
      "visual": "exact description of what viewer sees",
      "voiceover": "exact words spoken (or [no voiceover])",
      "text_overlay": "text appearing on screen (font weight, placement)",
      "action": "creator action instruction",
      "purpose": "what this scene accomplishes in the framework"
    }
  ],
  "cta": "natural CTA — specific words, timing, tone",
  "caption": {
    "hook_line": "first 2 lines visible before 'more' — must compel tapping",
    "body": "main caption content",
    "engagement_question": "question that drives comments",
    "cta_line": "link in bio / search [brand] / etc"
  },
  "hashtags": {
    "broad": ["3-5 tags with 10M+ posts"],
    "niche": ["3-4 tags with 100K-1M posts"],
    "micro": ["2-3 tags under 100K — highest engagement rate"],
    "total_count": 11
  },
  "bgm_suggestion": "specific music style or trending audio type with energy description",
  "filming_tips": ["3-4 specific shooting instructions for this exact script"],
  "props_and_setup": ["specific items needed"],
  "performance_prediction": "why this script should perform well, what metric to watch"
}`;

    const output = await callLLM(systemPrompt, userPrompt, 4000, "fast");

    return {
      skill_id: "short_video_script",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
