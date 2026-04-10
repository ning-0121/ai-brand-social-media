import { supabase } from "./supabase";

export interface CreativeTemplate {
  id: string;
  template_type: string;
  brand_id: string | null;
  title: string;
  description: string | null;
  schema_json: TemplateSectionDef[];
  default_copy_json: Record<string, unknown>;
  supported_channels: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateSectionDef {
  section_id: string;
  type: string;
  label: string;
  required?: boolean;
  min_items?: number;
  max_chars?: number;
  default_prompt?: string;
}

/**
 * Get all active templates, optionally filtered by type.
 */
export async function getTemplates(
  type?: string
): Promise<CreativeTemplate[]> {
  let query = supabase
    .from("creative_templates")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("template_type", type);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as CreativeTemplate[];
}

/**
 * Get a single template by ID.
 */
export async function getTemplate(
  id: string
): Promise<CreativeTemplate | null> {
  const { data, error } = await supabase
    .from("creative_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as CreativeTemplate;
}

/**
 * Apply a template to a generation request.
 * Returns a system prompt addendum describing the required structure.
 */
export function applyTemplate(template: CreativeTemplate): {
  structurePrompt: string;
  defaults: Record<string, unknown>;
} {
  const sections = template.schema_json || [];
  if (sections.length === 0) {
    return { structurePrompt: "", defaults: template.default_copy_json || {} };
  }

  const lines = sections.map((s) => {
    let desc = `- [${s.section_id}] ${s.label} (类型: ${s.type})`;
    if (s.required) desc += " [必须]";
    if (s.min_items) desc += ` [至少 ${s.min_items} 项]`;
    if (s.max_chars) desc += ` [最多 ${s.max_chars} 字]`;
    return desc;
  });

  const structurePrompt = [
    "\n\n=== 模板结构要求 ===",
    `模板: ${template.title}`,
    "输出必须包含以下章节，每个章节对应一个 JSON key:",
    ...lines,
    "请严格按照以上结构输出 JSON。",
  ].join("\n");

  return {
    structurePrompt,
    defaults: template.default_copy_json || {},
  };
}
