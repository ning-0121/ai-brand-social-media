/**
 * 25 维竞品对比框架 — 研究验证（见 ARCHITECTURE.md）
 *
 * 4 大类 · 25 项 · 100 分制：
 *   - 实物对比 40 分（拿到货后打）
 *   - 电商体验 35 分（跑完购买 + 邮件 + 客服可打）
 *   - 定价定位 15 分（看官网 + 历史折扣即可）
 *   - 品牌营销 10 分（查社媒 + 广告库）
 */

export type RubricGroup = "physical" | "ecommerce" | "pricing" | "marketing";

export interface RubricDimension {
  key: string;
  label: string;
  group: RubricGroup;
  max_score: number;
  description: string;
  requires_physical: boolean; // 是否需要拿到实物才能评
  how_to_evaluate: string;    // 具体怎么打
}

export const TEARDOWN_RUBRIC: RubricDimension[] = [
  // ── 实物对比 40 分 ─────────────────────────────────────────
  // 构造与材料 15 分
  { key: "fabric_weight", label: "面料克重/成分", group: "physical", max_score: 3, requires_physical: true,
    description: "克重（g/m²）与标签声明是否一致；成分是否纯料",
    how_to_evaluate: "用克重秤测量 100cm² 样品；对比标签 → 3分：与标签一致；2分：差 <10%；1分：差 >10%；0分：成分造假" },
  { key: "stitching_quality", label: "缝线质量", group: "physical", max_score: 3, requires_physical: true,
    description: "针脚密度/均匀度/跳针/线头处理",
    how_to_evaluate: "数每英寸针数（标准 8-12），看缝线是否走偏、跳针、线头是否处理 → 3分：完美；2分：有 1-2 处瑕疵；1分：多处；0分：脱线风险" },
  { key: "seam_strength", label: "缝线强度", group: "physical", max_score: 2, requires_physical: true,
    description: "拉扯压力下接缝是否开裂",
    how_to_evaluate: "手动拉扯 20 次 → 全过/开线/严重开线" },
  { key: "zipper_closures", label: "五金/拉链/扣子质量", group: "physical", max_score: 2, requires_physical: true,
    description: "拉链顺滑度、对齐、金属 vs 塑料",
    how_to_evaluate: "拉合 50 次 → 顺滑不卡 / 偶尔卡 / 质量差" },
  { key: "edge_finishing", label: "边缘处理", group: "physical", max_score: 2, requires_physical: true,
    description: "下摆/袖口/领口是否包边、是否抗脱线",
    how_to_evaluate: "观察 + 摩擦测试" },
  { key: "pocket_construction", label: "口袋构造", group: "physical", max_score: 1, requires_physical: true,
    description: "深度够用、应力点有加固",
    how_to_evaluate: "装入日常物品测试" },
  { key: "label_quality", label: "标签/尺码牌", group: "physical", max_score: 2, requires_physical: true,
    description: "内标位置/材质/水洗后是否清晰",
    how_to_evaluate: "观察 + 1 次洗涤后再看" },

  // 版型/尺码 10 分
  { key: "size_accuracy", label: "尺码是否准", group: "physical", max_score: 4, requires_physical: true,
    description: "与尺码表实测是否一致",
    how_to_evaluate: "卷尺量胸围/腰围/袖长 → 与尺码表对比，误差 <1cm 满分" },
  { key: "shoulder_symmetry", label: "两侧对称度", group: "physical", max_score: 2, requires_physical: true,
    description: "左右袖长、肩宽是否对称",
    how_to_evaluate: "平铺对折" },
  { key: "balance_wearing", label: "上身平衡感", group: "physical", max_score: 2, requires_physical: true,
    description: "穿上后不歪、不坠",
    how_to_evaluate: "试穿 + 镜子观察" },
  { key: "fabric_stretch_recovery", label: "面料回弹（如适用）", group: "physical", max_score: 2, requires_physical: true,
    description: "拉伸后是否回弹",
    how_to_evaluate: "反复拉伸 20 次后观察" },

  // 包装/开箱 8 分
  { key: "unboxing_experience", label: "开箱体验", group: "physical", max_score: 3, requires_physical: true,
    description: "打开包裹那一刻的视觉/触觉冲击",
    how_to_evaluate: "极简 vs 精致 vs 惊喜感" },
  { key: "protective_materials", label: "保护材料", group: "physical", max_score: 2, requires_physical: true,
    description: "防潮袋/棉纸/固定/感谢卡",
    how_to_evaluate: "有感谢卡+贴纸+棉纸 3分；基础包装 1分" },
  { key: "packaging_sustainability", label: "环保度", group: "physical", max_score: 2, requires_physical: true,
    description: "可回收、无塑料、可重复使用",
    how_to_evaluate: "材质标签观察" },
  { key: "size_to_product_ratio", label: "包装尺寸合理性", group: "physical", max_score: 1, requires_physical: true,
    description: "过大浪费物流成本",
    how_to_evaluate: "对比包装大小与产品大小" },

  // 感知品质 7 分
  { key: "hand_feel", label: "面料手感", group: "physical", max_score: 3, requires_physical: true,
    description: "摸上去是廉价还是高级",
    how_to_evaluate: "主观评分 1-3" },
  { key: "branding_quality", label: "品牌印/绣标质量", group: "physical", max_score: 2, requires_physical: true,
    description: "Logo 印刷/刺绣精度",
    how_to_evaluate: "观察细节" },
  { key: "first_impression_vs_price", label: "首印象与价格匹配", group: "physical", max_score: 2, requires_physical: true,
    description: "付出 $X 的体验感是否对得起价格",
    how_to_evaluate: "价格带对标" },

  // ── 电商体验 35 分 ─────────────────────────────────────────
  // 商品页 10 分
  { key: "pdp_photography", label: "商品页摄影", group: "ecommerce", max_score: 3, requires_physical: false,
    description: "角度数/场景图/细节图/变体颜色展示",
    how_to_evaluate: "数照片 → <5 张 0分；5-10 张 1分；10-15 张 2分；>15 张+视频 3分" },
  { key: "pdp_video", label: "商品视频", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "开箱/试穿/360度",
    how_to_evaluate: "有 2分；没有 0分" },
  { key: "pdp_copy_quality", label: "商品描述文案", group: "ecommerce", max_score: 3, requires_physical: false,
    description: "利益点清晰 / 场景化 / 社会证明密度",
    how_to_evaluate: "主观判断 1-3" },
  { key: "pdp_size_guide", label: "尺码指南", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "详细尺寸表 + 试穿建议 + 真人评价对照",
    how_to_evaluate: "齐全 2分；只有尺寸表 1分；无 0分" },

  // 结账流程 10 分
  { key: "checkout_steps", label: "结账步数", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "1 页 vs 多步",
    how_to_evaluate: "1 页 2分；2-3 步 1分；4+ 步 0分" },
  { key: "guest_checkout", label: "游客结账", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "是否强制注册",
    how_to_evaluate: "不强制 2分；可跳过 1分；强制 0分" },
  { key: "shipping_transparency", label: "运费透明度", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "结账前能否看到总运费",
    how_to_evaluate: "商品页就显示 2分；购物车 1分；最后一步才看到 0分" },
  { key: "payment_options", label: "支付选项", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "Apple Pay / Google Pay / Klarna / Afterpay 等",
    how_to_evaluate: "4+ 种 2分；2-3 种 1分；只有信用卡 0分" },
  { key: "upsell_presence", label: "加购推荐",group: "ecommerce", max_score: 2, requires_physical: false,
    description: "购物车/结账是否推相关商品",
    how_to_evaluate: "智能 2分；通用 1分；没有 0分" },

  // 购后邮件 8 分
  { key: "order_confirmation", label: "订单确认邮件", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "即时/品牌视觉/包含 FAQ",
    how_to_evaluate: "1 分钟内收到+有品牌感 2分；基础 1分" },
  { key: "shipping_updates", label: "发货更新", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "主动推送发货/在途/签收",
    how_to_evaluate: "三次主动通知 2分；只有一次 1分" },
  { key: "post_delivery_email", label: "送达后邮件", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "保养指南/搭配建议/评价邀请",
    how_to_evaluate: "有 2分；没有 0分" },
  { key: "winback_triggers", label: "召回机制", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "一段时间没回购是否有 winback 邮件",
    how_to_evaluate: "30 天内收到 2分；60 天 1分；没有 0分" },

  // 客服 7 分
  { key: "return_policy", label: "退货政策", group: "ecommerce", max_score: 3, requires_physical: false,
    description: "天数 / 是否免费 / 是否含补货费",
    how_to_evaluate: "60 天免费 3分；30 天免费 2分；30 天自付 1分；<30 天或高门槛 0分" },
  { key: "support_response_time", label: "客服响应时长", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "提问到首次响应用时",
    how_to_evaluate: "<1 小时 2分；<24 小时 1分；>24 小时 0分" },
  { key: "support_channels", label: "客服渠道", group: "ecommerce", max_score: 2, requires_physical: false,
    description: "在线聊天 / 邮件 / 电话 / WhatsApp",
    how_to_evaluate: "3+ 渠道 2分；1-2 渠道 1分；只有邮件 0分" },

  // ── 定价定位 15 分 ─────────────────────────────────────────
  { key: "msrp_vs_typical_price", label: "MSRP vs 常态售价", group: "pricing", max_score: 3, requires_physical: false,
    description: "常在打折 vs 稳价",
    how_to_evaluate: "长期稳价 3分；季度性 2分；每月都在打折 0分" },
  { key: "bundle_pricing", label: "套装定价", group: "pricing", max_score: 3, requires_physical: false,
    description: "是否有有吸引力的套装",
    how_to_evaluate: "有明显优惠 3分；有套装但优惠不大 1分；没有 0分" },
  { key: "loyalty_pricing", label: "会员/订阅定价", group: "pricing", max_score: 3, requires_physical: false,
    description: "会员层级/订阅折扣",
    how_to_evaluate: "多层级 3分；基础会员 1分；没有 0分" },
  { key: "promo_calendar_depth", label: "促销日历深度", group: "pricing", max_score: 3, requires_physical: false,
    description: "黑五/双11 折扣力度",
    how_to_evaluate: ">30% 3分；20-30% 2分；<20% 1分" },
  { key: "competitive_positioning", label: "与同类价格的定位", group: "pricing", max_score: 3, requires_physical: false,
    description: "相对同类属于什么档位",
    how_to_evaluate: "溢价合理 3分；过高 1分；过低（品牌稀释）1分" },

  // ── 品牌营销 10 分 ────────────────────────────────────────
  { key: "ad_creative_quality", label: "广告创意质量", group: "marketing", max_score: 3, requires_physical: false,
    description: "Meta Ad Library 可查广告",
    how_to_evaluate: "UGC+精致混搭 3分；只有精致 2分；低质 1分" },
  { key: "review_density", label: "评价密度", group: "marketing", max_score: 3, requires_physical: false,
    description: "平均评价数 + 星级 + 照片评价比例",
    how_to_evaluate: ">500 条 4.5+ 30%带图 3分；>100 2分；<100 1分" },
  { key: "influencer_activity", label: "KOL 活跃度", group: "marketing", max_score: 2, requires_physical: false,
    description: "被 KOL 提及的频率",
    how_to_evaluate: "搜 #品牌名 + 观察 KOL 数量" },
  { key: "seo_presence", label: "SEO 存在感", group: "marketing", max_score: 2, requires_physical: false,
    description: "品牌词 + 品类词是否排前",
    how_to_evaluate: "用 Ahrefs/免费工具查 Organic Keywords" },
];

