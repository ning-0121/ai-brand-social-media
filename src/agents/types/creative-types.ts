// ============ Creative Studio Types ============

export type ProjectType = "page" | "design" | "video" | "campaign";
export type ProjectStatus = "draft" | "generating" | "review" | "approved" | "published" | "exported";

// Unified creative project — stored in creative_projects table
export interface CreativeProject {
  id: string;
  project_type: ProjectType;
  title: string;
  status: ProjectStatus;
  product_id?: string;
  product_name?: string;
  brief: Record<string, unknown>;
  sections: PageSection[];
  assets: CreativeAsset[];
  generated_output?: Record<string, unknown>;
  seo?: { meta_title: string; meta_description: string; tags: string };
  shopify_ref?: string;
  approval_id?: string;
  agent_task_id?: string;
  created_at: string;
  updated_at: string;
}

// Page-specific
export type PageType = "detail_page" | "landing_page" | "homepage_hero" | "collection" | "faq" | "bundle";

export interface PageSection {
  type: "hero" | "highlights" | "specs" | "gallery" | "faq" | "reviews" | "bundle" | "cta" | "custom";
  title?: string;
  content: string;
  image_url?: string;
  order: number;
}

// Design-specific
export type DesignType = "banner" | "poster" | "social_image" | "ad_image" | "email_header" | "story_cover";

export interface DesignBrief {
  headline: string;
  subheadline?: string;
  cta?: string;
  brand_colors: string[];
  mood: "premium" | "sale" | "minimal" | "bold" | "playful";
  target_sizes: AssetSize[];
}

export interface AssetSize {
  width: number;
  height: number;
  label: string;
  platform?: string;
}

export interface CreativeAsset {
  id: string;
  asset_type: "image" | "html" | "video_script" | "copy";
  label: string;
  size?: AssetSize;
  url?: string;
  content?: string;
  prompt?: string;
  status: "pending" | "generated" | "approved";
}

// Video-specific
export interface VideoShot {
  order: number;
  duration: string;
  visual: string;
  voiceover?: string;
  text_overlay?: string;
  action?: string;
}

export interface VideoSubtitle {
  time: string;
  text: string;
}

// Campaign-specific
export interface CampaignTheme {
  name: string;
  slogan: string;
  hero_copy: string;
  colors: string[];
  mood: string;
}

export interface CampaignTimeline {
  phase: string;
  start: string;
  end: string;
  tasks: string[];
}

// Standard sizes for multi-platform export
export const STANDARD_SIZES: AssetSize[] = [
  { width: 1200, height: 628, label: "Facebook/LinkedIn 横版", platform: "facebook" },
  { width: 1080, height: 1080, label: "Instagram 正方形", platform: "instagram" },
  { width: 1080, height: 1920, label: "Story/TikTok 竖版", platform: "tiktok" },
  { width: 1200, height: 600, label: "Email Header", platform: "email" },
  { width: 1000, height: 1500, label: "Pinterest 竖版", platform: "pinterest" },
  { width: 1920, height: 600, label: "Shopify Banner 横版", platform: "shopify" },
];
