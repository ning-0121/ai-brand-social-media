/**
 * 周度运营数据包 — 喂给诊断官 & 策划师的真实信号
 * 不只是 30 天快照，而是 4 周 WoW 趋势 + 新老客分层 + SKU 起落
 */

import { supabase } from "./supabase";

interface WeekBucket {
  week_label: string;        // "W-0" = 本周, "W-1" = 上周, etc
  start: string;
  end: string;
  revenue: number;
  orders: number;
  unique_customers: number;
  new_customers: number;       // 本周首次下单
  returning_customers: number;
  aov: number;
}

export interface ProductTrend {
  product_id: string;
  name: string;
  category: string | null;
  price: number | null;
  stock: number | null;
  seo_score: number | null;
  has_meta: boolean;
  w0_units: number;            // 本周销量
  w1_units: number;            // 上周
  w2_units: number;
  w3_units: number;
  total_4w_units: number;
  total_4w_revenue: number;
  wow_change_pct: number | null;  // 本周 vs 上周 %
  trend: "rising" | "falling" | "flat" | "dormant";
}

export interface WeeklyDataBundle {
  generated_at: string;
  /** 4 周分桶，index 0 = 最近一周 */
  weeks: WeekBucket[];
  /** 4 周累计 */
  totals: {
    revenue: number;
    orders: number;
    unique_customers: number;
    aov: number;
  };
  /** WoW 关键变化 */
  wow_deltas: {
    revenue_change_pct: number | null;
    orders_change_pct: number | null;
    aov_change_pct: number | null;
    new_customer_pct_this_week: number;
  };
  /** SKU 级别趋势 */
  products: {
    rising_stars: ProductTrend[];     // 上升最快（有销量）
    falling: ProductTrend[];          // 本周 vs 上周下降最多
    dormant: ProductTrend[];          // 4 周 0 销量但有库存
    all: ProductTrend[];              // 全量，按 revenue 排序
  };
  /** 商品健康度（不是卖得怎样，是店里状态） */
  store_health: {
    total_products: number;
    missing_meta: number;
    missing_body_html: number;
    out_of_stock: number;
    low_seo_score_count: number;      // seo_score < 60
    avg_seo_score: number;
  };
  /** 最近执行的 AI 任务成功率 */
  ai_execution: {
    last_7d_total: number;
    last_7d_success: number;
    last_7d_failed: number;
    success_rate: number;
    top_failure_reasons: string[];
  };
  /** A/B 活动真实转化（如果有） */
  ab_outcomes: {
    total_variants: number;
    declared_winners: number;
    avg_winner_conversion_rate: number | null;
  };
  /** GA4 网站流量（如果已连接） */
  ga4: {
    connected: boolean;
    sessions_30d: number;
    users_30d: number;
    new_users_30d: number;
    bounce_rate: number;          // 0~100，百分比
    avg_session_duration_sec: number;
    page_views_30d: number;
    top_sources: Array<{ source: string; medium: string; sessions: number }>;
  } | null;
}

function startOfDay(d: Date): string { return d.toISOString().split("T")[0]; }

