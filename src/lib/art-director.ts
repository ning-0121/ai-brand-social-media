/**
 * AI Art Director
 *
 * 从品牌指南（颜色、语气、受众、对标品牌）生成：
 *   1. Visual DNA — 500 字的视觉风格描述，作为所有图片生成的共同锚点
 *   2. 4 张 Moodboard 参考图 — 展示这个 DNA 的实际效果
 *
 * 之后所有 AI 图片生成都会在 prompt 里带上 Visual DNA，
 * 保证跨 skill / 跨时间的视觉一致性。
 */

import { callLLM } from "./content-skills/llm";
import { generateImage } from "./image-service";
import { getBrandGuide, upsertBrandGuide } from "./brand-guide";

export interface VisualDNAResult {
  visual_dna: string;
  moodboard_urls: string[];
  generated_at: string;
}

export async function generateVisualDNA(): Promise<VisualDNAResult> {
  const guide = await getBrandGuide(true);
  if (!guide) throw new Error("请先填写品牌指南");

  // Step 1: LLM 生成 Visual DNA 描述 + 4 个 moodboard image prompts
  const dna = await callLLM(
    `You are an award-winning art director (think Fred & Farid, Mother, Wieden+Kennedy).
Your job: translate a brand into a SINGLE coherent visual language that all future photography/imagery will match.

Return JSON:
{
  "visual_dna": "300-500 word description of the brand's visual universe. Cover: color palette behavior, lighting style (hard/soft, direction, temperature), camera style (lens, aperture, angle), composition rules, post-processing grade, mood/emotion, what it avoids. Write as directive rules a photographer can follow, not poetry.",
  "moodboard_prompts": [
    "Detailed English image prompt 1 — establishing scene showcasing the brand's world",
    "Prompt 2 — product-close-up showing material/texture treatment",
    "Prompt 3 — lifestyle shot showing the audience in-context",
    "Prompt 4 — abstract/atmospheric shot establishing mood"
  ]
}`,
    `BRAND: ${guide.brand_name}
Tagline: ${guide.tagline || ""}
Positioning: ${guide.one_liner || ""}
Tone: ${guide.tone_of_voice || ""}
Audience: ${guide.audience_primary || ""}
Persona: ${guide.audience_persona || ""}
Colors: primary ${guide.primary_color} / accent ${guide.accent_color} / secondary ${guide.secondary_color} / neutral ${guide.neutral_color}
Value props: ${guide.value_props.join(" · ")}
Reference brands: ${guide.reference_brands.join(", ")}

Generate the visual DNA and 4 moodboard image prompts. Make sure the 4 images would FEEL like a unified set if placed side-by-side.`,
    2500,
    "complex"
  );

  const visualDna = (dna.visual_dna as string) || "";
  const moodboardPrompts = (dna.moodboard_prompts as string[]) || [];

  // Step 2: 并行生成 4 张 moodboard 图
  const moodboards = await Promise.allSettled(
    moodboardPrompts.slice(0, 4).map((prompt, i) =>
      generateImage(prompt, {
        style: "lifestyle",
        size: i === 0 ? "16:9" : i === 3 ? "16:9" : "1:1",
        filename: `moodboard-${guide.brand_name.toLowerCase().replace(/\s+/g, "-")}-${i}-${Date.now()}.png`,
      })
    )
  );

  const moodboardUrls = moodboards
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value!);

  const generatedAt = new Date().toISOString();

  // Step 3: 回写品牌指南
  await upsertBrandGuide({
    visual_dna: visualDna,
    moodboard_urls: moodboardUrls,
    visual_dna_generated_at: generatedAt,
  });

  return {
    visual_dna: visualDna,
    moodboard_urls: moodboardUrls,
    generated_at: generatedAt,
  };
}
