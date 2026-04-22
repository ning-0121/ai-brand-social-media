import { enhanceImage } from "../../image-processing";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const imageEnhanceSkill: ContentSkill = {
  id: "image_enhance",
  name: "图片 4K 增强",
  category: "image",
  description: "AI 超分辨率放大 2x/4x（Replicate Real-ESRGAN），低清商品图变高清大图",
  icon: "ZoomIn",
  color: "violet",
  estimated_cost: { text: 0, image: 0.05 },
  estimated_time_seconds: 60,
  requires_image: true,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品（取商品图）", type: "product", required: true },
    { key: "image_url_override", label: "或直接输入图片URL", type: "text", placeholder: "https://..." },
    { key: "scale", label: "放大倍数", type: "select", default: "4", options: [
      { value: "2", label: "2x（适合轻度提升）" },
      { value: "4", label: "4x — 4K 级别（推荐）" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    const imageUrl = (input.image_url_override as string) || product?.image_url;
    if (!imageUrl) throw new Error("未找到商品图片");

    const scale = parseInt((input.scale as string) || "4") as 2 | 4;
    const result = await enhanceImage(imageUrl, scale);

    return {
      skill_id: "image_enhance",
      output: {
        original_url: imageUrl,
        output_url: result.output_url,
        scale: result.scale,
        provider: result.provider,
        product_name: product?.name || "",
        usage_hint: `已放大 ${scale}x — 适合详情页大图、印刷物料、Shopify hero 图`,
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0, image: 0.05 },
    };
  },
};
