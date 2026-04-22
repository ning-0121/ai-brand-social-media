/**
 * Skill: incrementality_tester
 * 增量测试设计 — 真实 ROI 衡量方法论（而非 last-click 幻觉）
 *
 * Research basis:
 * - Last-click attribution overcredits email by 50% and undercredits paid social by 35%
 * - Geo holdout tests: gold standard for channel-level incrementality (Meta, Google both use)
 * - Holdout group size: 10-20% of audience; > 20% wastes revenue, < 10% lacks statistical power
 * - Minimum detectable effect: need 80%+ statistical power at p < 0.05
 * - Required sample size for 95% confidence: (Z_α + Z_β)² × 2σ² / Δ²
 * - Lift threshold worth acting on: > 5% revenue lift (below this = noise)
 * - PSA (Public Service Announcement) test: control group sees charity ad, measures true ad lift
 * - Minimum test duration: 2 weeks; optimal: 4 weeks for seasonal normalization
 * - Meta Conversion Lift: built-in, free, 2-week minimum
 * - Google Conversion Lift: available in Google Ads, geo or audience-based
 */

import { callLLM } from "@/lib/content-skills/llm";
import type { ContentSkill, SkillInputData, SkillResult } from "@/lib/content-skills/types";

export interface IncrementalityTestInput {
  channel_to_test: string;         // "meta_ads" | "google_ads" | "email" | "tiktok_ads" | "influencer"
  monthly_budget: string;          // e.g. "$5,000"
  current_attributed_roas: string; // e.g. "3.2x (last-click)"
  monthly_orders: string;          // e.g. "200"
  test_duration_weeks?: string;    // default "4"
  holdout_pct?: string;            // default "15"
  primary_kpi?: string;            // "revenue" | "new_customers" | "return_rate"
}

export async function designIncrementalityTest(
  input: IncrementalityTestInput
): Promise<Record<string, unknown>> {
  const holdout = parseFloat(input.holdout_pct || "15");
  const weeks = parseFloat(input.test_duration_weeks || "4");

  const result = await callLLM(
    `你是营销数据科学家，专精 DTC 品牌增量测试设计。
帮助品牌从「last-click ROAS 幻觉」转向「真实增量 ROI」。

**核心概念（必须在报告中解释）：**
- Last-click 归因：只给最后触点记功，严重高估 email/retargeting，低估 brand awareness
- 增量价值 = 有广告组的收入 - 无广告组的收入（控制组）
- 真实 iROAS = 增量收入 / 实际广告花费
- 经验规律：大多数品牌的真实 iROAS 比 last-click 报告低 30-50%

**测试方法论：**

1. **Geo Holdout Test（最精准）：**
   - 选择相似的地理区域作为测试/控制组
   - 实验组正常投放，控制组暂停该渠道
   - 统计两组收入差值 = 真实增量
   - 适合：Meta Ads, Google Ads, 全国性活动

2. **Audience Holdout（平台内置）：**
   - Meta Conversion Lift: 随机 15% 受众不看广告，比对购买率
   - Google Conversion Lift: 类似机制
   - 成本：免费（平台工具）
   - 适合：日预算 > $200，规模足够产生统计显著性

3. **PSA Test（第三方渠道）：**
   - 控制组看无关 PSA 广告（公益广告），实验组看你的广告
   - 比较两组购买率
   - 适合：TikTok, Pinterest 等无原生 Lift 工具的平台

**统计显著性要求：**
- 样本量：控制组需要 ≥ ${Math.round(200 * holdout * 0.01 * (weeks / 4))} 次转化事件才能达到 80% 统计效力
- 最短测试时间：${weeks} 周（不少于 2 周，避免周期效应）
- 控制组大小：${holdout}%（过小→检测力不足，过大→浪费收入）

**结果解读框架：**
- iROAS > last-click ROAS：广告效果被低估，可以加预算
- iROAS ≈ last-click ROAS：归因比较准，维持现状
- iROAS < last-click ROAS × 0.7：广告效果被高估，需要减预算或更换策略

返回严格 JSON：
{
  "channel_tested": "...",
  "test_methodology": "Audience Holdout (Meta Conversion Lift) | Geo Holdout | PSA Test",
  "why_this_method": "选择理由",
  "test_design": {
    "test_group": "85% 受众正常看广告",
    "control_group": "${holdout}% 受众不看广告（或看 PSA）",
    "duration_weeks": ${weeks},
    "start_date_suggestion": "周二开始（避免周末偏差）",
    "minimum_conversions_needed": ${Math.round(100 * holdout * 0.01 * weeks * 5)},
    "statistical_power": "80%",
    "confidence_level": "95%"
  },
  "current_attribution_audit": {
    "reported_roas": "3.2x（last-click）",
    "estimated_true_iroas_range": "1.8x-2.5x（经验估算）",
    "attribution_bias": "预计高估约 30-45%",
    "channels_likely_overcredited": ["Email retargeting", "Brand search"],
    "channels_likely_undercredited": ["Prospecting social", "Influencer content"]
  },
  "measurement_plan": {
    "primary_kpi": "Revenue per unique user",
    "secondary_kpis": ["New customer rate", "Average order value"],
    "data_collection": "平台原生工具 + GA4 双验证",
    "holdout_tracking": "隔离 Cookie / Device ID，不显示任何品牌广告"
  },
  "expected_insights": [
    "量化 ${input.channel_to_test} 的真实增量价值",
    "识别是否存在「自然转化」被广告领功的情况",
    "优化预算分配至真正产生增量的受众"
  ],
  "action_after_test": {
    "if_iroas_positive": "如果 iROAS > 2x：提高预算 30%，扩大相似受众",
    "if_iroas_marginal": "如果 iROAS 1-2x：维持预算，优化创意",
    "if_iroas_negative": "如果 iROAS < 1x：暂停并重新评估目标受众"
  },
  "revenue_at_risk_during_test": "控制组 ${holdout}% 受众暂停广告，预估损失约 $XX（可接受范围）",
  "implementation_steps": [
    { "step": 1, "action": "在 Meta Ads Manager 启动 Conversion Lift study", "time": "30分钟", "tool": "Meta Ads Manager → Measure & Report" },
    { "step": 2, "action": "设置 GA4 Segments 追踪控制组行为", "time": "1小时", "tool": "GA4 Audience builder" },
    { "step": 3, "action": "记录测试开始时的基线数据", "time": "15分钟", "tool": "Spreadsheet" },
    { "step": 4, "action": "中期检查（第2周）：确保样本量足够", "time": "30分钟", "tool": "平台报告" },
    { "step": 5, "action": "测试结束：读取结果，更新预算分配", "time": "1小时", "tool": "分析报告" }
  ],
  "human_approval_required": true,
  "human_decision_points": [
    "测试期间控制组暂停广告可能影响销售，需 CEO 确认接受短期损失",
    "测试结束后的预算调整决策需管理层审批",
    "如 iROAS 显著低于预期，是否继续该渠道需战略层决策"
  ]
}`,
    `品牌信息：
- 要测试的渠道：${input.channel_to_test}
- 月预算：${input.monthly_budget}
- 当前（归因）ROAS：${input.current_attributed_roas}
- 月订单量：${input.monthly_orders}
- 测试周期：${input.test_duration_weeks || "4"} 周
- 控制组比例：${input.holdout_pct || "15"}%
- 主要 KPI：${input.primary_kpi || "revenue"}

请设计完整增量测试方案。`,
    2500
  );

  return result;
}

