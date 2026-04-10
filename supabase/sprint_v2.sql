-- ============================================================
-- Sprint 2: Brand Memory + Templates + Revenue Loop Support
-- ============================================================

-- 1. Brand Profiles
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name TEXT NOT NULL,
  voice_style TEXT,
  visual_style TEXT,
  target_audience TEXT,
  key_categories TEXT[] DEFAULT '{}',
  preferred_platforms TEXT[] DEFAULT '{}',
  primary_colors TEXT[] DEFAULT '{}',
  secondary_colors TEXT[] DEFAULT '{}',
  typography_notes TEXT,
  banned_words TEXT[] DEFAULT '{}',
  core_value_props TEXT[] DEFAULT '{}',
  pricing_position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read brand_profiles" ON brand_profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write brand_profiles" ON brand_profiles FOR ALL USING (auth.uid() IS NOT NULL);
-- Allow anon insert for cron/agent context
CREATE POLICY "Allow anon insert brand_profiles" ON brand_profiles FOR INSERT WITH CHECK (true);

-- 2. Creative Templates
CREATE TABLE IF NOT EXISTS creative_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_type TEXT NOT NULL CHECK (template_type IN (
    'product_page', 'campaign_page', 'poster', 'social_post',
    'email', 'banner', 'landing_page', 'video_script'
  )),
  brand_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  schema_json JSONB NOT NULL DEFAULT '[]',
  default_copy_json JSONB DEFAULT '{}',
  supported_channels TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_templates_type ON creative_templates(template_type);
ALTER TABLE creative_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read creative_templates" ON creative_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write creative_templates" ON creative_templates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow anon read creative_templates" ON creative_templates FOR SELECT USING (true);

-- 3. Extend content_queue
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS provider_post_id TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE content_queue ADD COLUMN IF NOT EXISTS publish_attempts INTEGER DEFAULT 0;

-- 4. Extend creative_exports
ALTER TABLE creative_exports ADD COLUMN IF NOT EXISTS file_key TEXT;
ALTER TABLE creative_exports ADD COLUMN IF NOT EXISTS size_bytes BIGINT;
ALTER TABLE creative_exports ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ;

-- 5. Extend creative_projects
ALTER TABLE creative_projects ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES creative_templates(id) ON DELETE SET NULL;
ALTER TABLE creative_projects ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brand_profiles(id) ON DELETE SET NULL;

-- 6. Seed default templates
INSERT INTO creative_templates (template_type, title, description, schema_json, default_copy_json, supported_channels) VALUES
(
  'product_page',
  'Standard Product Page',
  'Hero + highlights + specs + FAQ + CTA for Shopify product pages',
  '[
    {"section_id": "hero", "type": "image_text", "label": "Hero Section", "required": true},
    {"section_id": "highlights", "type": "bullet_list", "label": "Key Highlights", "required": true, "min_items": 3},
    {"section_id": "specs", "type": "key_value_table", "label": "Specifications", "required": false},
    {"section_id": "faq", "type": "qa_list", "label": "FAQ", "required": false},
    {"section_id": "cta", "type": "cta_block", "label": "Call to Action", "required": true}
  ]'::jsonb,
  '{"cta": {"primary": "Shop Now", "secondary": "Learn More"}}'::jsonb,
  '{"shopify"}'
),
(
  'campaign_page',
  'Campaign Landing Page',
  'Hero banner + value props + featured products + social proof + CTA',
  '[
    {"section_id": "hero_banner", "type": "banner", "label": "Hero Banner", "required": true},
    {"section_id": "value_props", "type": "icon_grid", "label": "Value Propositions", "required": true, "min_items": 3},
    {"section_id": "featured_products", "type": "product_grid", "label": "Featured Products", "required": false},
    {"section_id": "social_proof", "type": "testimonials", "label": "Social Proof", "required": false},
    {"section_id": "cta_footer", "type": "cta_block", "label": "Footer CTA", "required": true}
  ]'::jsonb,
  '{}'::jsonb,
  '{"shopify", "independent"}'
),
(
  'poster',
  'Campaign Poster',
  'Single visual with headline + subhead + CTA',
  '[
    {"section_id": "visual", "type": "full_bleed_image", "label": "Background Visual", "required": true},
    {"section_id": "headline", "type": "text_overlay", "label": "Headline", "required": true, "max_chars": 60},
    {"section_id": "subheadline", "type": "text_overlay", "label": "Subheadline", "required": false, "max_chars": 120},
    {"section_id": "cta", "type": "button_overlay", "label": "CTA Button", "required": true}
  ]'::jsonb,
  '{"cta": "Shop Now"}'::jsonb,
  '{"instagram", "facebook", "xiaohongshu"}'
),
(
  'social_post',
  'Multi-Platform Social Post',
  'Caption + hashtags + image prompt for social media',
  '[
    {"section_id": "caption", "type": "rich_text", "label": "Caption", "required": true},
    {"section_id": "hashtags", "type": "tag_list", "label": "Hashtags", "required": true, "min_items": 3},
    {"section_id": "image_prompt", "type": "text", "label": "Image Generation Prompt", "required": false},
    {"section_id": "cta", "type": "text", "label": "Call to Action", "required": false}
  ]'::jsonb,
  '{}'::jsonb,
  '{"instagram", "tiktok", "xiaohongshu", "facebook"}'
);
