import { callLLM } from "../llm";
import { supabase } from "../../supabase";
import { getStoreKPIs } from "../../supabase-queries";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const storeHealthAuditSkill: ContentSkill = {
  id: "store_health_audit",
  name: "独立站健康诊断",
  category: "copy",
  description: "完整独立站审计：CVR基准/速度/结账/信任信号/邮件获取/Upsell，给出优先级修复清单",
  icon: "Stethoscope",
  color: "blue",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 35,
  agents: ["content_producer"],
  inputs: [
    { key: "store_url", label: "店铺网址", type: "text", default: "jojofeifei.com" },
    { key: "monthly_visitors", label: "月访客数（可选）", type: "text", placeholder: "如：5000" },
    { key: "current_cvr", label: "当前转化率 % (可选)", type: "text", placeholder: "如：2.1" },
    { key: "current_aov", label: "当前客单价 $ (可选)", type: "text", placeholder: "如：65" },
    { key: "mobile_traffic_pct", label: "移动端流量占比 % (可选)", type: "text", placeholder: "如：70" },
    { key: "focus_area", label: "重点审计方向", type: "select", default: "full", options: [
      { value: "full", label: "全面诊断" },
      { value: "checkout", label: "结账流程" },
      { value: "product_pages", label: "商品页面" },
      { value: "mobile", label: "移动端体验" },
      { value: "aov", label: "客单价提升" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const storeUrl = (input.store_url as string) || "jojofeifei.com";
    const visitors = parseInt((input.monthly_visitors as string) || "0");
    const currentCvr = parseFloat((input.current_cvr as string) || "0");
    const currentAov = parseFloat((input.current_aov as string) || "0");
    const mobilePct = parseFloat((input.mobile_traffic_pct as string) || "70");
    const focusArea = (input.focus_area as string) || "full";

    // Pull real store KPIs
    const kpis = await getStoreKPIs();
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, seo_score, meta_title, meta_description, body_html, stock, tags")
      .limit(20);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: orders } = await supabase
      .from("shopify_orders")
      .select("total_price, line_items")
      .gte("created_at", thirtyDaysAgo)
      .limit(200);

    const orderCount = orders?.length || 0;
    const totalRevenue = orders?.reduce((s, o) => s + Number(o.total_price || 0), 0) || 0;
    const realAov = orderCount > 0 ? totalRevenue / orderCount : currentAov;

    const seoIssues = (products || []).filter(p =>
      !p.meta_title || !p.meta_description || !p.body_html || (p.body_html?.length || 0) < 200
    ).length;

    const output = await callLLM(
      `你是 Shopify 独立站 CRO（转化率优化）专家，审计过 $1M+ 年销的 DTC 品牌，深度掌握每个优化杠杆的真实提升幅度。

行业基准数据（必须用这些数字做对比）：

【转化率基准】
- Shopify 平均 CVR：2.76%（桌面端 2.83%，移动端 2.72%）
- 优秀品牌：4-6%（Glossier 5-5.5%，Gymshark 3.5%+）
- 移动端 vs 桌面端 CVR 差距：通常 37%（移动更低，是最大优化机会）

【速度对 CVR 的影响】
- 每慢 1 秒：CVR 下降 7%
- 3 秒以上：跳出率增加 32%
- 5 秒以上：跳出率增加 90%
- 目标：LCP < 2.5 秒，FID < 100ms

【结账优化（最高单点 ROI）】
- Shop Pay 接入：CVR +50%
- 一页式结账 vs 多步：+21.8%
- 弃购主因：预期外费用 48%，强制注册 24%，信任不足 18%
- 客人结账（不强制注册）：必须开启
- 信任标志放在结账按钮下方（非页面底部）：+10-17%

【商品页优化】
- 3 条以上利益点（结构化）vs 段落文字：CVR +18%
- 社会证明放在价格旁边（不是页面底部）：更高转化
- 库存紧迫感（仅剩 X 件）：加购率 +10-15%
- 高质量多角度图片（5 张以上）vs 单张：CVR +20-25%

【邮件获取】
- 退出意向弹窗：额外回收 10-12% 的离站访客
- 首单折扣弹窗：通常 2-5% 邮件获取率
- 最优弹窗时机：访问 30 秒后 或 滚动 50% 时

【AOV 提升】
- Bundle/Upsell 位置效果：商品页 8-15%，购物车 5-12%，购后 3-8%
- 最优 Upsell 价格范围：主商品价格的 15-40%（超 50% 会产生新决策摩擦）
- 免运费门槛激励：平均提升 AOV 15-20%

返回完整 JSON 审计报告。`,
      `店铺: ${storeUrl}
重点审计: ${focusArea}

实际数据:
- 近 30 天订单: ${orderCount} 单
- 近 30 天营收: $${totalRevenue.toFixed(0)}
- 实际客单价: $${realAov.toFixed(1)}
- 输入的 CVR: ${currentCvr || "未提供"}%
- 月访客数: ${visitors || "未提供"}
- 移动端占比: ${mobilePct}%
- 有 SEO 问题的商品: ${seoIssues}/${products?.length || 0}
- 总商品数: ${kpis.totalProducts}
- 平均 SEO 分: ${kpis.avgSEO}
- 缺货商品: ${kpis.outOfStock}

商品问题摘要:
${(products || []).slice(0, 10).map(p => {
  const issues = [];
  if (!p.meta_title) issues.push("无meta_title");
  if (!p.meta_description) issues.push("无meta_desc");
  if (!p.body_html || p.body_html.length < 200) issues.push("描述过短");
  if (!p.tags) issues.push("无标签");
  return `- ${p.name}: SEO${p.seo_score || 0}分 ${issues.length > 0 ? issues.join(",") : "✓"}`;
}).join("\n")}

请返回 JSON:
{
  "overall_score": "1-100 店铺健康分",
  "priority_fixes": [
    {
      "rank": 1,
      "area": "结账 | 商品页 | 速度 | 移动端 | SEO | 邮件获取 | AOV",
      "issue": "具体问题",
      "current_state": "现状",
      "benchmark": "行业基准",
      "fix": "具体修复方案（可执行的步骤）",
      "estimated_cvr_lift": "预计 CVR 提升",
      "effort": "low | medium | high",
      "priority": "critical | high | medium"
    }
  ],
  "quick_wins": [
    {"fix": "2小时内可完成的改动", "estimated_impact": "预期效果"}
  ],
  "cvr_analysis": {
    "current": ${currentCvr || 0},
    "industry_avg": 2.76,
    "gap": "${currentCvr ? (2.76 - currentCvr).toFixed(2) : "需提供数据"}",
    "potential_after_fixes": "预计优化后 CVR"
  },
  "aov_analysis": {
    "current": ${realAov.toFixed(1)},
    "upsell_opportunity": "具体 bundle/upsell 建议",
    "estimated_aov_lift": "预计提升金额"
  },
  "mobile_specific": {
    "mobile_traffic_pct": ${mobilePct},
    "critical_mobile_fixes": ["移动端专项优化建议"]
  },
  "revenue_impact_estimate": {
    "monthly_visitors_assumed": ${visitors || "需要数据"},
    "revenue_lift_if_all_fixes": "全部修复后预计月增收"
  }
}`,
      5000
    );

    return {
      skill_id: "store_health_audit",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
