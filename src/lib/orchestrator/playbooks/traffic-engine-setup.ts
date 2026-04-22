/**
 * Playbook: 30 天流量引擎启动
 *
 * 一次性启动 4 个高杠杆流量引擎：
 * Schema 标记（立即 CTR + 20-40%）→ Topical Authority（4-8周）
 * → Programmatic SEO（8-12周）→ HARO（4-12周）
 */

import type { Playbook } from "../types";

export const trafficEngineSetupPlaybook: Playbook = {
  id: "traffic_engine_setup",
  name: "30 天流量引擎启动",
  description: "一次启动 4 个免费/低成本流量渠道 — Schema + 主题权威 + 长尾 SEO + HARO 外链",
  objective: "建立自营有机流量引擎，30 天内看到数据抬升",
  when_to_use: "付费广告太依赖、想降低 CAC、想建长期 E-E-A-T 权威",
  category: "growth",
  icon: "TrendingUp",
  color: "blue",
  estimated_duration_seconds: 180,
  required_inputs: [
    { key: "topic_area", label: "核心主题（品类）", type: "text", required: true, placeholder: "如：women's linen clothing" },
    { key: "pillar_topic", label: "支柱主题", type: "text", required: true, placeholder: "如：sustainable summer clothing" },
    { key: "cluster_count", label: "集群页数量", type: "select", options: [
      { value: "5", label: "5 页（小试）" },
      { value: "10", label: "10 页（推荐）" },
      { value: "15", label: "15 页（深耕）" },
    ]},
    { key: "programmatic_page_count", label: "程序化页面数", type: "select", options: [
      { value: "10", label: "10 页" },
      { value: "25", label: "25 页" },
      { value: "50", label: "50 页" },
    ]},
    { key: "store_domain", label: "店铺域名", type: "text", placeholder: "如：jojofeifei.com" },
  ],
  steps: [
    {
      id: "schema_audit",
      label: "第 1 步：Schema 结构化数据审计 + 生成（立即见效）",
      skill_id: "schema_markup_audit",
      inputs: (ctx) => ({
        audit_scope: "top_20",
        store_domain: ctx.user_inputs.store_domain as string || "jojofeifei.com",
      }),
    },
    {
      id: "topical_architecture",
      label: "第 2 步：主题权威架构（4-8周建权威）",
      skill_id: "topical_authority",
      inputs: (ctx) => ({
        pillar_topic: ctx.user_inputs.pillar_topic,
        cluster_count: ctx.user_inputs.cluster_count || "10",
      }),
    },
    {
      id: "programmatic_pages",
      label: "第 3 步：程序化 SEO 长尾页面（8-12周放量）",
      skill_id: "programmatic_seo",
      inputs: (ctx) => ({
        topic_area: ctx.user_inputs.topic_area,
        page_count: ctx.user_inputs.programmatic_page_count || "10",
        dimensions: "occasion,body_type,material,season",
        target_market: "us",
      }),
    },
    {
      id: "haro_readiness",
      label: "第 4 步：HARO PR 待命（找到第一条询问时可用）",
      skill_id: "haro_pitch_writer",
      inputs: () => ({
        journalist_query: "SAMPLE: Looking for sustainable fashion brand founders to comment on slow fashion trends for a Forbes piece. Need: 100-word quote on why consumers are shifting to small-batch brands.",
        publication: "Forbes",
        expert_role: "founder",
      }),
      optional: true,
    },
  ],
};
