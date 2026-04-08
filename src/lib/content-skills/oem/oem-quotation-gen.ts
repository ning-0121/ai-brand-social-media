import { callLLM } from "../llm";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const oemQuotationGenSkill: ContentSkill = {
  id: "oem_quotation_gen",
  name: "OEM 报价单生成",
  category: "oem",
  description: "输入产品 + 数量 + 国家 → 生成完整报价单 JSON（可后续转 PDF）",
  icon: "FileText",
  color: "green",
  estimated_cost: { text: 0.02, image: 0 },
  estimated_time_seconds: 30,
  agents: ["content_producer"],
  inputs: [
    { key: "products_desc", label: "产品需求描述", type: "textarea", required: true, placeholder: "如: 5000 件有机棉 T 恤，3 色（白/黑/海军蓝），180gsm" },
    { key: "buyer_country", label: "客户国家", type: "text", placeholder: "United States" },
    { key: "incoterms", label: "Incoterms", type: "select", default: "FOB", options: [
      { value: "FOB", label: "FOB 离岸价" },
      { value: "CIF", label: "CIF 到岸价（含运保）" },
      { value: "EXW", label: "EXW 工厂价" },
      { value: "DDP", label: "DDP 完税到门" },
    ]},
    { key: "currency", label: "货币", type: "select", default: "USD", options: [
      { value: "USD", label: "USD" },
      { value: "EUR", label: "EUR" },
      { value: "GBP", label: "GBP" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const desc = (input.products_desc as string) || "";
    const country = (input.buyer_country as string) || "";
    const incoterms = (input.incoterms as string) || "FOB";
    const currency = (input.currency as string) || "USD";

    const systemPrompt = `You are a senior OEM/ODM quotation specialist for Chinese apparel/textile factories.
You generate accurate, market-rate quotations based on product specs.

Reference price ranges (USD/pc, FOB China):
- Basic cotton T-shirt (180gsm): $2.5-4.0
- Premium organic cotton T-shirt: $4.0-7.0
- Polo shirt: $5-9
- Hoodie/sweatshirt: $8-15
- Activewear (poly/spandex): $5-12
- Silk blouse: $12-25
- Denim jeans: $8-18
- Knitwear: $10-25

Adjust based on:
- Quantity (price drops with volume tiers)
- Customization complexity
- Certifications (organic +15%, GOTS +20%, GRS +10%)
- Country (DDP adds duty/tax to destination)

Always provide tiered pricing (e.g., 500-1000 / 1001-5000 / 5001+).

Return JSON.`;

    const userPrompt = `Generate a professional quotation:

Product needs: ${desc}
Buyer country: ${country}
Incoterms: ${incoterms}
Currency: ${currency}

Return JSON:
{
  "quote_number": "Q-YYYYMM-XXX 格式",
  "products": [
    {
      "sku": "建议 SKU",
      "name": "产品名（英文）",
      "specifications": "详细规格",
      "qty": 数量,
      "unit_price": 单价,
      "total": 小计,
      "tier_pricing": [
        {"min_qty": 500, "max_qty": 1000, "price": 价格},
        {"min_qty": 1001, "max_qty": 5000, "price": 价格},
        {"min_qty": 5001, "max_qty": null, "price": 价格}
      ]
    }
  ],
  "subtotal": 总价,
  "total": 总价,
  "currency": "${currency}",
  "incoterms": "${incoterms}",
  "payment_terms": "30% T/T deposit, 70% before shipment",
  "lead_time": "如 30-45 days after sample approval",
  "valid_until": "30 days from issue date",
  "sample_policy": "样品费 + 运费政策",
  "notes": ["备注 1", "备注 2"],
  "next_steps": ["建议下一步 1", "下一步 2"]
}`;

    const output = await callLLM(systemPrompt, userPrompt, 3500);

    return {
      skill_id: "oem_quotation_gen",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.02, image: 0 },
    };
  },
};
