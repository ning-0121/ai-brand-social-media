import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * quality_feedback_analyzer — 从真实订单 + 评价 + 退货数据找品质问题
 *
 * 核心：不是自我吹嘘，是主动找产品问题并联系供应商整改
 */
export const qualityFeedbackAnalyzerSkill: ContentSkill = {
  id: "quality_feedback_analyzer",
  name: "产品品质反馈闭环",
  category: "copy",
  description: "扫描评价+退货数据，按 SKU 找质量问题，生成供应商整改沟通稿",
  icon: "Wrench",
  color: "orange",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "scope", label: "扫描范围", type: "select", default: "top_30_by_orders", options: [
      { value: "top_30_by_orders", label: "TOP 30 销量商品" },
      { value: "all_with_reviews", label: "所有有评价的商品" },
      { value: "specific_product", label: "指定单品（选商品）" },
    ]},
    { key: "product", label: "（可选）指定单品", type: "product" },
    { key: "days_back", label: "回看天数", type: "select", default: "90", options: [
      { value: "30", label: "30 天" },
      { value: "90", label: "90 天" },
      { value: "180", label: "180 天" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const scope = (input.scope as string) || "top_30_by_orders";
    const product = input.product;
    const daysBack = parseInt((input.days_back as string) || "90");
    const fromDate = new Date(Date.now() - daysBack * 86400000).toISOString();

    // 拉真实数据
    const { data: orders } = await supabase
      .from("shopify_orders")
      .select("id, line_items, total_price, refunded, cancelled_at, created_at")
      .gte("created_at", fromDate)
      .limit(500);

    // 汇总每个 SKU 的订单数 / 退款
    const skuStats: Record<string, {
      product_id?: string;
      units_sold: number;
      orders_with_refund: number;
      orders_cancelled: number;
    }> = {};

    for (const o of orders || []) {
      const items = (o.line_items as Array<{ product_id?: string | number; quantity?: number }>) || [];
      for (const item of items) {
        const pid = String(item.product_id || "");
        if (!pid) continue;
        if (!skuStats[pid]) skuStats[pid] = { units_sold: 0, orders_with_refund: 0, orders_cancelled: 0 };
        skuStats[pid].units_sold += item.quantity || 0;
        if (o.refunded) skuStats[pid].orders_with_refund++;
        if (o.cancelled_at) skuStats[pid].orders_cancelled++;
      }
    }

    // 计算问题率
    const problemRates = Object.entries(skuStats).map(([pid, s]) => ({
      shopify_product_id: pid,
      units_sold: s.units_sold,
      refund_rate_pct: s.units_sold > 0 ? Number(((s.orders_with_refund / s.units_sold) * 100).toFixed(1)) : 0,
      cancel_rate_pct: s.units_sold > 0 ? Number(((s.orders_cancelled / s.units_sold) * 100).toFixed(1)) : 0,
    })).filter(p => p.units_sold > 2).sort((a, b) => b.refund_rate_pct - a.refund_rate_pct).slice(0, 10);

    // 查已记录的质量问题
    const { data: existingIssues } = await supabase
      .from("product_quality_issues")
      .select("*")
      .eq("resolved", false)
      .order("severity", { ascending: false });

    // 拉对应产品信息
    const productIds = problemRates.map(p => p.shopify_product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, body_html, shopify_product_id")
      .in("shopify_product_id", productIds);

    const enrichedProblems = problemRates.map(p => {
      const prod = products?.find(pr => String(pr.shopify_product_id) === p.shopify_product_id);
      return {
        product_name: prod?.name || "未知",
        product_id: prod?.id,
        ...p,
      };
    });

    const specificProduct = scope === "specific_product" && product ? {
      name: product.name,
      id: product.id,
      category: product.category,
      price: product.price,
      description: (product.body_html || "").slice(0, 300),
    } : null;

    const output = await callLLM(
      `你是产品质量运营总监。分析店铺真实数据，找出产品质量隐患，生成行动清单。

**你的原则**：
1. 数据驱动：不猜，只看退货率/退款率/投诉频率
2. 分级处理：严重问题立即停售 + 联系供应商；轻微问题先观察
3. 沟通稿要专业：供应商要的是具体问题 + 图片证据 + 整改方案
4. 保护客户体验：同一 SKU 超过 5% 退款率 → 考虑下架或大降价清仓

**常见品类问题诊断公式**：
- 退款率 > 10% = 严重品质问题，立即调查
- 退款率 5-10% = 中等，一周内联系供应商
- 退款率 3-5% = 观察，收集更多证据
- 退款率 < 3% = 正常范围

**具体问题 → 根因映射**：
- 尺码不对 → 板型设计 / 尺码表错 / 面料缩水率
- 颜色不一致 → 染色批次 / 屏幕显示色差
- 面料质量 → 克重 / 成分 / 处理工艺
- 运输损坏 → 包装材料 / 包装方式 / 物流环节
- 做工问题 → 缝线质量 / QC 流程

返回 JSON:
{
  "quality_health_score": "0-100 店铺整体品质分",
  "flagged_skus": [
    {
      "product_name": "商品名",
      "units_sold": 数字,
      "refund_rate_pct": 数字,
      "severity": "critical | high | medium | low",
      "suspected_issues": ["疑似问题1", "问题2"],
      "evidence_needed": ["需要收集的证据"],
      "immediate_action": "立即该做什么（24h 内）",
      "supplier_action": "给供应商要什么"
    }
  ],
  "supplier_communication_template": {
    "subject": "给供应商邮件主题",
    "body": "完整邮件正文（含问题描述 + 具体数据 + 整改要求 + deadline）",
    "attachments_needed": ["需要附上的证据"]
  },
  "preventive_measures": [
    {"area": "QC 流程", "change": "建议改动", "expected_impact": "预期效果"}
  ],
  "short_term_tactical": [
    {"action": "短期缓解措施", "sku": "影响的 SKU", "example": "比如临时下架 / 加免费换货"}
  ],
  "tracking_cadence": {
    "weekly_review": "每周要盯的指标",
    "monthly_review": "每月要盯的指标"
  }
}`,
      `扫描范围: ${scope}
回看天数: ${daysBack}
${specificProduct ? `指定商品: ${JSON.stringify(specificProduct)}` : ""}

TOP 10 退款率最高的 SKU:
${JSON.stringify(enrichedProblems, null, 2)}

已记录待解决质量问题:
${JSON.stringify(existingIssues || [], null, 2).slice(0, 1500)}

请给出完整的品质诊断报告 + 供应商沟通稿。`,
      5000
    );

    return {
      skill_id: "quality_feedback_analyzer",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
