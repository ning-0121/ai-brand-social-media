/**
 * Weekly Report Generator
 *
 * Aggregates weekly KPIs, AI operations, and impact data,
 * then generates an AI-written summary via Claude.
 */

import { supabase } from "./supabase";

interface WeeklyMetrics {
  revenue: number;
  orders: number;
  aov: number;
  customers: number;
  avg_seo_score: number;
  posts_published: number;
  ai_actions: number;
  ai_success_rate: number;
}

/**
 * Generate a weekly report for the given week.
 * week_start should be a Monday date string (YYYY-MM-DD).
 */
export async function generateWeeklyReport(
  weekStartOverride?: string
): Promise<{ id: string; summary: string }> {
  // Calculate week boundaries
  const now = new Date();
  const monday = weekStartOverride
    ? new Date(weekStartOverride)
    : getLastMonday(now);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const weekStart = monday.toISOString().split("T")[0];
  const weekEnd = sunday.toISOString().split("T")[0];
  const prevMonday = new Date(monday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevWeekStart = prevMonday.toISOString().split("T")[0];

  // 1. Aggregate this week's metrics
  const metrics = await aggregateWeekMetrics(weekStart, weekEnd);
  const prevMetrics = await aggregateWeekMetrics(
    prevWeekStart,
    weekStart
  );

  // 2. AI operations stats
  const aiStats = await getAIOperationsStats(weekStart, weekEnd);

  // 3. Top action impacts
  const topActions = await getTopActionImpacts(weekStart, weekEnd);

  // 4. Generate AI summary
  const { summary, highlights, concerns, recommendations } =
    await generateAISummary(metrics, prevMetrics, aiStats, topActions);

  // 5. Upsert weekly report
  const { data, error } = await supabase
    .from("weekly_reports")
    .upsert(
      {
        week_start: weekStart,
        summary,
        highlights,
        concerns,
        recommendations,
        metrics,
        prev_metrics: prevMetrics,
        ai_actions_count: aiStats.total,
        ai_success_rate: aiStats.successRate,
        top_actions: topActions,
      },
      { onConflict: "week_start" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return { id: data!.id, summary };
}

async function aggregateWeekMetrics(
  startDate: string,
  endDate: string
): Promise<WeeklyMetrics> {
  // Revenue & orders from Shopify
  const { data: orders } = await supabase
    .from("shopify_orders")
    .select("total_price, id")
    .gte("order_date", startDate)
    .lt("order_date", endDate);

  const revenue = (orders || []).reduce(
    (sum, o) => sum + Number(o.total_price || 0),
    0
  );
  const orderCount = orders?.length || 0;
  const aov = orderCount > 0 ? Math.round((revenue / orderCount) * 100) / 100 : 0;

  // Customers
  const { data: customers } = await supabase
    .from("shopify_customers")
    .select("id")
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  // Average SEO score
  const { data: products } = await supabase
    .from("products")
    .select("seo_score")
    .gt("seo_score", 0);
  const avgSeo =
    products && products.length > 0
      ? Math.round(
          products.reduce((s, p) => s + (p.seo_score || 0), 0) /
            products.length
        )
      : 0;

  // Published posts
  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("id")
    .eq("status", "published")
    .gte("published_at", startDate)
    .lt("published_at", endDate);

  // AI actions
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id, status")
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  const aiTotal = auditLogs?.length || 0;
  const aiSuccess = (auditLogs || []).filter((l) => l.status === "success").length;

  return {
    revenue: Math.round(revenue * 100) / 100,
    orders: orderCount,
    aov,
    customers: customers?.length || 0,
    avg_seo_score: avgSeo,
    posts_published: posts?.length || 0,
    ai_actions: aiTotal,
    ai_success_rate: aiTotal > 0 ? Math.round((aiSuccess / aiTotal) * 100) : 0,
  };
}

async function getAIOperationsStats(
  startDate: string,
  endDate: string
): Promise<{ total: number; successRate: number; byType: Record<string, number> }> {
  const { data } = await supabase
    .from("audit_logs")
    .select("action_type, status")
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  const logs = data || [];
  const total = logs.length;
  const success = logs.filter((l) => l.status === "success").length;
  const successRate = total > 0 ? Math.round((success / total) * 100 * 100) / 100 : 0;

  const byType: Record<string, number> = {};
  for (const log of logs) {
    byType[log.action_type] = (byType[log.action_type] || 0) + 1;
  }

  return { total, successRate, byType };
}

async function getTopActionImpacts(
  startDate: string,
  endDate: string
): Promise<Array<{ type: string; count: number; avg_impact: number }>> {
  const { data } = await supabase
    .from("action_impacts")
    .select("action_type, impact_score")
    .not("impact_score", "is", null)
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  if (!data || data.length === 0) return [];

  const grouped: Record<string, { count: number; totalScore: number }> = {};
  for (const item of data) {
    const key = item.action_type;
    if (!grouped[key]) grouped[key] = { count: 0, totalScore: 0 };
    grouped[key].count++;
    grouped[key].totalScore += Number(item.impact_score || 0);
  }

  return Object.entries(grouped)
    .map(([type, stats]) => ({
      type,
      count: stats.count,
      avg_impact: Math.round((stats.totalScore / stats.count) * 100) / 100,
    }))
    .sort((a, b) => b.avg_impact - a.avg_impact)
    .slice(0, 5);
}

async function generateAISummary(
  metrics: WeeklyMetrics,
  prevMetrics: WeeklyMetrics,
  aiStats: { total: number; successRate: number; byType: Record<string, number> },
  topActions: Array<{ type: string; count: number; avg_impact: number }>
): Promise<{
  summary: string;
  highlights: Array<{ title: string; metric: string; change: string }>;
  concerns: Array<{ title: string; detail: string }>;
  recommendations: string[];
}> {
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `你是一位资深品牌运营经理。请根据以下数据生成本周运营周报。

本周数据:
- 收入: ${metrics.revenue} (上周: ${prevMetrics.revenue})
- 订单: ${metrics.orders} (上周: ${prevMetrics.orders})
- 客单价: ${metrics.aov} (上周: ${prevMetrics.aov})
- 新客户: ${metrics.customers} (上周: ${prevMetrics.customers})
- 平均SEO分: ${metrics.avg_seo_score}
- 发布帖子: ${metrics.posts_published}
- AI操作: ${aiStats.total}次 (成功率: ${aiStats.successRate}%)
- AI操作分布: ${JSON.stringify(aiStats.byType)}
- 效果最好的AI操作: ${JSON.stringify(topActions)}

请输出 JSON 格式:
{
  "summary": "3-5句话的周报总结",
  "highlights": [{"title": "亮点标题", "metric": "具体数字", "change": "+xx%"}],
  "concerns": [{"title": "关注点", "detail": "具体说明"}],
  "recommendations": ["下周建议1", "下周建议2"]
}

只返回 JSON，不要其他内容。`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[weekly-report] AI generation failed:", err);
  }

  // Fallback: generate basic summary without AI
  const revChange = prevMetrics.revenue > 0
    ? Math.round(((metrics.revenue - prevMetrics.revenue) / prevMetrics.revenue) * 100)
    : 0;

  return {
    summary: `本周收入 ${metrics.revenue}，${revChange >= 0 ? "增长" : "下降"} ${Math.abs(revChange)}%。共执行 ${aiStats.total} 次 AI 操作，成功率 ${aiStats.successRate}%。`,
    highlights: [
      { title: "收入", metric: `${metrics.revenue}`, change: `${revChange >= 0 ? "+" : ""}${revChange}%` },
      { title: "订单", metric: `${metrics.orders}`, change: `${prevMetrics.orders > 0 ? Math.round(((metrics.orders - prevMetrics.orders) / prevMetrics.orders) * 100) : 0}%` },
    ],
    concerns: [],
    recommendations: ["继续优化产品 SEO", "增加社媒发布频率"],
  };
}

function getLastMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the latest weekly report.
 */
export async function getLatestWeeklyReport() {
  const { data } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
