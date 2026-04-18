-- 原子递增 RPC — 替代 read-modify-write，避免并发丢计数
create or replace function increment_ab_counter(
  p_variant_id uuid,
  p_column text
) returns void as $$
begin
  if p_column not in ('views_a', 'views_b', 'conversions_a', 'conversions_b') then
    raise exception 'invalid column: %', p_column;
  end if;
  execute format('update campaign_variants set %I = coalesce(%I, 0) + 1 where id = $1', p_column, p_column)
    using p_variant_id;
end;
$$ language plpgsql;
