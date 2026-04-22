import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * trust_signal_auditor — 审计店铺的信任信号覆盖
 *
 * 研究：信任信号做对 = +21.3% 营收
 */
export const trustSignalAuditorSkill: ContentSkill = {
  id: "trust_signal_audit",
  name: "信任信号审计",
  category: "copy",
  description: "检查店铺每个触点（商品页/购物车/结账/邮件）的信任信号 → 优先级修复清单",
  icon: "ShieldCheck",
  color: "green",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 25,
  agents: ["content_producer"],
  inputs: [
    { key: "store_url", label: "店铺网址", type: "text", default: "jojofeifei.com" },
    { key: "has_reviews", label: "已接入评价系统？", type: "select", default: "yes_but_few", options: [
      { value: "no", label: "未接入评价系统" },
      { value: "yes_but_few", label: "接了但评价 < 50 条" },
      { value: "yes_healthy", label: "评价 > 200 条" },
    ]},
    { key: "current_returns_policy", label: "当前退货政策", type: "text", placeholder: "如：14 天不免邮" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const storeUrl = (input.store_url as string) || "jojofeifei.com";
    const hasReviews = (input.has_reviews as string) || "yes_but_few";
    const returnsPolicy = (input.current_returns_policy as string) || "";

    // 从 DB 拉取已记录的信任信号审计
    const { data: existingAudit } = await supabase
      .from("trust_signals")
      .select("*")
      .order("page_type", { ascending: true });

    const output = await callLLM(
      `你是 DTC 电商 CRO 专家。审计店铺 5 个关键触点的信任信号。

**触点 × 信任信号矩阵（按 CVR 影响力排序）**：

1. **结账页**（最高 ROI）：
   - 明确退货政策（"30 天免费退货"）: +10-17% CVR
   - SSL 加密文字（非图标，研究显示文字更有效）: +5% trust
   - 支付图标（Apple Pay / Klarna / Afterpay）: +3% CVR
   - 运费透明 + 预期送达: +22% 完成率
   - 客户服务联系方式近结账: +3% CVR

2. **商品页**：
   - 星评摘要 + 评价数（价格旁）: +18% CVR
   - 库存紧迫感（"仅剩 X 件"）: +10-15% 加购
   - 免运费阈值: +15-20% AOV
   - 尺码指南 + 真人试穿: -8-12% 退货
   - Add to Cart 下方的信任微文案: +5% CVR

3. **购物车**：
   - 免运费提示（"再加 $X 免运"）: +15-20% AOV
   - 退货政策提醒: +12% checkout 率
   - 支付图标: +3% CVR
   - 安全结账徽章: +5% CVR

4. **首页**：
   - 聚合星评（首屏 hero 下方）: +8% 跳转商品页
   - 品牌信任背书（媒体/名人）: +12% engagement

5. **邮件**：
   - 退换货保证（产品推荐下方）: +15% 点击率
   - 免运费提醒: +10% 转化

返回 JSON（逐触点审计 + 优先级修复）:
{
  "overall_trust_score": "0-100，当前整体信任度",
  "estimated_cvr_after_fixes": "全部修复预计 CVR 提升",
  "priority_fixes": [
    {
      "rank": 1,
      "page_type": "checkout",
      "signal_missing": "30-day free returns badge",
      "current_state": "当前状态",
      "recommended_implementation": "具体怎么加（文字/位置/样式）",
      "copy_options": ["可以直接用的 3 种文案选项"],
      "estimated_impact": "+10-17% CVR",
      "effort": "low | medium",
      "shopify_instruction": "在 Shopify 具体怎么操作"
    }
  ],
  "quick_wins_under_2h": [
    {"signal": "支付图标显示", "where": "checkout", "how": "Shopify Theme settings → Payment icons"}
  ],
  "reviews_strategy": "基于当前评价状态的策略建议",
  "return_policy_rewrite": {
    "current": "${returnsPolicy}",
    "recommended": "改成这样（更清晰 + 更友好）",
    "key_changes": ["改了什么 + 为什么"]
  },
  "copy_templates": {
    "guarantee_one_liner": "可以挂在结账按钮下方的一句话",
    "ssl_badge_text": "文字版 SSL 标语",
    "free_shipping_threshold_copy": "购物车免运提醒文字"
  }
}`,
      `店铺: ${storeUrl}
评价状态: ${hasReviews}
当前退货政策: ${returnsPolicy || "未提供"}

已有审计记录:
${JSON.stringify(existingAudit || [], null, 2).slice(0, 1500)}

请给出完整的信任信号审计报告 + 按优先级排序的修复清单。每条修复必须包含可以直接用的文案，不要占位符。`,
      4500
    );

    return {
      skill_id: "trust_signal_audit",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
