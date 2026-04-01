import { supabase } from "./supabase";

const STYLE_PROMPTS: Record<string, string> = {
  product_photo:
    "Professional product photography, clean white background, studio lighting, high resolution, commercial quality",
  lifestyle:
    "Lifestyle photography, natural setting, warm lighting, authentic feel, aspirational",
  flat_lay:
    "Flat lay photography, top-down view, aesthetically arranged, minimalist, Instagram-worthy",
  social_media:
    "Social media content image, vibrant colors, eye-catching, modern design, scroll-stopping",
};

const PLATFORM_STYLE_MAP: Record<string, string> = {
  tiktok: "social_media",
  instagram: "lifestyle",
  xiaohongshu: "lifestyle",
  amazon: "product_photo",
  shopify: "product_photo",
  independent: "lifestyle",
};

export function buildImagePrompt(
  topic: string,
  platform: string,
  customStyle?: string
): string {
  const style = customStyle || PLATFORM_STYLE_MAP[platform] || "social_media";
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.social_media;
  return `${topic}. Style: ${stylePrompt}`;
}

export function getSizeForPlatform(platform: string): string {
  switch (platform) {
    case "tiktok":
      return "1024x1792"; // 9:16 vertical
    case "instagram":
      return "1024x1024"; // 1:1 square
    case "xiaohongshu":
      return "1024x1792"; // 3:4 vertical-ish (closest)
    default:
      return "1024x1024";
  }
}

export async function uploadBase64ToStorage(
  base64Data: string,
  filename: string
): Promise<string> {
  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const path = `generated/${Date.now()}-${filename}`;

  const { error } = await supabase.storage
    .from("content-media")
    .upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("content-media").getPublicUrl(path);

  return publicUrl;
}
