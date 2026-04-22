import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const googleShoppingTitleSkill: ContentSkill = {
  id: "google_shopping_title",
  name: "Google Shopping 标题优化",
  category: "copy",
  description: "批量优化商品标题：品牌+品类+属性+颜色 公式，前70字最大化购物广告 CTR",
  icon: "ShoppingCart",
  color: "green",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 20,
  agents: ["content_producer"],
  inputs: [
    { key: "products", label: "选择商品（可多选）", type: "products", required: true },
    { key: "brand_name", label: "品牌名", type: "text", default: "JOJOFEIFEI" },
    { key: "market", label: "目标市场", type: "select", default: "us", options: [
      { value: "us", label: "美国（英文）" },
      { value: "cn", label: "中国（中文）" },
      { value: "global", label: "全球（英文）" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const products = (input.products as typeof input.product[]) || (input.product ? [input.product] : []);
    if (!products.length) throw new Error("请至少选择一个商品");

    const brand = (input.brand_name as string) || "JOJOFEIFEI";
    const market = (input.market as string) || "us";
    const lang = market === "cn" ? "中文" : "英文";

    const productList = products.map((p, i) =>
      `${i + 1}. ID:${p?.id} | 当前标题: ${p?.name} | 价格: $${p?.price || "N/A"} | 分类: ${p?.category || "N/A"} | 标签: ${p?.tags || "N/A"}`
    ).join("\n");

    const output = await callLLM(
      `你是 Google Shopping 广告优化专家，专注于时尚/服装品类，深度理解 Google 购物算法。

GOOGLE SHOPPING 标题科学（必须遵守）:
1. **前70字符决定显示效果** — 最重要的信息必须在前70字符
2. **标准公式**: [品牌] + [商品类型] + [关键属性] + [颜色/材质] + [尺码范围（如适用）]
   示例: "JOJOFEIFEI Women's High-Waist Flare Leggings – Butt-Lift, Black, XS-3XL"
3. **禁止的词**: 全大写词、感叹号、促销词（Sale/Free/Best）、主观描述（Amazing/Perfect）
4. **提升 CTR 的技巧**:
   - 包含高搜索量属性词（High-Waist, Ribbed, Seamless, Athletic, Casual）
   - 颜色放在标题中（Google 用于匹配颜色筛选）
   - 用途词（Workout, Yoga, Running, Everyday）
   - 材质词（Cotton, Polyester, Spandex）提升转化
5. **最大长度**: 150字符；**最优长度**: 70-100字符
6. **语言**: ${lang}

返回 JSON 数组，每个商品一条，格式如下:
[
  {
    "product_id": "ID",
    "original_title": "原标题",
    "optimized_title": "优化后标题（70字符内的核心，不超过150字符总长）",
    "title_length": 数字,
    "key_attributes_added": ["新增属性1", "属性2"],
    "estimated_ctr_lift": "预估 CTR 提升幅度（如 +15-25%）",
    "rationale": "为什么这样改（一句话）"
  }
]`,
      `品牌: ${brand}
目标市场: ${market} (${lang})
商品列表:
${productList}

请按公式优化每个商品标题。`,
      3000
    );

    return {
      skill_id: "google_shopping_title",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
