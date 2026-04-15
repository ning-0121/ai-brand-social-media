/**
 * 内容矩阵引擎 — 一稿多发 + 多平台风格适配
 * 基于 cn-content-matrix + social-auto-upload 的核心逻辑
 *
 * 能力：
 * 1. 一个主题 → 自动生成 5 个平台的差异化内容（小红书/抖音/Instagram/TikTok/微信）
 * 2. 各平台风格转换（小红书种草体、抖音 hook 体、IG 英文简约体）
 * 3. 矩阵排期策略（错峰发布、平台联动）
 * 4. 直播话术生成（开场/讲品/逼单/互动/收场）
 * 5. 选品排品策略
 */

import { callLLM } from "./content-skills/llm";
import { supabase } from "./supabase";

// ─── 1. 矩阵内容一键生成 ──────────────────────────────────

export interface MatrixContent {
  platform: string;
  title: string;
  body: string;
  hashtags: string[];
  image_prompt: string;
  best_post_time: string;
  content_style: string;
  compliance_notes: string;
}

export async function generateContentMatrix(params: {
  topic: string;
  product_name?: string;
  product_price?: number;
  platforms?: string[];
}): Promise<{
  contents: MatrixContent[];
  posting_schedule: string;
  matrix_strategy: string;
}> {
  const platforms = params.platforms || ["xiaohongshu", "douyin", "instagram", "tiktok", "wechat"];

  const result = await callLLM(
    `你是全网内容矩阵运营专家。一个主题生成多平台差异化内容。

各平台风格要求：
- 小红书：种草体，标题要有 emoji + 数字，口语化，"姐妹们" 开头，标签用 #
- 抖音：hook 式开头（前 3 秒必须抓人），口播脚本，节奏快，带争议性
- Instagram：英文，简约高级感，lifestyle 风格，hashtag 精选 15-20 个
- TikTok：英文，trend-driven，hook + value + CTA 结构，音乐建议
- 微信公众号：长图文，深度种草，对比测评风格，专业但不枯燥

每个平台内容必须完全不同 — 不是翻译，是重新创作！

返回 JSON：
{
  "contents": [
    {
      "platform": "平台名",
      "title": "标题",
      "body": "正文（200-300字）",
      "hashtags": ["标签1", "标签2"],
      "image_prompt": "配图描述（英文，用于 AI 生图）",
      "best_post_time": "最佳发布时间",
      "content_style": "内容风格标签",
      "compliance_notes": "平台合规提示"
    }
  ],
  "posting_schedule": "矩阵发布节奏建议",
  "matrix_strategy": "矩阵联动策略"
}`,
    `主题: ${params.topic}
商品: ${params.product_name || "运动服饰"}
价格: $${params.product_price || 49}
品牌: JOJOFEIFEI
目标平台: ${platforms.join(", ")}`,
    4000
  );

  return result as unknown as {
    contents: MatrixContent[];
    posting_schedule: string;
    matrix_strategy: string;
  };
}

// ─── 2. 直播话术全流程生成 ──────────────────────────────────

export interface LiveStreamScript {
  phase: string;
  duration: string;
  script: string;
  key_actions: string[];
  product_focus: string;
  interaction_prompts: string[];
}

