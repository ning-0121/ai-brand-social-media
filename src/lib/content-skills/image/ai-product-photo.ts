import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const aiProductPhotoSkill: ContentSkill = {
  id: "ai_product_photo",
  name: "AI 商品图",
  category: "image",
  description: "AI 生成商品场景图、白底图、生活方式图（用 Gemini 图片生成）",
  icon: "Camera",
  color: "blue",
  estimated_cost: { text: 0.01, image: 0.04 },
  estimated_time_seconds: 30,
  requires_image: true,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "选择商品", type: "product", required: true },
    { key: "photo_style", label: "图片风格", type: "select", default: "lifestyle", options: [
      { value: "studio_white", label: "白底棚拍" },
      { value: "lifestyle", label: "生活场景" },
      { value: "flat_lay", label: "平铺摆拍" },
      { value: "model", label: "模特展示" },
      { value: "outdoor", label: "户外场景" },
    ]},
    { key: "aspect_ratio", label: "图片比例", type: "select", default: "1:1", options: [
      { value: "1:1", label: "正方形 1:1" },
      { value: "4:3", label: "横版 4:3" },
      { value: "3:4", label: "竖版 3:4" },
      { value: "16:9", label: "宽屏 16:9" },
      { value: "9:16", label: "竖屏 9:16" },
    ]},
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");
    const photoStyle = (input.photo_style as string) || "lifestyle";
    const aspectRatio = (input.aspect_ratio as string) || "1:1";

    const stylePrompts: Record<string, string> = {
      studio_white: "Professional product photography, clean white background, studio lighting, high-end commercial quality, sharp focus",
      lifestyle: "Lifestyle product photography, natural warm lighting, authentic home/outdoor setting, aspirational feel",
      flat_lay: "Flat lay photography, top-down view, aesthetically arranged with complementary items, minimalist",
      model: "Fashion model wearing/holding the product, editorial style, natural pose, professional lighting",
      outdoor: "Outdoor product shot, natural sunlight, scenic background, adventure/travel aesthetic",
    };

    const prompt = `${stylePrompts[photoStyle] || stylePrompts.lifestyle}. Product: ${product.name}. ${product.category ? `Category: ${product.category}.` : ""} High resolution, professional quality.`;

    // Return the prompt and settings — the frontend will call /api/generate-image
    const output = {
      image_prompt: prompt,
      aspect_ratio: aspectRatio,
      style: photoStyle,
      product_name: product.name,
      instructions: "使用上方的 prompt 调用图片生成 API (/api/generate-image)",
    };

    return {
      skill_id: "ai_product_photo",
      output,
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0.01, image: 0.04 },
    };
  },
};
