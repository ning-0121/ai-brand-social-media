export type SkillCategory = "website" | "social" | "campaign" | "ugc";

export interface SkillInputDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "product" | "products" | "platform";
  required?: boolean;
  default?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SkillCostEstimate {
  text: number;
  image: number;
}

export interface SkillInputData {
  product?: ProductLite;
  products?: ProductLite[];
  platform?: string;
  topic?: string;
  goal?: string;
  duration?: string;
  audience?: string;
  campaign_theme?: string;
  [key: string]: unknown;
}

export interface SkillContext {
  brand_positioning?: string;
  competitors?: unknown[];
  trends?: unknown[];
  brand_tone?: string;
}

export interface SkillResult {
  skill_id: string;
  output: Record<string, unknown>;
  generated_at: string;
  estimated_cost: SkillCostEstimate;
}

export interface ProductLite {
  id: string;
  name: string;
  description?: string;
  body_html?: string;
  meta_title?: string;
  meta_description?: string;
  tags?: string[] | string;
  price?: number;
  category?: string;
  image_url?: string;
  shopify_product_id?: number;
}

export interface ContentSkill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  icon: string;
  color: string;
  inputs: SkillInputDef[];
  estimated_cost: SkillCostEstimate;
  estimated_time_seconds: number;
  requires_image?: boolean;
  agents: string[];
  execute: (input: SkillInputData, context?: SkillContext) => Promise<SkillResult>;
}
