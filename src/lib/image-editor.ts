import { GoogleGenAI } from "@google/genai";
import { uploadBase64ToStorage } from "./image-generation";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * AI Image Editor — like Photoshop but AI-powered.
 * Takes an existing image URL + edit instruction, returns a new edited image.
 * Original image is NEVER modified.
 *
 * Capabilities:
 * - Remove/change background
 * - Adjust colors/lighting
 * - Add text overlay
 * - Crop/resize for platform
 * - Remove unwanted objects
 * - Style transfer
 */
export async function editImage(
  imageUrl: string,
  editPrompt: string
): Promise<{ url?: string; error?: string }> {
  try {
    // Fetch the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return { error: `无法获取原图: ${imageResponse.status}` };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/png";

    // Call Gemini with image + edit instruction
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType,
              },
            },
            {
              text: `Edit this image: ${editPrompt}. Return the edited image.`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
      },
    });

    // Extract edited image
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return { error: "Gemini 未返回图片" };

    for (const part of parts) {
      if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
        const b64 = part.inlineData.data;
        const ext = part.inlineData.mimeType === "image/jpeg" ? "jpg" : "png";
        const filename = `edited-${Date.now()}.${ext}`;

        try {
          const url = await uploadBase64ToStorage(b64, filename, part.inlineData.mimeType);
          return { url };
        } catch {
          return { url: `data:${part.inlineData.mimeType};base64,${b64}` };
        }
      }
    }

    return { error: "Gemini 返回中未包含图片" };
  } catch (err) {
    console.error("AI image edit failed:", err);
    return { error: err instanceof Error ? err.message : "AI 修图失败" };
  }
}

/**
 * Preset edit operations for common tasks.
 */
export const IMAGE_EDIT_PRESETS = {
  remove_background: "Remove the background completely, make it transparent or pure white",
  white_background: "Replace the background with a clean pure white studio background",
  lifestyle_background: "Replace the background with an elegant lifestyle setting, warm natural lighting",
  brighten: "Increase brightness and contrast, make colors more vibrant",
  warm_tone: "Apply warm color grading, golden hour feel",
  cool_tone: "Apply cool blue-toned color grading, modern clean feel",
  crop_square: "Crop to perfect 1:1 square, center the main subject",
  crop_portrait: "Crop to 4:5 portrait ratio, ideal for Instagram",
  crop_story: "Crop to 9:16 story ratio for TikTok/Instagram Stories",
  add_shadow: "Add a natural drop shadow under the product",
  enhance_detail: "Enhance fine details and textures, sharpen slightly",
} as const;