export const incrementalityTesterSkill: ContentSkill = {
  id: "incrementality_tester",
  name: "增量测试设计",
  description: "Holdout 测试设计 + 真实 iROAS 衡量 + 归因偏差诊断 + 分步实施指南",
  category: "campaign",
  icon: "FlaskConical",
  color: "purple",
  estimated_cost: { text: 0.03, image: 0 },
  estimated_time_seconds: 20,
  agents: ["campaign_planner"],
  inputs: [
    { key: "channel_to_test", label: "要测试的渠道", type: "select", options: [
      { value: "meta_ads", label: "Meta Ads（Facebook/Instagram）" },
      { value: "google_ads", label: "Google Ads" },
      { value: "tiktok_ads", label: "TikTok Ads" },
      { value: "email", label: "Email Marketing" },
      { value: "influencer", label: "网红/KOL 投放" },
    ]},
    { key: "monthly_budget", label: "该渠道月预算", type: "text", placeholder: "$5,000" },
    { key: "current_attributed_roas", label: "当前归因 ROAS（last-click）", type: "text", placeholder: "3.2x" },
    { key: "monthly_orders", label: "月订单量（全渠道）", type: "text", placeholder: "200" },
    { key: "test_duration_weeks", label: "测试周期（周）", type: "text", placeholder: "4" },
    { key: "holdout_pct", label: "控制组比例 (%)", type: "text", placeholder: "15" },
    { key: "primary_kpi", label: "主要 KPI", type: "select", options: [
      { value: "revenue", label: "收入" },
      { value: "new_customers", label: "新客户获取" },
      { value: "return_rate", label: "复购率" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const result = await designIncrementalityTest(input as unknown as IncrementalityTestInput);
    return {
      skill_id: "incrementality_tester",
      output: result,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.03, image: 0 },
    };
  },
};
