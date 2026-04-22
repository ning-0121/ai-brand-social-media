import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

/**
 * programmatic_seo — 批量生成长尾关键词落地页
 *
 * 输入：一个关键词模板（如 "[场景] + [人群] + [产品]"）+ 变量库
 * 输出：N 个页面大纲（含 H1/H2/内链建议/SEO meta），可直接落地
 */
export const programmaticSeoSkill: ContentSkill = {
  id: "programmatic_seo",
  name: "长尾 SEO 批量页面",
  category: "copy",
  description: "按模板批量生成长尾落地页：关键词聚类 + 页面大纲 + 内链地图（Zapier/Retool 模式）",
  icon: "Layers",
  color: "green",
  estimated_cost: { text: 0.08, image: 0 },
  estimated_time_seconds: 50,
  agents: ["content_producer"],
  inputs: [
    { key: "topic_area", label: "主题领域", type: "text", required: true, placeholder: "如：women's linen clothing" },
    { key: "page_count", label: "生成页面数", type: "select", default: "10", options: [
      { value: "5", label: "5 页（测试水温）" },
      { value: "10", label: "10 页（小规模）" },
      { value: "25", label: "25 页（集中火力）" },
      { value: "50", label: "50 页（全面覆盖）" },
    ]},
    { key: "dimensions", label: "变量维度（逗号分隔）", type: "text", default: "occasion,body_type,material,season", placeholder: "如：occasion, body_type, material, season" },
    { key: "target_market", label: "目标市场", type: "select", default: "us", options: [
      { value: "us", label: "美国" },
      { value: "uk", label: "英国" },
      { value: "global", label: "全球英文" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const topic = (input.topic_area as string) || "";
    const pageCount = parseInt((input.page_count as string) || "10");
    const dimensions = (input.dimensions as string) || "";
    const market = (input.target_market as string) || "us";

    const output = await callLLM(
      `你是程序化 SEO 专家，成功案例 Zapier / Retool / Clearscope（流量 10 万-百万级月）。

你的工作：设计一批可复制的长尾落地页，围绕一个主题领域展开。

**程序化 SEO 原则**：
1. **变量组合 = 关键词挖掘**：[变量1] × [变量2] = 精准长尾（例：petite × linen pants = "linen pants for petite women"）
2. **每页 300-500 字内容**，不长不短，专注满足搜索意图
3. **内链 = 集群效应**：每页链到 2-3 个相关长尾页 + 1 个支柱页
4. **meta title 结构**：[主关键词] - [次要修饰] | [品牌]
5. **意图匹配**：
   - 信息意图："what / how / best" → 教育内容 + 商品推荐
   - 商业意图："review / vs / top" → 对比 / 评测
   - 交易意图："buy / price / deal" → 产品页直通

**市场（${market}）语言**：全部英文

返回 JSON：
{
  "strategy": "整体策略一句话",
  "keyword_cluster_map": {
    "主关键词（支柱页）": ["长尾1", "长尾2", ...]
  },
  "pages": [
    {
      "slug": "petite-linen-pants-summer",
      "target_keyword": "petite linen pants for summer",
      "search_intent": "commercial | informational | transactional",
      "estimated_monthly_searches": 数字,
      "h1": "H1 标题（包含目标关键词）",
      "meta_title": "SEO title ≤ 60字符",
      "meta_description": "≤ 160字符",
      "outline": [
        {"h2": "二级标题", "content_hint": "这节要写什么（30 字）"}
      ],
      "internal_links": ["其他相关长尾页 slug 2-3 个"],
      "cta": "页面 CTA（指向哪个产品/分类）",
      "schema_suggestion": "Product | Article | FAQ"
    }
  ],
  "content_rules": ["这批页面必须遵守的 3-5 条规则（比如 'never use generic stock photos'）"],
  "next_steps": ["发布后 2 周内要做的动作"]
}`,
      `主题领域：${topic}
目标数量：${pageCount}
变量维度：${dimensions}
市场：${market}

请生成 ${pageCount} 个页面的完整方案。每个变量组合都要有独特价值，不是简单替换词。`,
      6000
    );

    return {
      skill_id: "programmatic_seo",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.08, image: 0 },
    };
  },
};