export async function getWeeklyDataBundle(): Promise<WeeklyDataBundle> {
  const now = new Date();
  const todayStr = startOfDay(now);

  // 构建 4 个周窗口
  const weeks: WeekBucket[] = [];
  for (let i = 0; i < 4; i++) {
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    weeks.push({
      week_label: `W-${i}`,
      start: startOfDay(start),
      end: startOfDay(end),
      revenue: 0, orders: 0, unique_customers: 0, new_customers: 0, returning_customers: 0, aov: 0,
    });
  }

  // 拉 30 天订单
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);
  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("customer_id, email, total_price, created_at, financial_status, line_items")
    .gte("created_at", startOfDay(fourWeeksAgo))
    .order("created_at", { ascending: true });

  // 构建客户首单映射（用于新/老客判断）
  const customerFirstOrder: Record<string, string> = {};
  for (const o of orders || []) {
    const key = (o.customer_id || o.email || "") as string;
    if (!key) continue;
    if (!customerFirstOrder[key] || o.created_at < customerFirstOrder[key]) {
      customerFirstOrder[key] = o.created_at as string;
    }
  }

  // SKU 销量 per week
  const productSales: Record<string, { w0: number; w1: number; w2: number; w3: number; revenue: number }> = {};
  const customerSet: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };

  for (const o of orders || []) {
    if (o.financial_status !== "paid" && o.financial_status !== "partially_refunded") continue;
    const orderDate = o.created_at as string;
    const weekIdx = weeks.findIndex(w => orderDate >= w.start && orderDate < w.end);
    if (weekIdx === -1) continue;

    const bucket = weeks[weekIdx];
    bucket.revenue += Number(o.total_price || 0);
    bucket.orders++;

    const custKey = (o.customer_id || o.email || "") as string;
    if (custKey) {
      customerSet[weekIdx].add(custKey);
      const isFirst = customerFirstOrder[custKey] === orderDate;
      if (isFirst) bucket.new_customers++;
      else bucket.returning_customers++;
    }

    const items = (o.line_items as Array<{ product_id?: number | string; quantity?: number; price?: number }>) || [];
    for (const it of items) {
      const pid = String(it.product_id || "");
      if (!pid) continue;
      if (!productSales[pid]) productSales[pid] = { w0: 0, w1: 0, w2: 0, w3: 0, revenue: 0 };
      const key = `w${weekIdx}` as "w0" | "w1" | "w2" | "w3";
      productSales[pid][key] += it.quantity || 0;
      productSales[pid].revenue += (it.price || 0) * (it.quantity || 0);
    }
  }

  for (let i = 0; i < 4; i++) {
    weeks[i].unique_customers = customerSet[i].size;
    weeks[i].aov = weeks[i].orders > 0 ? weeks[i].revenue / weeks[i].orders : 0;
  }

  // WoW delta（W-0 vs W-1）
  const w0 = weeks[0], w1 = weeks[1];
  const pct = (a: number, b: number): number | null => b === 0 ? null : Math.round(((a - b) / b) * 1000) / 10;
  const wowDeltas = {
    revenue_change_pct: pct(w0.revenue, w1.revenue),
    orders_change_pct: pct(w0.orders, w1.orders),
    aov_change_pct: pct(w0.aov, w1.aov),
    new_customer_pct_this_week: w0.unique_customers > 0
      ? Math.round((w0.new_customers / w0.unique_customers) * 1000) / 10
      : 0,
  };

  // 拉商品
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, price, stock, seo_score, meta_title, meta_description, body_html, shopify_product_id")
    .eq("platform", "shopify").not("shopify_product_id", "is", null);

  const productTrends: ProductTrend[] = (products || []).map(p => {
    const s = productSales[String(p.shopify_product_id)] || { w0: 0, w1: 0, w2: 0, w3: 0, revenue: 0 };
    const total = s.w0 + s.w1 + s.w2 + s.w3;
    const wowChange = pct(s.w0, s.w1);
    let trend: ProductTrend["trend"] = "flat";
    if (total === 0) trend = "dormant";
    else if (wowChange !== null && wowChange > 20) trend = "rising";
    else if (wowChange !== null && wowChange < -20) trend = "falling";

    return {
      product_id: p.id as string,
      name: p.name as string,
      category: p.category as string | null,
      price: p.price as number | null,
      stock: p.stock as number | null,
      seo_score: p.seo_score as number | null,
      has_meta: !!(p.meta_title && p.meta_description),
      w0_units: s.w0, w1_units: s.w1, w2_units: s.w2, w3_units: s.w3,
      total_4w_units: total,
      total_4w_revenue: Math.round(s.revenue),
      wow_change_pct: wowChange,
      trend,
    };
  });

  const risingStars = productTrends
    .filter(p => p.trend === "rising")
    .sort((a, b) => (b.wow_change_pct || 0) - (a.wow_change_pct || 0))
    .slice(0, 5);
  const falling = productTrends
    .filter(p => p.trend === "falling" && p.total_4w_units > 0)
    .sort((a, b) => (a.wow_change_pct || 0) - (b.wow_change_pct || 0))
    .slice(0, 5);
  const dormant = productTrends
    .filter(p => p.trend === "dormant" && (p.stock || 0) > 0)
    .sort((a, b) => (b.stock || 0) - (a.stock || 0))
    .slice(0, 10);
  const allSorted = [...productTrends].sort((a, b) => b.total_4w_revenue - a.total_4w_revenue);

  const storeHealth = {
    total_products: productTrends.length,
    missing_meta: productTrends.filter(p => !p.has_meta).length,
    missing_body_html: (products || []).filter(p => !p.body_html || (p.body_html as string).length < 100).length,
    out_of_stock: productTrends.filter(p => (p.stock || 0) === 0).length,
    low_seo_score_count: productTrends.filter(p => (p.seo_score || 0) < 60).length,
    avg_seo_score: productTrends.length > 0
      ? Math.round(productTrends.reduce((s, p) => s + (p.seo_score || 0), 0) / productTrends.length)
      : 0,
  };

  // AI 执行统计（最近 7 天）
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const { data: recentTasks } = await supabase
    .from("ops_daily_tasks")
    .select("execution_status, execution_result")
    .gte("updated_at", startOfDay(sevenDaysAgo));
  const total7d = recentTasks?.length || 0;
  const success7d = recentTasks?.filter(t => ["auto_executed", "completed"].includes(t.execution_status as string)).length || 0;
  const failed7d = recentTasks?.filter(t => t.execution_status === "failed").length || 0;
  const failures = (recentTasks || [])
    .filter(t => t.execution_status === "failed")
    .map(t => ((t.execution_result as { error?: string })?.error || "").slice(0, 40))
    .filter(Boolean);
  const failCounts: Record<string, number> = {};
  for (const f of failures) failCounts[f] = (failCounts[f] || 0) + 1;
  const topFailureReasons = Object.entries(failCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([reason, n]) => `${reason} (${n}x)`);

  // A/B 结果
  const { data: variants } = await supabase.from("campaign_variants")
    .select("winner, views_a, views_b, conversions_a, conversions_b")
    .gte("created_at", startOfDay(fourWeeksAgo));
  const declared = (variants || []).filter(v => v.winner);
  const avgWinnerRate = declared.length > 0
    ? declared.reduce((s, v) => {
        const views = v.winner === "a" ? (v.views_a || 0) : (v.views_b || 0);
        const conv = v.winner === "a" ? (v.conversions_a || 0) : (v.conversions_b || 0);
        return s + (views > 0 ? conv / views : 0);
      }, 0) / declared.length
    : null;

  return {
    generated_at: todayStr,
    weeks,
    totals: {
      revenue: weeks.reduce((s, w) => s + w.revenue, 0),
      orders: weeks.reduce((s, w) => s + w.orders, 0),
      unique_customers: new Set(
        Array.from(customerSet[0]).concat(
          Array.from(customerSet[1]),
          Array.from(customerSet[2]),
          Array.from(customerSet[3])
        )
      ).size,
      aov: (() => {
        const totalR = weeks.reduce((s, w) => s + w.revenue, 0);
        const totalO = weeks.reduce((s, w) => s + w.orders, 0);
        return totalO > 0 ? totalR / totalO : 0;
      })(),
    },
    wow_deltas: wowDeltas,
    products: {
      rising_stars: risingStars,
      falling,
      dormant,
      all: allSorted,
    },
    store_health: storeHealth,
    ai_execution: {
      last_7d_total: total7d,
      last_7d_success: success7d,
      last_7d_failed: failed7d,
      success_rate: total7d > 0 ? Math.round((success7d / total7d) * 100) : 100,
      top_failure_reasons: topFailureReasons,
    },
    ab_outcomes: {
      total_variants: variants?.length || 0,
      declared_winners: declared.length,
      avg_winner_conversion_rate: avgWinnerRate,
    },
    ga4: await fetchGA4Summary(),
  };
}

