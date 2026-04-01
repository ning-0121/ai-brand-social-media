import OpenAI from "openai";
import { NextResponse } from "next/server";
import { uploadBase64ToStorage } from "@/lib/image-generation";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, size = "1024x1024", quantity = 1, style } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "请输入图片描述" }, { status: 400 });
    }

    const count = Math.min(Number(quantity) || 1, 4);
    const validSize = ["1024x1024", "1792x1024", "1024x1792"].includes(size)
      ? size
      : "1024x1024";

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
        const response = await openai.images.generate({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: validSize as "1024x1024" | "1792x1024" | "1024x1792",
          response_format: "b64_json",
          quality: "standard",
        });

        const imageData = response.data?.[0];
        const b64 = imageData?.b64_json;
        if (!b64) continue;

        // Upload to Supabase Storage
        const filename = `img-${i + 1}.png`;
        let url: string;
        try {
          url = await uploadBase64ToStorage(b64, filename);
        } catch {
          // If storage upload fails, return as data URL
          url = `data:image/png;base64,${b64}`;
        }

        images.push({
          url,
          prompt: imageData?.revised_prompt || fullPrompt,
        });
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
