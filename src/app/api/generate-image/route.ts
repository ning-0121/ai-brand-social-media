import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { uploadBase64ToStorage } from "@/lib/image-generation";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: Request) {
  try {
    const { prompt, size = "1:1", quantity = 1, style } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "请输入图片描述" }, { status: 400 });
    }

    const count = Math.min(Number(quantity) || 1, 4);
    const validRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
    const aspectRatio = validRatios.includes(size) ? size : "1:1";

    // Style prefix
    const styleHints: Record<string, string> = {
      product_photo: "Professional product photography, studio lighting, clean background. ",
      lifestyle: "Lifestyle photography, natural warm lighting, authentic setting. ",
      flat_lay: "Flat lay top-down view, aesthetically arranged, minimalist. ",
      social_media: "Vibrant social media content, eye-catching, modern design. ",
    };
    const fullPrompt = (styleHints[style] || "") + prompt;

    // Generate images
    const images: { url: string; prompt: string }[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: fullPrompt,
          config: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio,
            },
          },
        });

        // Extract image from response parts
        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) continue;

        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/")) {
            const b64 = part.inlineData.data;
            const ext = part.inlineData.mimeType === "image/jpeg" ? "jpg" : "png";
            const filename = `img-${i + 1}.${ext}`;

            let url: string;
            try {
              url = await uploadBase64ToStorage(b64, filename, part.inlineData.mimeType);
            } catch {
              url = `data:${part.inlineData.mimeType};base64,${b64}`;
            }

            images.push({ url, prompt: fullPrompt });
            break; // one image per generation call
          }
        }
      } catch (imgErr: unknown) {
        console.error(`Image ${i + 1} generation failed:`, imgErr);
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: "图片生成失败，请重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({ images, count: images.length });
  } catch (error: unknown) {
    console.error("Image generation error:", error);
    const message = error instanceof Error ? error.message : "图片生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
