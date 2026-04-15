import { analyzeAbandonedCarts } from "../../shopify-email-marketing";
import { analyzeReviewOpportunity } from "../../shopify-product-reviews";
import { callLLM } from "../llm";
import type { ContentSkill, SkillResult } from "../types";

export const storeGrowthPlannerSkill: ContentSkill = {
  id: "store_growth_planner",
  name: "独立站增长诊断",
  category: "copy",
  description: "全面诊断独立站增长瓶颈 — 弃购恢复、评价收集、转化优化、流量策略",
  icon: "TrendingUp",
  color: "green",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 15,
  agents: ["store_optimizer"],
  inputs: [],
  async execute(): Promise<SkillResult> {
    // 并行获取所有数据
    const [abandonedCarts, reviewOpportunity] = await Promise.all([
      analyzeAbandonedCarts(),
      analyzeReviewOpportunity(),
    ]);

    // AI 生成增长策略
    const strategy = await callLLM(
      `你是月销百万的 DTC 独立站操盘手。基于数据诊断当前最大的增长瓶颈，并给出 5 个立即可执行的增长动作。

规则：
1. 每个动作必须具体到可以今天开始做
2. 排序按 ROI 高低（投入少、回报大的排前面）
3. 不要说"建议考虑"，要说"今天做 X，预计 Y 效果"
4. 包含：弃购恢复、评价收集、SEO、社媒、广告 5 个维度

返回 JSON：
{
  "biggest_bottleneck": "最大瓶颈一句话",
  "growth_actions": [
    { "action": "具体做什么", "channel": "弃购/评价/SEO/社媒/广告", "effort": "low/medium/high", "expected_impact": "预期效果", "timeline": "多快见效" }
  ],
  "30_day_revenue_forecast": "如果全部执行，30天预估新增营收"
}`,
      `弃购数据：${JSON.stringify(abandonedCarts)}
评价机会：${JSON.stringify(reviewOpportunity)}
品牌：JOJOFEIFEI（女性运动服饰，$49-$98）
当前状态：店铺有流量但转化低，社媒内容少，无广告投放`,
      1500
    );

    return {
      skill_id: "store_growth_planner",
      output: {
        abandoned_carts: abandonedCarts,
        review_opportunity: reviewOpportunity,
        growth_strategy: strategy,
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
