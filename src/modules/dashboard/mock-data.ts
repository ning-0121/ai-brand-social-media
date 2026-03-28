import { KPIData } from "@/lib/types";
import { RevenueDataPoint, PlatformSales, Activity, Task } from "./types";

export const dashboardKPIs: KPIData[] = [
  { label: "总销售额", value: 1285000, trend: "up", trendPercent: 12.5, icon: "DollarSign", format: "currency" },
  { label: "总订单数", value: 3842, trend: "up", trendPercent: 8.3, icon: "ShoppingCart", format: "number" },
  { label: "内容发布数", value: 156, trend: "up", trendPercent: 23.1, icon: "FileText", format: "number" },
  { label: "粉丝增长", value: 12.3, trend: "up", trendPercent: 12.3, icon: "Users", format: "percent" },
];

export const revenueData: RevenueDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 2, i + 1);
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    revenue: Math.floor(30000 + Math.random() * 50000 + i * 1000),
    orders: Math.floor(80 + Math.random() * 80 + i * 3),
  };
});

export const platformSales: PlatformSales[] = [
  { platform: "shopify", name: "Shopify", revenue: 450000, percentage: 35, fill: "hsl(var(--chart-1))" },
  { platform: "tiktok", name: "TikTok Shop", revenue: 320000, percentage: 25, fill: "hsl(var(--chart-2))" },
  { platform: "amazon", name: "Amazon", revenue: 256000, percentage: 20, fill: "hsl(var(--chart-3))" },
  { platform: "independent", name: "独立站", revenue: 180000, percentage: 14, fill: "hsl(var(--chart-4))" },
  { platform: "xiaohongshu", name: "小红书", revenue: 79000, percentage: 6, fill: "hsl(var(--chart-5))" },
];

export const recentActivities: Activity[] = [
  { id: "1", type: "content", title: "新内容已发布", description: "TikTok 短视频「春季穿搭合集」已自动发布", timestamp: "10 分钟前" },
  { id: "2", type: "order", title: "大额订单", description: "Shopify 店铺收到 ¥2,580 订单", timestamp: "25 分钟前" },
  { id: "3", type: "trend", title: "趋势提醒", description: "「迷你便携风扇」在 TikTok 搜索量激增 150%", timestamp: "1 小时前" },
  { id: "4", type: "review", title: "差评提醒", description: "Amazon 产品「无线耳机」收到 1 条差评，建议回复", timestamp: "2 小时前" },
  { id: "5", type: "system", title: "SEO 优化建议", description: "5 个产品页 SEO 分数低于 60，建议优化", timestamp: "3 小时前" },
  { id: "6", type: "content", title: "内容排期提醒", description: "明天有 3 条内容待发布，请确认", timestamp: "4 小时前" },
];

export const tasks: Task[] = [
  { id: "1", title: "回复 Amazon 差评", completed: false, priority: "high", category: "客服" },
  { id: "2", title: "优化 5 个产品页 SEO", completed: false, priority: "high", category: "SEO" },
  { id: "3", title: "确认明日内容排期", completed: false, priority: "medium", category: "内容" },
  { id: "4", title: "更新春季新品上架", completed: true, priority: "medium", category: "店铺" },
  { id: "5", title: "联系 3 位达人合作", completed: false, priority: "low", category: "达人" },
  { id: "6", title: "分析本周广告 ROI", completed: false, priority: "medium", category: "广告" },
];
