/**
 * 品牌指南：所有 skill 的共享上下文
 * 每次 runPrompt 自动注入 brand 变量，保证视觉/文案/语气一致
 */

import { supabase } from "./supabase";

export interface BrandGuide {
  id?: string;
  brand_name: string;
  tagline: string | null;
  one_liner: string | null;
  mission: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  neutral_color: string;
  gradient_css: string | null;
  font_heading: string;
  font_body: string;
  logo_url: string | null;
  hero_image_url: string | null;
  tone_of_voice: string | null;
  vocabulary_yes: string[];
  vocabulary_no: string[];
  signature_phrases: string[];
  audience_primary: string | null;
  audience_persona: string | null;
  value_props: string[];
  differentiators: string[];
  social_proof: Record<string, unknown>;
  reference_brands: string[];
  visual_dna: string | null;
  moodboard_urls: string[];
  visual_dna_generated_at: string | null;
  updated_at?: string;
}

let cached: { value: BrandGuide | null; at: number } = { value: null, at: 0 };
const CACHE_MS = 60_000; // 1 分钟

export async function getBrandGuide(force = false): Promise<BrandGuide | null> {
  if (!force && cached.value && Date.now() - cached.at < CACHE_MS) return cached.value;

  const { data } = await supabase
    .from("brand_guides").select("*")
    .order("updated_at", { ascending: false }).limit(1).maybeSingle();

  if (!data) return null;
  cached = { value: data as BrandGuide, at: Date.now() };
  return data as BrandGuide;
}

export async function upsertBrandGuide(updates: Partial<BrandGuide>): Promise<BrandGuide | null> {
  // 获取现有行 id
  const { data: existing } = await supabase
    .from("brand_guides").select("id").limit(1).maybeSingle();

  const payload = { ...updates, updated_at: new Date().toISOString() };
  if (existing) {
    const { data } = await supabase.from("brand_guides")
      .update(payload).eq("id", existing.id).select().single();
    cached = { value: data as BrandGuide, at: Date.now() };
    return data as BrandGuide;
  } else {
    const { data } = await supabase.from("brand_guides").insert(payload).select().single();
    cached = { value: data as BrandGuide, at: Date.now() };
    return data as BrandGuide;
  }
}

/**
 * 把 BrandGuide 展平成 prompt 变量，扁平化 key 方便模板直接用 {{brand.xxx}}
 */
export function formatForPrompt(b: BrandGuide | null): Record<string, unknown> {
  if (!b) return { brand: {} };
  return {
    brand: {
      name: b.brand_name,
      tagline: b.tagline || "",
      one_liner: b.one_liner || "",
      mission: b.mission || "",
      primary_color: b.primary_color,
      secondary_color: b.secondary_color,
      accent_color: b.accent_color,
      neutral_color: b.neutral_color,
      gradient_css: b.gradient_css || "",
      font_heading: b.font_heading,
      font_body: b.font_body,
      logo_url: b.logo_url || "",
      hero_image_url: b.hero_image_url || "",
      tone_of_voice: b.tone_of_voice || "",
      vocabulary_yes: b.vocabulary_yes.join(", "),
      vocabulary_no: b.vocabulary_no.join(", "),
      signature_phrases: b.signature_phrases.join(" / "),
      audience_primary: b.audience_primary || "",
      audience_persona: b.audience_persona || "",
      value_props: b.value_props.join(" · "),
      differentiators: b.differentiators.join(" · "),
      reference_brands: b.reference_brands.join(", "),
      visual_dna: b.visual_dna || "",
    },
  };
}

/**
 * 可读性摘要（给 LLM 当 system context 用）
 */
export function formatAsContextBlock(b: BrandGuide | null): string {
  if (!b) return "";
  const parts: string[] = [`BRAND CONTEXT — ${b.brand_name}`];
  if (b.tagline) parts.push(`Tagline: ${b.tagline}`);
  if (b.one_liner) parts.push(`Positioning: ${b.one_liner}`);
  if (b.audience_primary) parts.push(`Primary audience: ${b.audience_primary}`);
  if (b.tone_of_voice) parts.push(`Tone of voice: ${b.tone_of_voice}`);
  if (b.value_props.length) parts.push(`Value props: ${b.value_props.join(" · ")}`);
  if (b.vocabulary_yes.length) parts.push(`Use these words: ${b.vocabulary_yes.join(", ")}`);
  if (b.vocabulary_no.length) parts.push(`NEVER use: ${b.vocabulary_no.join(", ")}`);
  parts.push(`Colors: primary ${b.primary_color} / accent ${b.accent_color} / neutral ${b.neutral_color}`);
  if (b.reference_brands.length) parts.push(`Design reference: ${b.reference_brands.join(", ")}`);
  if (b.visual_dna) parts.push(`\nVISUAL DNA — all imagery must match this:\n${b.visual_dna}`);
  return parts.join("\n");
}
