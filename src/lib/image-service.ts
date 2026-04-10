import { GoogleGenAI } from "@google/genai";
import { uploadBase64ToStorage } from "./image-generation";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Generate a real image using Gemini and upload to Supabase Storage.
 * Returns a public URL that can be embedded in HTML or social posts.
 */
export async function generateImage(
  prompt: string,
  options?: {
    style?: "product_photo" | "lifestyle" | "social_media" | "flat_lay";
    size?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
    filename?: string;
  }
): Promise<string | null> {
  const styleHints: Record<string, string> = {
    product_photo: "Professional product photography, studio lighting, clean background. ",
    lifestyle: "Lifestyle photography, natural warm lighting, authentic setting. ",
    flat_lay: "Flat lay top-down view, aesthetically arranged, minimalist. ",
    social_media: "Vibrant social media content, eye-catching, modern design. ",
  };

  const fullPrompt = (styleHints[options?.style || ""] || "") + prompt;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: fullPrompt,
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: options?.size || "1:1",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
        const b64 = part.inlineData.data;
        const ext = part.inlineData.mimeType === "image/jpeg" ? "jpg" : "png";
        const filename = options?.filename || `ai-${Date.now()}.${ext}`;

        try {
          return await uploadBase64ToStorage(b64, filename, part.inlineData.mimeType);
        } catch {
          // Fallback to data URL if storage fails
          return `data:${part.inlineData.mimeType};base64,${b64}`;
        }
      }
    }
  } catch (err) {
    console.error("Image generation failed:", err);
  }

  return null;
}

/**
 * Generate multiple images in sequence.
 * Returns array of URLs (nulls filtered out).
 */
export async function generateImages(
  prompts: Array<{
    prompt: string;
    style?: "product_photo" | "lifestyle" | "social_media" | "flat_lay";
    size?: "1:1" | "16:9" | "9:16";
    label?: string;
  }>
): Promise<Array<{ label: string; url: string }>> {
  const results: Array<{ label: string; url: string }> = [];

  for (const p of prompts) {
    const url = await generateImage(p.prompt, {
      style: p.style,
      size: p.size,
      filename: `${p.label || "img"}-${Date.now()}.png`,
    });
    if (url) {
      results.push({ label: p.label || "image", url });
    }
  }

  return results;
}
