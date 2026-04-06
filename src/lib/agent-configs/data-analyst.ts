import type { AgentConfigMap } from "../agent-types";
import { getDashboardKPIs, getTodayStats, getProducts, getTopProducts } from "../supabase-queries";
import { supabase } from "../supabase";

export const dataAnalystConfig: AgentConfigMap = {
  diagnostic_sales: {
    scene: "diagnostic_sales",
    dataQueries: async () => {
      const kpis = await getDashboardKPIs();
      const today = await getTodayStats();
      const products = await getProducts();
      const topProducts = await getTopProducts(10);

      // 获取近 30 天订单
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from("shopify_orders")
        .select("total_price, order_date, financial_status")
        .gte("order_date", thirtyDaysAgo);

      // 获取内容统计
      const { data: contents } = await supabase
        .from("contents")
        .select("id, title, status, platform, created_at");

      return { kpis, today, products: products || [], topProducts, recentOrders: recentOrders || [], contents: contents || [] };
    },
    buildPrompt: (_input, data) => {
      const kpis = data.kpis as Record<string, unknown> | null;
      const products = (data.products as { id: string; name: string; price?: number; stock_quantity?: number; stock?: number }[]) || [];
      const topProducts = (data.topProducts as { title: string; total_quantity: number; total_revenue: number }[]) || [];
      const recentOrders = (data.recentOrders as { total_price: number; order_date: string }[]) || [];
      const contents = (data.contents as { id: string; title: string; status: string; platform: string; created_at: string }[]) || [];

      const topList = topProducts.map(p => `- ${p.title}: ${p.total_quantity} 件, $${p.total_revenue}`).join("\n");
      const contentSummary = `共 ${contents.length} 篇内容, 已发布 ${contents.filter(c => c.status === "published").length}, 待发布 ${contents.filter(c => c.status === "pending").length}`;
      const productsWithoutContent = products.filter(p => !contents.some(c => c.title?.includes(p.name))).length;

      return `请基于以下店铺数据进行销售和内容诊断，找出问题和机会。

KPI 概览：
${kpis ? `- 30天收入: ${kpis.totalRevenue} ${kpis.currency}\n- 30天订单: ${kpis.totalOrders}\n- 客单价: ${kpis.aov}\n- 收入趋势: ${kpis.revenueTrend}%\n- 订单趋势: ${kpis.ordersTrend}%` : "暂无KPI数据"}

热销商品 TOP 10：
${topList || "暂无销售数据"}

订单数据：近 30 天共 ${recentOrders.length} 单

内容概况：${contentSummary}
约 ${productsWithoutContent} 个商品尚无对应内容

商品总数：${products.length}

请严格按要求的 JSON 格式返回 findings 数组。`;
    },
  },

  daily_insight: {
    scene: "ai_daily_insight",
    dataQueries: async () => {
      const kpis = await getDashboardKPIs();
      const today = await getTodayStats();
      return { kpis, today };
    },
    buildPrompt: (_input, data) => {
      const kpis = data.kpis as Record<string, unknown> | null;
      const today = data.today as Record<string, unknown> | null;
      if (!kpis) return "暂无店铺数据。请给出通用的新店运营建议。";
      return `今日运营数据：
- 30天总收入: ${kpis.totalRevenue} ${kpis.currency}
- 30天订单数: ${kpis.totalOrders}
- 客单价: ${kpis.aov}
- 客户数: ${kpis.totalCustomers}
- 今日收入: ${today?.todayRevenue || 0}
- 今日订单: ${today?.todayOrders || 0}
请给出今日最重要的运营行动建议。`;
    },
  },
};