export async function generateLiveStreamPlan(params: {
  products: Array<{ name: string; price: number; key_features: string }>;
  duration_hours?: number;
  platform?: string;
  style?: string;
}): Promise<{
  overview: string;
  product_sequence: string[];
  scripts: LiveStreamScript[];
  pricing_strategy: string;
  interaction_tactics: string[];
}> {
  const duration = params.duration_hours || 2;
  const platform = params.platform || "抖音";

  const result = await callLLM(
    `你是 GMV 百万的直播操盘手。为一场 ${duration} 小时的直播生成完整话术和排品策略。

直播结构（黄金公式）：
1. 开场暖场（5-10分钟）：人设建立 + 利益点预告 + 互动破冰
2. 引流款讲解（15-20分钟）：低价引流 → 拉停留时长 → 涨在线人数
3. 利润款讲解（核心，占 60%）：痛点场景 → 产品演示 → 价格锚定 → 逼单话术
4. 互动环节（穿插）：抽奖/问答/关注有礼
5. 收场总结（5分钟）：今日爆款回顾 → 限时优惠 → 预告下场

排品逻辑：
- 引流款（低价，吸引人）→ 过渡款（建立信任）→ 利润款（主推）→ 形象款（拉调性）
- 每个品讲解时间 = 价格 ÷ 10 分钟（$50 的品讲 5 分钟）

话术要求：
- 每句话都要口语化，像跟朋友聊天
- 痛点先行："你是不是也遇到过..."
- 价格策略："原价 XX，今天直播间..."
- 逼单话术："库存只剩 XX 件，拍完恢复原价"
- 互动指令："想要的扣 1"、"觉得值的双击"

返回 JSON：
{
  "overview": "直播主题和策略概述",
  "product_sequence": ["排品顺序：品名1 → 品名2 → ..."],
  "scripts": [
    {
      "phase": "阶段名",
      "duration": "时长",
      "script": "完整话术（300-500字）",
      "key_actions": ["关键动作1", "动作2"],
      "product_focus": "当前讲解的商品",
      "interaction_prompts": ["互动引导语1", "引导语2"]
    }
  ],
  "pricing_strategy": "价格策略说明",
  "interaction_tactics": ["互动技巧1", "技巧2", "技巧3"]
}`,
    `平台: ${platform}
直播时长: ${duration} 小时
商品列表:
${params.products.map((p, i) => `${i + 1}. ${p.name} — $${p.price} — ${p.key_features}`).join("\n")}
品牌: JOJOFEIFEI（女性运动服饰）
直播风格: ${params.style || "专业运动 + 亲和力"}`,
    4000
  );

  return result as unknown as {
    overview: string;
    product_sequence: string[];
    scripts: LiveStreamScript[];
    pricing_strategy: string;
    interaction_tactics: string[];
  };
}

// ─── 3. 选品排品策略 ────────────────────────────────────────

export async function generateProductSelectionStrategy(): Promise<{
  tiers: Array<{ tier: string; purpose: string; products: string[]; price_range: string; margin_strategy: string }>;
  combination_packs: Array<{ name: string; products: string[]; bundle_price: number; savings: string }>;
  seasonal_recommendations: string[];
  new_product_gaps: string[];
}> {
  const { data: products } = await supabase
    .from("products").select("name, price, stock, category, seo_score")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const result = await callLLM(
    `你是电商选品专家。分析现有产品线，制定选品排品策略。

选品四象限：
1. 引流款（低毛利高转化）→ 拉新客
2. 利润款（高毛利核心品）→ 赚钱
3. 形象款（高价调性品）→ 提升品牌感
4. 活动款（组合套装）→ 提客单价

返回 JSON：
{
  "tiers": [
    { "tier": "引流款/利润款/形象款/活动款", "purpose": "作用", "products": ["产品名"], "price_range": "$X-$Y", "margin_strategy": "定价策略" }
  ],
  "combination_packs": [
    { "name": "套装名", "products": ["产品1", "产品2"], "bundle_price": 套装价, "savings": "省多少" }
  ],
  "seasonal_recommendations": ["季节性选品建议"],
  "new_product_gaps": ["产品线缺口，建议开发的品类"]
}`,
    `现有产品：
${(products || []).map(p => `- ${p.name}: $${p.price}, 库存 ${p.stock}, ${p.category}`).join("\n")}
品牌: JOJOFEIFEI（女性运动服饰）
当前日期: ${new Date().toISOString().split("T")[0]}`,
    2500
  );

  return result as unknown as {
    tiers: Array<{ tier: string; purpose: string; products: string[]; price_range: string; margin_strategy: string }>;
    combination_packs: Array<{ name: string; products: string[]; bundle_price: number; savings: string }>;
    seasonal_recommendations: string[];
    new_product_gaps: string[];
  };
}
