import { generateProductVideo } from "../../image-processing";
import { getBrandGuide } from "../../brand-guide";
import type { ContentSkill, SkillInputData, SkillResult } from "../types";

export const productVideoSkill: ContentSkill = {
  id: "product_video",
  name: "商品短视频",
  category: "video",
  description: "商品图片自动合成 10-30s 竖屏短视频（Shotstack），可直投 TikTok/Reels",
  icon: "Film",
  color: "pink",
  estimated_cost: { text: 0, image: 0.15 },
  estimated_time_seconds: 120,
  requires_image: true,
  agents: ["content_producer"],
  inputs: [
    { key: "product", label: "核心商品", type: "product", required: true },
    { key: "style", label: "视频风格", type: "select", default: "showcase", options: [
      { value: "showcase", label: "商品展示（多图轮播+标题）" },
      { value: "minimal", label: "极简（纯图+品牌名）" },
      { value: "promo", label: "促销（大字优惠信息）" },
    ]},
    { key: "duration_per_image", label: "每张停留（秒）", type: "select", default: "3", options: [
      { value: "2", label: "2 秒（快节奏）" },
      { value: "3", label: "3 秒（标准）" },
      { value: "5", label: "5 秒（慢节奏）" },
    ]},
    { key: "custom_title", label: "标题文字（可选）", type: "text", placeholder: "如：New Arrivals" },
    { key: "offer_text", label: "优惠文字（可选）", type: "text", placeholder: "如：30% OFF Today Only" },
  ],
  async execute(input: SkillInputData): Promise<SkillResult> {
    const product = input.product;
    if (!product) throw new Error("缺少商品");

    const style = (input.style as string) || "showcase";
    const secPerImg = parseInt((input.duration_per_image as string) || "3");
    const customTitle = (input.custom_title as string) || "";
    const offerText = (input.offer_text as string) || "";

    const guide = await getBrandGuide();
    const brandColor = guide?.primary_color || "#000000";

    // Collect all available images for this product
    const imageUrls: string[] = [];
    if (product.image_url) imageUrls.push(product.image_url);
    // Max 6 images for a ~18s video
    const finalImages = imageUrls.slice(0, 6);
    if (finalImages.length === 0) throw new Error("商品没有可用图片，请先同步商品图片");

    const titleText = customTitle || (style === "promo" && offerText ? offerText : product.name);
    const subtitle = style === "promo" ? offerText : undefined;

    const result = await generateProductVideo(finalImages, {
      title: style !== "minimal" ? titleText : undefined,
      subtitle,
      brand_color: brandColor,
      duration_per_image: secPerImg,
    });

    return {
      skill_id: "product_video",
      output: {
        video_url: result.output_url,
        duration_seconds: result.duration_seconds,
        image_count: finalImages.length,
        provider: result.provider,
        product_name: product.name,
        style,
        usage_hint: "直接下载后上传 TikTok / Instagram Reels / 小红书",
      },
      generated_at: new Date().toISOString(),
      estimated_cost: { text: 0, image: 0.15 },
    };
  },
};
