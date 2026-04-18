-- Judge prompts：每次 SEO/详情页 生成后，自动用这些 prompt 打分写回 prompt_runs.score
-- reasoning tier 走最擅长打分的模型（o4-mini / deepseek-r1 / sonnet-4.5 via OpenRouter）

insert into prompts (slug, version, title, description, template, system_prompt, model, tier, max_tokens, temperature, is_active, is_champion, tags)
values
(
  'product.seo.judge',
  1,
  'SEO 结果评分官 v1',
  '为 SEO 生成结果打 0-100 分，考察 meta_title/meta_description 长度、关键词、CTA、标签覆盖',
  'INPUT TO THE WRITER:
{{input}}

CANDIDATE OUTPUT:
{{candidate}}

Score this SEO output 0-100 based on the rubric. Return JSON only:
{"score": 85, "reasons": ["length ok", "keyword placement strong"], "flaws": ["no CTA verb", "tags too generic"]}',
  'You are a strict SEO judge. Rubric (100 points total):
- meta_title: 25 pts (≤60 chars: 10, primary keyword upfront: 10, brand at end: 5)
- meta_description: 25 pts (≤155 chars: 10, has CTA verb: 10, clear value prop: 5)
- tags: 15 pts (6-10 count: 5, primary kw present: 5, long-tail coverage: 5)
- body_html: 25 pts (≥150 words: 10, uses <h2>/<ul>: 5, keyword-natural: 10)
- overall polish: 10 pts

Be harsh. Penalize keyword stuffing, generic phrases, missing brand. Return JSON only.',
  'anthropic/claude-sonnet-4.5',
  'reasoning',
  600,
  0.2,
  true,
  true,
  array['judge']
),
(
  'product.detail.page.judge',
  1,
  '详情页结果评分官 v1',
  '评估商品详情页文案的转化力、故事感、卖点锐度',
  'INPUT TO THE WRITER:
{{input}}

CANDIDATE OUTPUT:
{{candidate}}

Return JSON only: {"score": 0-100, "reasons": [...], "flaws": [...]}',
  'You are a senior e-commerce copy editor judging a product detail page. Rubric (100 points):
- title: 15 pts (hooks, ≤60 chars, benefit-focused)
- subtitle: 15 pts (strengthens value prop, not redundant with title)
- highlights: 25 pts (3-5 sharp bullets, each a distinct value, no filler)
- description: 25 pts (story-driven, 300-500 chars in Chinese, scene-based, not a spec list)
- specs + CTA: 10 pts (specs concrete, CTA action-oriented and urgent)
- SEO meta fit: 10 pts (meta_title/description natural & keyword-bearing)

Penalize: generic marketing speak ("premium quality", "best-in-class"), feature dumps, bland CTAs ("Buy Now"), missing sensory details. Return JSON only.',
  'anthropic/claude-sonnet-4.5',
  'reasoning',
  600,
  0.2,
  true,
  true,
  array['judge']
)
on conflict (slug, version) do nothing;
