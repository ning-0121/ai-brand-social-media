import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * topical_authority — 设计主题权威架构（支柱页 + 集群页 + 内链策略）
 *
 * 研究验证：集群模型让集群内页面平均提升 40% 排名、30% 流量
 */
export const topicalAuthoritySkill: ContentSkill = {
  id: "topical_authority",
  name: "主题权威架构",
  category: "copy",
  description: "支柱页 + 5-15 集群页 + 内链策略。让整个主题域成为 Google 认可的权威",
  icon: "Network",
  color: "blue",
  estimated_cost: { text: 0.04, image: 0 },
  estimated_time_seconds: 35,
  agents: ["content_producer"],
  inputs: [
    { key: "pillar_topic", label: "支柱主题", type: "text", required: true, placeholder: "如：sustainable summer clothing" },
    { key: "cluster_count", label: "集群页数量", type: "select", default: "10", options: [
      { value: "5", label: "5 页（小集群）" },
      { value: "10", label: "10 页（标准）" },
      { value: "15", label: "15 页（深耕）" },
    ]},
    { key: "brand_expertise", label: "品牌专长（可选）", type: "text", placeholder: "如：亚麻材质/环保制造/小批量定制" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const pillar = (input.pillar_topic as string) || "";
    const count = parseInt((input.cluster_count as string) || "10");
    const expertise = (input.brand_expertise as string) || "";

    const output = await callLLM(
      `你是 SEO 主题权威架构师。为品牌设计一个以支柱页为中心、${count} 个集群页围绕的内容架构。

**主题权威原则**：
1. **支柱页**：覆盖主题的广度（2500-4000 字），链到所有集群页
2. **集群页**：每篇深挖一个子话题（1000-2000 字），必须反链支柱页
3. **内链**：每个集群页链到 2-3 个相关集群页 + 1 个支柱页
4. **关键词唯一性**：每个集群页的目标关键词不能重叠（避免 keyword cannibalization）
5. **E-E-A-T**：每篇要体现 Experience（作者经验）、Expertise（品牌专长）、Authority（外部引用）、Trust（数据来源）

返回 JSON:
{
  "architecture_summary": "一句话概括这个架构能带来什么",
  "pillar_page": {
    "h1": "H1",
    "target_keyword": "主关键词",
    "estimated_word_count": 3000,
    "estimated_monthly_searches": 数字,
    "meta_title": "",
    "meta_description": "",
    "sections": [
      {"h2": "章节标题", "purpose": "这一节在支柱页的作用", "links_to_cluster": ["cluster slug 1", "cluster slug 2"]}
    ],
    "schema": "Article with mainEntity pointing to FAQPage"
  },
  "cluster_pages": [
    {
      "slug": "cluster-slug",
      "h1": "H1",
      "target_keyword": "长尾关键词",
      "search_intent": "informational | commercial",
      "estimated_monthly_searches": 数字,
      "word_count_target": 1500,
      "angle": "这篇的独特角度（和其他集群页区分）",
      "links_back_to_pillar": true,
      "links_to_sibling_clusters": ["兄弟集群 slug 2-3 个"],
      "eeat_signals": ["这篇体现 E-E-A-T 的具体点"]
    }
  ],
  "internal_linking_map": {
    "pillar_slug": ["所有集群 slugs"],
    "cluster_1_slug": ["pillar_slug", "cluster_2", "cluster_3"]
  },
  "launch_sequence": [
    {"week": 1, "action": "第 1 周做什么"},
    {"week": 2, "action": "..."}
  ],
  "success_metrics_90d": {
    "organic_traffic_uplift": "预期 X%",
    "ranking_keywords": "预期进前 10 的关键词数",
    "conversion_path": "流量怎么变订单"
  }
}`,
      `支柱主题：${pillar}
集群页数量：${count}
${expertise ? `品牌专长：${expertise}` : ""}

请设计完整架构。每个集群页的 angle 必须不同，不能只是换关键词。`,
      5000
    );

    return {
      skill_id: "topical_authority",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.04, image: 0 },
    };
  },
};
