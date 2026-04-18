-- Seed 2 核心 prompts: SEO 优化 + 商品详情页
-- Run after add_prompts_tables.sql

insert into prompts (slug, version, title, description, template, system_prompt, model, tier, max_tokens, temperature, is_active, is_champion)
values
(
  'product.seo.optimize',
  1,
  'SEO 标题描述优化 v1',
  '生成 meta_title / meta_description / tags / body_html，同一次调用自评 QA 分',
  'Product: {{product.name}}
Current meta_title: {{product.meta_title}}
Current meta_description: {{product.meta_description}}
Current description (truncated): {{product.body_html_plain}}
Current tags: {{product.tags}}
{{keywords_block}}
{{qa_feedback_block}}
{{competitors_block}}

Return:
{
  "meta_title": "...",
  "meta_description": "...",
  "tags": "tag1, tag2, tag3, ...",
  "body_html": "<h2>...</h2><p>...</p>...",
  "improvements": ["what was improved"],
  "qa_score": 85
}',
  'You are a senior Shopify SEO expert. Generate optimized SEO content AND self-score it in one pass.

RULES:
- meta_title: ≤60 chars, lead with primary keyword, brand at end
- meta_description: ≤155 chars, include CTA verb ("Shop", "Discover", "Get")
- tags: 6-10 tags covering primary keyword, category, use-case, long-tail, seasonal
- body_html: keyword-rich but natural, structured with <h2>/<ul>, ≥150 words
- qa_score: honest 0-100. Must be ≥75 to deploy. Deduct for: keyword stuffing, generic copy, >60 char title, >155 char description.

Return JSON only — no markdown.',
  'anthropic/claude-sonnet-4.5',
  'balanced',
  1800,
  0.7,
  true,
  true
),
(
  'product.detail.page',
  1,
  '商品详情页文案 v1',
  '完整详情页：标题/副标题/5 卖点/300-500 字描述/规格/双 CTA/SEO meta',
  '为以下商品生成完整的详情页文案：

商品名称：{{product.name}}
当前描述：{{product.body_html}}
价格：{{product.price}}
品类：{{product.category}}
当前 meta：{{product.meta_title}} / {{product.meta_description}}
品牌定位：{{brand_positioning}}
文案语气：{{tone}}
{{audience_block}}

请生成 JSON 格式：
{
  "title": "商品标题（60字以内）",
  "subtitle": "副标题（强化价值主张）",
  "highlights": ["卖点1", "卖点2", "卖点3", "卖点4", "卖点5"],
  "description": "详细描述（场景化故事化，300-500字）",
  "specs": [{"name": "规格项", "value": "规格值"}],
  "cta_primary": "主 CTA 按钮文案",
  "cta_secondary": "次 CTA 按钮文案",
  "meta_title": "SEO 标题（70字符内）",
  "meta_description": "SEO 描述（160字符内）",
  "tags": "标签1, 标签2, 标签3"
}',
  '你是顶级电商详情页文案专家，擅长为 Shopify、Amazon、独立站撰写高转化率的商品详情页。
你的文案有以下特点：
1. 标题简洁有力，直击痛点
2. 副标题强化价值主张
3. 卖点用 3-5 个 bullet point，每个突出一个价值
4. 详细描述场景化、有故事感
5. SEO meta 包含核心关键词且自然
6. CTA 紧迫且有行动力

请严格按 JSON 格式返回结果。',
  'anthropic/claude-sonnet-4.5',
  'balanced',
  3000,
  0.7,
  true,
  true
)
on conflict (slug, version) do nothing;
