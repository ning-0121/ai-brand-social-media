import { generateImage } from "../../image-service";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const aiProductPhotoSkill: ContentSkill = {
  id: "ai_product_photo",
  name: "AI 商品图",
  category: "image",
  description: "AI 生成商品场景图、白底图、生活方式图（Gemini 直出真实图片）",
  icon: "Camera",
  color: "blue",
  estimated_cost: { text: 0, image: 0.04 },
  estimated_time_seconds: 25,
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
    const aspectRatio = (input.aspect_ratio as string) as "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

    const stylePrompts: Record<string, string> = {
      studio_white: "Professional product photography, pure white background, soft studio lighting, shot with 85mm lens, commercial quality, sharp focus, e-commerce hero shot",
      lifestyle: "Lifestyle product photography, warm natural light, authentic cozy home or outdoor setting, aspirational mood, depth of field blur background",
      flat_lay: "Flat lay product photography, overhead top-down view, artfully arranged on textured surface with complementary props, minimalist aesthetic, bright even lighting",
      model: "Fashion model wearing the product, editorial style photography, natural confident pose, professional outdoor or studio lighting, high-fashion aesthetic",
      outdoor: "Outdoor product photography, golden hour natural sunlight, scenic nature or urban background, adventure lifestyle feel, dynamic angle",
    };

    const productDesc = `${product.name}${product.category ? `, ${product.category}` : ""}`;
    const imagePrompt = `${stylePrompts[photoStyle] || stylePrompts.lifestyle}. Product: ${productDesc}. High resolution, ultra realistic, 4K quality.`;

    const imageUrl = await generateImage(imagePrompt, {
      style: "product_photo",
      size: aspectRatio,
      filename: `product-photo-${photoStyle}-${Date.now()}.png`,
    });

    return {
      skill_id: "ai_product_photo",
      output: {
        image_url: imageUrl,
        image_prompt: imagePrompt,
        style: photoStyle,
        aspect_ratio: aspectRatio,
        product_name: product.name,
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0, image: 0.04 },
    };
  },
};
