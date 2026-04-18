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

    // Structured prompt engineering — each field controls a specific photographic dimension.
    // This consistently produces magazine-quality output vs generic prompts.
    const styleMatrix: Record<string, {
      scene: string;
      lighting: string;
      camera: string;
      composition: string;
      mood: string;
      postProcessing: string;
    }> = {
      studio_white: {
        scene: "on a seamless pure white infinity cyc, no visible horizon line, product centered with subtle contact shadow",
        lighting: "three-point studio lighting with large softboxes, key light 45° front-left, fill from right, rim from behind — even exposure no harsh shadows",
        camera: "shot on medium-format digital with 85mm macro lens, f/8 for edge-to-edge sharpness",
        composition: "product occupies 60% of frame, perfectly aligned center, isolated subject",
        mood: "clean, clinical, premium e-commerce catalog",
        postProcessing: "color-accurate, hex-perfect fabric/material tones, no heavy retouching, subtle highlights preserved",
      },
      lifestyle: {
        scene: "authentic home or outdoor environment matching product's use case — e.g. morning kitchen for kitchenware, sunlit bedroom for apparel",
        lighting: "warm natural window light, golden hour feel, soft directional with gentle fill from bounce",
        camera: "shot on full-frame mirrorless with 50mm f/1.4 lens, shallow depth of field",
        composition: "rule-of-thirds placement, product in context of human hands or environmental detail, leading lines toward subject",
        mood: "aspirational but attainable, slice-of-life, emotionally warm",
        postProcessing: "filmic color grade with lifted shadows and warm midtones, Kodak Portra 400 feel",
      },
      flat_lay: {
        scene: "top-down overhead view on textured surface (linen, raw wood, marble, or concrete) with 2-3 complementary props",
        lighting: "soft even daylight-balanced lighting from multiple angles, no direct sunlight, diffused shadows",
        camera: "shot from directly overhead with 35mm lens, product parallel to sensor",
        composition: "negative space around edges, asymmetric arrangement of props creating visual triangle, rule of thirds",
        mood: "editorial, curated, design-conscious",
        postProcessing: "neutral color temperature, crisp contrast, slight matte finish",
      },
      model: {
        scene: "model wearing or interacting with product naturally in appropriate environment — urban street for streetwear, nature for outdoor gear",
        lighting: "golden hour natural light from low angle OR soft overcast daylight, rim light on subject's edges",
        camera: "shot on full-frame with 85mm or 135mm lens, f/2.0-2.8 for subject isolation",
        composition: "model from knees-up or waist-up, three-quarter angle, confident non-staged pose, product clearly visible",
        mood: "aspirational, confident, narrative",
        postProcessing: "editorial magazine grade, slight film grain, rich shadow detail",
      },
      outdoor: {
        scene: "scenic natural or urban environment relevant to product (mountain trail for boots, city rooftop for watch, etc)",
        lighting: "golden hour directional sunlight with long shadows, OR blue hour twilight with ambient sky fill",
        camera: "wide-angle 24mm or 35mm on full-frame, landscape aspect if horizontal",
        composition: "product as foreground hero with environmental context behind, depth via foreground-midground-background layering",
        mood: "cinematic, adventurous, scale-conveying",
        postProcessing: "cinematic teal-orange grade, deep blacks, preserved highlights",
      },
    };

    const s = styleMatrix[photoStyle] || styleMatrix.lifestyle;
    const productDesc = `${product.name}${product.category ? ` (${product.category})` : ""}`;

    const imagePrompt = `Professional commercial product photograph of ${productDesc}.
SCENE: ${s.scene}.
LIGHTING: ${s.lighting}.
CAMERA: ${s.camera}.
COMPOSITION: ${s.composition}. Frame aspect ratio ${aspectRatio}.
MOOD: ${s.mood}.
POST: ${s.postProcessing}.
Photorealistic 8K quality, no text overlay, no watermark, no logos other than product's own, tack sharp where needed, authentic materials and textures.`;

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
