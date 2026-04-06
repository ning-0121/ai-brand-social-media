import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const internalSiteOptimizeSkill: ContentSkill = {
  id: "internal_site_optimize",
  name: "网站内部优化",
  category: "website",
  description: "分析并优化网站导航、分类、搜索、关联推荐策略",
  icon: "Network",
  color: "cyan",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["store_optimizer", "data_analyst"],
  inputs: [
    { key: "products", label: "商品列表（用于分析）", type: "products", required: true },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const products = input.products || [];

    const systemPrompt = `你是顶级电商网站架构和 UX 专家，精通 Shopify、WooCommerce、Magento 等平台。
你的优化能从商品数据中识别：
1. 最佳分类树结构
2. 关联商品推荐策略（互补、替代、升级）
3. 内部搜索关键词优化
4. 导航菜单层级
5. 内部链接结构

返回 JSON。`;

    const categoryStats = new Map<string, number>();
    for (const p of products) {
      const cat = p.category || "未分类";
      categoryStats.set(cat, (categoryStats.get(cat) || 0) + 1);
    }

    const summary = Array.from(categoryStats.entries())
      .map(([cat, count]) => `- ${cat}: ${count} 个商品`)
      .join("\n");

    const userPrompt = `分析以下店铺商品结构，给出网站内部优化建议：

商品总数：${products.length}
分类分布：
${summary}

商品样本（前 10 个）：
${products.slice(0, 10).map((p) => `- ${p.name} (${p.category || "未分类"})`).join("\n")}

请生成 JSON：
{
  "navigation_structure": {
    "main_menu": [{"label": "菜单项", "submenu": ["子菜单"]}],
    "rationale": "结构理由"
  },
  "category_tree": [
    {"category": "一级分类", "subcategories": ["二级分类"], "estimated_products": 0}
  ],
  "related_products_strategy": {
    "complementary": "互补商品策略",
    "alternative": "替代商品策略",
    "upsell": "升级商品策略",
    "examples": [{"product": "商品A", "related": ["商品B", "商品C"]}]
  },
  "internal_search_keywords": ["关键词1", "关键词2", "关键词3"],
  "internal_linking": {
    "anchor_strategies": ["策略1", "策略2"],
    "priority_pages": ["页面1", "页面2"]
  },
  "improvements": [
    {"issue": "问题", "suggestion": "建议", "priority": "high/medium/low"}
  ]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3000);

    return {
      skill_id: "internal_site_optimize",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
