import type { AgentConfigMap } from "../agent-types";
import { getDashboardKPIs, getTodayStats } from "../supabase-queries";

export const dataAnalystConfig: AgentConfigMap = {
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