export const GROUP_LABELS: Record<RubricGroup, string> = {
  physical: "实物对比",
  ecommerce: "电商体验",
  pricing: "定价定位",
  marketing: "品牌营销",
};

export const GROUP_MAX_SCORES: Record<RubricGroup, number> = {
  physical: 40,
  ecommerce: 35,
  pricing: 15,
  marketing: 10,
};

export function getDimensionsByGroup(group: RubricGroup): RubricDimension[] {
  return TEARDOWN_RUBRIC.filter(d => d.group === group);
}

export function calculateTotalScore(scores: Record<string, number | null | undefined>): {
  total: number;
  max: number;
  by_group: Record<RubricGroup, { score: number; max: number }>;
  completed: number;
  total_dimensions: number;
} {
  const byGroup: Record<RubricGroup, { score: number; max: number }> = {
    physical: { score: 0, max: 0 },
    ecommerce: { score: 0, max: 0 },
    pricing: { score: 0, max: 0 },
    marketing: { score: 0, max: 0 },
  };
  let total = 0;
  let max = 0;
  let completed = 0;

  for (const dim of TEARDOWN_RUBRIC) {
    const s = scores[dim.key];
    byGroup[dim.group].max += dim.max_score;
    max += dim.max_score;
    if (typeof s === "number") {
      byGroup[dim.group].score += Math.min(s, dim.max_score);
      total += Math.min(s, dim.max_score);
      completed++;
    }
  }

  return { total, max, by_group: byGroup, completed, total_dimensions: TEARDOWN_RUBRIC.length };
}

export type TeardownStatus = "identified" | "purchased" | "received" | "analyzing" | "completed";

export const STATUS_LABELS: Record<TeardownStatus, string> = {
  identified: "已识别",
  purchased: "已下单",
  received: "已收货",
  analyzing: "分析中",
  completed: "已完成",
};
