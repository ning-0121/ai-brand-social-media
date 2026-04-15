import { generateContentMatrix, generateLiveStreamPlan, generateProductSelectionStrategy } from "../../content-matrix";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const contentMatrixSkill: ContentSkill = {
  id: "content_matrix",
  name: "矩阵内容一键生成",
  category: "social",
  description: "一个主题 → 5 个平台差异化内容（小红书/抖音/IG/TikTok/微信）",
  icon: "Hash",
  color: "purple",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "topic", label: "内容主题", type: "text", required: true, placeholder: "如：夏季运动穿搭、瑜伽初学者必备" },
    { key: "product", label: "关联商品（可选）", type: "product" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await generateContentMatrix({
      topic: input.topic as string,
      product_name: input.product?.name,
      product_price: input.product?.price,
    });
    return { skill_id: "content_matrix", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.03, image: 0 } };
  },
};

export const liveStreamPlanSkill: ContentSkill = {
  id: "live_stream_plan",
  name: "直播全流程策划",
  category: "social",
  description: "直播话术 + 排品策略 + 互动技巧 + 逼单话术 — 完整直播脚本",
  icon: "Video",
  color: "red",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 25,
  agents: ["content_producer"],
  inputs: [
    { key: "duration", label: "直播时长（小时）", type: "select", default: "2", options: [
      { value: "1", label: "1 小时" },
      { value: "2", label: "2 小时" },
      { value: "3", label: "3 小时" },
    ]},
    { key: "platform", label: "平台", type: "select", default: "抖音", options: [
      { value: "抖音", label: "抖音" },
      { value: "快手", label: "快手" },
      { value: "小红书", label: "小红书" },
      { value: "TikTok", label: "TikTok" },
      { value: "Instagram", label: "Instagram Live" },
    ]},
    { key: "style", label: "直播风格", type: "select", default: "专业运动+亲和力", options: [
      { value: "专业运动+亲和力", label: "专业运动 + 亲和力" },
      { value: "闺蜜种草", label: "闺蜜种草风" },
      { value: "高端品质", label: "高端品质感" },
      { value: "活力热血", label: "活力热血风" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    // 获取产品列表
    const { supabase } = await import("../../supabase");
    const { data: products } = await supabase
      .from("products").select("name, price, body_html, category")
      .eq("platform", "shopify").not("shopify_product_id", "is", null).limit(10);

    const productList = (products || []).map(p => ({
      name: p.name,
      price: p.price,
      key_features: (p.body_html || "").replace(/<[^>]*>/g, "").slice(0, 100) || p.category,
    }));

    const result = await generateLiveStreamPlan({
      products: productList,
      duration_hours: parseInt(input.duration as string) || 2,
      platform: input.platform as string,
      style: input.style as string,
    });

    return { skill_id: "live_stream_plan", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.03, image: 0 } };
  },
};

export const productSelectionSkill: ContentSkill = {
  id: "product_selection_strategy",
  name: "选品排品策略",
  category: "social",
  description: "产品分层（引流/利润/形象/活动）+ 组合套装 + 产品线缺口分析",
  icon: "TrendingUp",
  color: "amber",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 12,
  agents: ["store_optimizer"],
  inputs: [],
  async execute(): Promise<SkillResult> {
    const result = await generateProductSelectionStrategy();
    return { skill_id: "product_selection_strategy", output: result, generated_at: new Date().toISOString(), estimated_cost: { text: 0.02, image: 0 } };
  },
};
