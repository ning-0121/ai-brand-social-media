import { removeBackground } from "../../image-processing";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const bgRemoveSkill: ContentSkill = {
  id: "bg_remove",
  name: "背景移除",
  category: "image",
  description: "AI 自动移除商品图背景 → 白底/透明底（Photoroom API，450ms 极速）",
  icon: "Scissors",
  color: "orange",
  estimated_cost: { text: 0, image: 0.01 },
  estimated_time_seconds: 10,
  requires_image: true,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品（取商品图）", type: "product", required: true },
    { key: "image_url_override", label: "或直接输入图片URL", type: "text", placeholder: "https://..." },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const imageUrl = (input.image_url_override as string) || product?.image_url;
    if (!imageUrl) throw new Error("未找到商品图片，请先同步商品或手动输入图片 URL");

    const result = await removeBackground(imageUrl);

    return {
      skill_id: "bg_remove",
      output: {
        original_url: imageUrl,
        output_url: result.output_url,
        provider: result.provider,
        product_name: product?.name || "",
        usage_hint: "可直接用于白底商品主图、广告素材、详情页嵌入",
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0, image: 0.01 },
    };
  },
};
