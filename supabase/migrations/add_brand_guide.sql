-- 品牌指南（single-tenant 一行够用；多租户后续加 user_id）
create table if not exists brand_guides (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null default 'JOJOFEIFEI',
  tagline text,
  one_liner text,                              -- 一句话定位
  mission text,

  -- 视觉系统
  primary_color text default '#111111',        -- hex
  secondary_color text default '#f5f5f5',
  accent_color text default '#e11d48',
  neutral_color text default '#737373',
  gradient_css text,                           -- e.g. "linear-gradient(135deg, #667eea, #764ba2)"
  font_heading text default 'system-ui, -apple-system, "Helvetica Neue", sans-serif',
  font_body text default 'system-ui, -apple-system, sans-serif',
  logo_url text,
  hero_image_url text,

  -- 文案风格
  tone_of_voice text,                          -- e.g. "confident, warm, minimalist, no exclamation points"
  vocabulary_yes text[] default '{}',          -- 偏好词汇
  vocabulary_no text[] default '{}',           -- 禁用词汇
  signature_phrases text[] default '{}',       -- 品牌口头禅
  audience_primary text,                       -- 核心人群描述
  audience_persona text,                       -- 人物画像详细

  -- 商业
  value_props text[] default '{}',             -- 3-5 个核心价值主张
  differentiators text[] default '{}',         -- 差异化点
  social_proof jsonb default '{}',             -- { customer_count, rating, countries, years }
  reference_brands text[] default '{}',        -- 对标品牌

  updated_at timestamptz default now()
);

-- 保证只有一行（单租户）
create unique index if not exists brand_guides_singleton on brand_guides ((1));

-- 自动插入默认一行
insert into brand_guides (brand_name, tagline, one_liner, primary_color, accent_color, tone_of_voice, audience_primary, value_props)
values (
  'JOJOFEIFEI',
  'Move like you mean it.',
  'Premium athletic wear for women who train with intention.',
  '#0a0a0a',
  '#e11d48',
  'Confident, minimalist, direct. No hype words. Short sentences. Sensory details over spec dumps.',
  '25-35 yo women who lift, run, or practice yoga regularly; value quality fabric; willing to pay for fit and durability',
  array['Performance fabric that moves with you', 'Fit tested on real bodies', 'Designed to last 100+ washes']
)
on conflict do nothing;
