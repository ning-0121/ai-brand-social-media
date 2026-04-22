/**
 * Playbook: CVR 全链改造
 *
 * 一次启动 4 个转化引擎 — 评价获取 / 信任信号 / 品质闭环 / 客服提速
 * 目标：90 天内 CVR 从行业均值 2.76% 提升到 3.5%+
 */

import type { Playbook } from "../types";

export const conversionOverhaulPlaybook: Playbook = {
  id: "conversion_overhaul",
  name: "CVR 全链改造",
  description: "一次启动评价 + 信任信号 + 品质闭环 + 客服 4 个系统性提升",
  objective: "90 天内把 CVR 从 2% 推到 3.5%+（+70% 提升）",
  when_to_use: "店铺流量 OK 但转化率低于 2.5%、流量成本高想压 CAC、客户体验需要体系化升级",
  category: "optimization",
  icon: "Target",
  color: "indigo",
  estimated_duration_seconds: 180,
  required_inputs: [
    { key: "store_url", label: "店铺网址", type: "text" },
    { key: "has_reviews", label: "已接入评价系统？", type: "select", options: [
      { value: "no", label: "未接入评价系统" },
      { value: "yes_but_few", label: "接了但评价 < 50 条" },
      { value: "yes_healthy", label: "评价 > 200 条" },
    ]},
    { key: "current_returns_policy", label: "当前退货政策", type: "text", placeholder: "如：14 天不免邮" },
  ],
  steps: [
    {
      id: "trust_audit",
      label: "第 1 步：信任信号审计（找缺口）",
      skill_id: "trust_signal_audit",
      inputs: (ctx) => ({
        store_url: ctx.user_inputs.store_url || "jojofeifei.com",
        has_reviews: ctx.user_inputs.has_reviews || "yes_but_few",
        current_returns_policy: ctx.user_inputs.current_returns_policy || "",
      }),
    },
    {
      id: "review_setup",
      label: "第 2 步：评价获取序列设计（Day 2-3 SMS）",
      skill_id: "review_sequencer",
      inputs: () => ({
        platform_preference: "loox",
        incentive_budget: "small_discount",
        brand_voice: "friendly",
      }),
    },
    {
      id: "quality_scan",
      label: "第 3 步：品质问题主动扫描",
      skill_id: "quality_feedback_analyzer",
      inputs: () => ({
        scope: "top_30_by_orders",
        days_back: "90",
      }),
    },
    {
      id: "support_demo",
      label: "第 4 步：客服回复模板预览（示例场景）",
      skill_id: "customer_service_responder",
      inputs: () => ({
        customer_message: "Hi, I'm 5'4\" 130lbs, which size would fit best for the linen pants? Also do you ship internationally?",
        channel: "live_chat",
        tone_preference: "friendly_helpful",
      }),
      optional: true,
    },
  ],
};
