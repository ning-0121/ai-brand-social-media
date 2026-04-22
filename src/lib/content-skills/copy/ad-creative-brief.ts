import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const adCreativeBriefSkill: ContentSkill = {
  id: "ad_creative_brief",
  name: "广告创意 Brief",
  category: "copy",
  description: "生成 Meta/TikTok 广告创意Brief：ABO→CBO结构、钩子公式、UGC脚本、达人简报",
  icon: "Megaphone",
  color: "red",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 35,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "推广商品", type: "product", required: true },
    { key: "platform", label: "投放平台", type: "select", default: "meta", options: [
      { value: "meta", label: "Meta（Facebook + Instagram）" },
      { value: "tiktok", label: "TikTok Ads" },
      { value: "both", label: "两个平台同时" },
    ]},
    { key: "campaign_objective", label: "广告目标", type: "select", default: "purchase", options: [
      { value: "purchase", label: "购买转化（ROAS 最大化）" },
      { value: "traffic", label: "网站流量" },
      { value: "awareness", label: "品牌曝光" },
      { value: "retargeting", label: "再营销（加购/访客）" },
    ]},
    { key: "budget_phase", label: "预算阶段", type: "select", default: "testing", options: [
      { value: "testing", label: "测试期（ABO，小预算验证）" },
      { value: "scaling", label: "放量期（CBO，扩大赢家）" },
    ]},
    { key: "creative_angle", label: "主打角度（可选）", type: "text", placeholder: "如：穿搭百变/显瘦/高性价比" },
    { key: "monthly_budget_usd", label: "月预算（美元，可选）", type: "text", placeholder: "如：500" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const platform = (input.platform as string) || "meta";
    const objective = (input.campaign_objective as string) || "purchase";
    const phase = (input.budget_phase as string) || "testing";
    const angle = (input.creative_angle as string) || "";
    const budget = (input.monthly_budget_usd as string) || "";

    const platformGuide: Record<string, string> = {
      meta: `META ADS 最佳实践 (2024-2025):
- ABO 测试期: 每个 Ad Set 独立预算 $10-20/天，每组测 1-2 个创意角度
- CBO 放量期: 把 ABO 验证的赢家放入同一 Campaign，让 Meta 算法分配预算
- 创意疲劳: 7-14 天后 CTR 下降超过 30% = 需要换素材
- 最佳创意格式: UGC 风格视频 > 静态图 > 精致广告片
- 受众: 兴趣受众 (测试) → 宽泛受众 (放量) → Lookalike (扩展)
- Advantage+: 开启 Advantage+ Placements 让 Meta 自动优化版位`,
      tiktok: `TIKTOK ADS 最佳实践 (2024-2025):
- Spark Ads: 优先用已有有机帖子做 Spark，69% 更高 CVR，37% 更低 CPA
- 创意核心: 前3秒钩子决定一切，要像有机内容不要像广告
- 最佳格式: 试穿/开箱视频 (try-on haul) 是服装类最高转化格式
- 频率: 每个 Ad Group 3-5 个创意，轮换避免疲劳
- 目标人群: #fashiontok #ootd 等社区定向
- VSA (Video Shopping Ads): 视频可直接跳转商品购买`,
      both: `META + TIKTOK 双平台策略:
- Meta: 以图文广告做品牌认知，视频做再营销
- TikTok: 以有机内容做测试素材，赢家转 Spark Ads
- 互补: Meta 做精准 Retargeting，TikTok 做冷启动发现
- 内容复用: TikTok 竖版视频 → 裁剪为 Meta Reels`,
    };

    const phaseGuide: Record<string, string> = {
      testing: `ABO 测试期结构:
Campaign: 1个（转化目标）
  Ad Set 1: 兴趣受众A（$15/天）× 2个创意
  Ad Set 2: 兴趣受众B（$15/天）× 2个创意
  Ad Set 3: Broad（无兴趣标签）（$15/天）× 2个创意
测试时间: 7天，花费至少 $20-50 才判断胜负
胜出标准: CTR > 2%，CPC < $1.5，ROAS > 1.5x`,
      scaling: `CBO 放量期结构:
Campaign: 1个CBO（$100-500/天总预算）
  把 ABO 测试期胜出的 Ad Sets 全部移入此 Campaign
  关闭 ROAS < 1.5x 的 Ad Sets
  每2周补充2-3个新创意进入赢家 Ad Set
  Lookalike 1-3%（用购买事件人群）`,
    };

    const output = await callLLM(
      `你是服装 DTC 品牌付费广告专家，管理过月预算超 $50K 的 Meta 和 TikTok 广告账户。

你的工作是生成一份可以直接执行的广告创意 Brief，包括：
1. 账户结构建议（ABO/CBO）
2. 创意角度矩阵（3-5个不同角度）
3. 每个角度对应的具体 Hook 文案
4. UGC 达人拍摄简报（可直接发给达人）
5. 静态图广告文案（标题 + 描述 + CTA）
6. 预算分配建议

返回 JSON:
{
  "campaign_strategy": {
    "objective": "目标",
    "phase": "测试/放量",
    "account_structure": "账户结构说明",
    "budget_allocation": "预算分配方案"
  },
  "creative_angles": [
    {
      "angle_name": "角度名称（如：穿搭百变角度）",
      "target_emotion": "触发的情感（如：自我认同感）",
      "hook_options": ["钩子1（视频开场台词）", "钩子2", "钩子3"],
      "format": "视频/图片/轮播",
      "visual_direction": "画面方向描述",
      "copy_headline": "广告标题（125字符内）",
      "copy_body": "广告正文（丰富描述，强调利益）",
      "cta": "行动按钮文字",
      "expected_audience": "最适合这个角度的受众描述"
    }
  ],
  "ugc_brief": {
    "creator_type": "适合什么类型的达人",
    "deliverables": "需要的内容规格（时长/数量/格式）",
    "talking_points": ["必须提到的点1", "点2", "点3"],
    "dont_say": ["禁止说的话"],
    "tone": "拍摄语气和风格",
    "hook_script": "建议的开场脚本（达人可自由发挥但参考此框架）",
    "example_outline": "30秒视频结构拆解"
  },
  "static_ads": [
    {
      "format": "单图/轮播",
      "headline": "标题（40字符内显示完整）",
      "description": "描述",
      "cta_button": "Shop Now / Learn More 等",
      "image_direction": "图片要求"
    }
  ],
  "performance_benchmarks": {
    "target_ctr": "目标 CTR",
    "target_cpc": "目标 CPC",
    "target_roas": "目标 ROAS",
    "fatigue_signal": "何时判断素材疲劳需要更换"
  },
  "next_steps": ["立即可执行的第一步", "第二步", "第三步"]
}`,
      `商品: ${product.name}
价格: $${product.price || "N/A"}
描述: ${(product.body_html || "").slice(0, 300)}
${product.image_url ? `商品图: ${product.image_url}` : ""}

投放平台: ${platform}
广告目标: ${objective}
预算阶段: ${phase}
${angle ? `主打角度方向: ${angle}` : ""}
${budget ? `月预算: $${budget}` : ""}

平台最佳实践:
${platformGuide[platform] || platformGuide.meta}

账户结构参考:
${phaseGuide[phase] || phaseGuide.testing}`,
      5000
    );

    return {
      skill_id: "ad_creative_brief",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
