-- 补充竞品表字段 — 存 AI 差距分析报告 + 我方打分
alter table competitor_products
  add column if not exists ai_analysis jsonb,
  add column if not exists our_scores jsonb;

create index if not exists idx_competitor_products_our_product on competitor_products(our_product_id);