/** 从 GA4 API 抓取 30 天流量摘要（静默失败） */
async function fetchGA4Summary(): Promise<WeeklyDataBundle["ga4"]> {
  try {
    const { getGA4Overview, getGA4TrafficSources } = await import("./ga4-api");
    const [overview, sources] = await Promise.all([
      getGA4Overview(30),
      getGA4TrafficSources(30),
    ]);
    if (!overview) return { connected: false, sessions_30d: 0, users_30d: 0, new_users_30d: 0, bounce_rate: 0, avg_session_duration_sec: 0, page_views_30d: 0, top_sources: [] };
    return {
      connected: true,
      sessions_30d: overview.sessions,
      users_30d: overview.users,
      new_users_30d: overview.newUsers,
      bounce_rate: overview.bounceRate,
      avg_session_duration_sec: overview.avgSessionDuration,
      page_views_30d: overview.pageViews,
      top_sources: (sources || []).slice(0, 5),
    };
  } catch {
    return null;
  }
}

/** 格式化为 LLM-friendly 文本块 */
export function formatBundleForPrompt(b: WeeklyDataBundle): string {
  const lines: string[] = [];
  lines.push(`=== 4 周趋势 ===`);
  for (const w of b.weeks) {
    lines.push(`${w.week_label} (${w.start} ~ ${w.end}): $${w.revenue.toFixed(0)} · ${w.orders} 单 · AOV $${w.aov.toFixed(1)} · ${w.unique_customers} 客户（新 ${w.new_customers}/老 ${w.returning_customers}）`);
  }
  lines.push(``);
  lines.push(`=== WoW 变化（本周 vs 上周）===`);
  lines.push(`营收: ${b.wow_deltas.revenue_change_pct ?? "N/A"}% · 订单: ${b.wow_deltas.orders_change_pct ?? "N/A"}% · AOV: ${b.wow_deltas.aov_change_pct ?? "N/A"}% · 新客占比: ${b.wow_deltas.new_customer_pct_this_week}%`);
  lines.push(``);
  lines.push(`=== 本周上升之星（继续加码）===`);
  if (b.products.rising_stars.length === 0) lines.push("无显著上升品");
  else for (const p of b.products.rising_stars) {
    lines.push(`  [${p.product_id}] ${p.name} — 本周 ${p.w0_units}件（上周 ${p.w1_units}，${p.wow_change_pct}%），4w 营收 $${p.total_4w_revenue}`);
  }
  lines.push(``);
  lines.push(`=== 下滑警报（需干预）===`);
  if (b.products.falling.length === 0) lines.push("无显著下滑品");
  else for (const p of b.products.falling) {
    lines.push(`  [${p.product_id}] ${p.name} — 本周 ${p.w0_units}（上周 ${p.w1_units}，${p.wow_change_pct}%）`);
  }
  lines.push(``);
  lines.push(`=== 僵尸库存（4 周 0 销量）===`);
  if (b.products.dormant.length === 0) lines.push("无僵尸品");
  else for (const p of b.products.dormant) {
    lines.push(`  [${p.product_id}] ${p.name} — 库存 ${p.stock}, 价 $${p.price}, SEO ${p.seo_score}`);
  }
  lines.push(``);
  lines.push(`=== 店铺健康 ===`);
  lines.push(`总商品 ${b.store_health.total_products} · 缺 Meta ${b.store_health.missing_meta} · 描述过短 ${b.store_health.missing_body_html} · 缺货 ${b.store_health.out_of_stock} · SEO<60 ${b.store_health.low_seo_score_count} · 平均 SEO ${b.store_health.avg_seo_score}`);
  lines.push(``);
  lines.push(`=== AI 执行健康（最近 7 天）===`);
  lines.push(`总 ${b.ai_execution.last_7d_total} / 成功 ${b.ai_execution.last_7d_success} / 失败 ${b.ai_execution.last_7d_failed} / 成功率 ${b.ai_execution.success_rate}%`);
  if (b.ai_execution.top_failure_reasons.length > 0) {
    lines.push(`Top 失败原因: ${b.ai_execution.top_failure_reasons.join(" · ")}`);
  }
  lines.push(``);
  lines.push(`=== A/B 测试历史 ===`);
  lines.push(`累计 ${b.ab_outcomes.total_variants} 组，已宣告 ${b.ab_outcomes.declared_winners} 个 winner${b.ab_outcomes.avg_winner_conversion_rate !== null ? `，平均 winner 转化率 ${(b.ab_outcomes.avg_winner_conversion_rate * 100).toFixed(2)}%` : ""}`);
  lines.push(``);

  // GA4 流量数据（如果已连接）
  if (b.ga4?.connected) {
    const g = b.ga4;
    const bounceLabel = g.bounce_rate > 80 ? "🔴 严重偏高" : g.bounce_rate > 60 ? "🟡 偏高" : "🟢 正常";
    const dur = g.avg_session_duration_sec < 60
      ? `${Math.round(g.avg_session_duration_sec)}秒`
      : `${Math.floor(g.avg_session_duration_sec / 60)}分${Math.round(g.avg_session_duration_sec % 60)}秒`;
    lines.push(`=== GA4 网站流量（近 30 天）===`);
    lines.push(`访客 UV: ${g.users_30d}（新访客 ${g.new_users_30d}，回访 ${g.users_30d - g.new_users_30d}）`);
    lines.push(`页面浏览 PV: ${g.page_views_30d} · 访问次数: ${g.sessions_30d} · 人均 PV: ${g.sessions_30d > 0 ? (g.page_views_30d / g.sessions_30d).toFixed(1) : "N/A"}`);
    lines.push(`跳出率: ${g.bounce_rate.toFixed(1)}% ${bounceLabel} — 超过 70% 说明落地页内容/加载速度/CTA 需要优化`);
    lines.push(`平均停留时长: ${dur}`);
    if (g.top_sources.length > 0) {
      lines.push(`流量来源: ${g.top_sources.map(s => `${s.source}/${s.medium}(${s.sessions}次)`).join(" · ")}`);
    }
    // 给 AI 的行动信号
    if (g.bounce_rate > 80) {
      lines.push(`⚠️ 跳出率严重偏高 (${g.bounce_rate.toFixed(1)}%)，AI 需重点生成落地页优化、首屏内容改写、CTA 强化方案`);
    }
    if (g.new_users_30d / Math.max(g.users_30d, 1) > 0.85) {
      lines.push(`⚠️ 新访客占比 ${((g.new_users_30d / g.users_30d) * 100).toFixed(0)}%，老访客极少——需增强站内回购引导/邮件留存`);
    }
  } else {
    lines.push(`=== GA4 流量 ===`);
    lines.push(`未连接 GA4，无法获取网站流量数据`);
  }

  return lines.join("\n");
}
