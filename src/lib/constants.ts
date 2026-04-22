import {
  FileText,
  Store,
  Share2,
  Settings,
  ClipboardCheck,
  ImagePlus,
  LayoutDashboard,
  Beaker,
  DollarSign,
  Palette,
  CalendarDays,
  Activity,
  Shield,
  Workflow,
  Brain,
  Swords,
  TrendingUp,
  Target,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  primary?: boolean;
}

/**
 * 侧边栏结构（2026-04-20 重构后）
 *
 * 指导原则：
 * 1. 一个功能一个入口，不让用户困惑该点哪个
 * 2. 按「运营操盘 → 内容产出 → 诊断 & 系统」的实际工作流排序
 * 3. 数据展示层只留 2 个：数据总览（DB）+ 运行监控（工作流/任务）
 * 4. /ops-cockpit /mission-control 已隐藏（代码保留，职责已迁移）
 * 5. /brand-guide 重命名为「品牌视觉设置」，只负责色彩/字体/logo
 *    深度画像（人群/调性/经营理念/运营偏好）全部迁移到「客户画像」
 */
export const NAV_ITEMS: NavItem[] = [
  // ── 总览：只看结果，不做决策 ──
  { label: "数据总览", href: "/dashboard", icon: LayoutDashboard, group: "总览" },
  { label: "运行监控", href: "/monitor", icon: Activity, group: "总览" },
  { label: "系统自检", href: "/health", icon: Shield, group: "总览" },

  // ── 运营中心：真正做决策和执行的地方 ──
  { label: "客户画像", href: "/client-profile", icon: Brain, group: "运营中心", primary: true },
  { label: "工作流中心", href: "/workflows", icon: Workflow, group: "运营中心", primary: true },
  { label: "竞品情报", href: "/competitors", icon: Swords, group: "运营中心", primary: true },
  { label: "流量指挥", href: "/traffic", icon: TrendingUp, group: "运营中心", primary: true },
  { label: "转化优化", href: "/conversion", icon: Target, group: "运营中心", primary: true },
  { label: "店铺优化", href: "/store", icon: Store, group: "运营中心" },
  { label: "社媒规划", href: "/social", icon: Share2, group: "运营中心" },
  { label: "审批中心", href: "/approvals", icon: ClipboardCheck, group: "运营中心" },

  // ── 内容 ──
  { label: "内容工厂", href: "/content", icon: FileText, group: "内容" },
  { label: "素材库", href: "/media-library", icon: ImagePlus, group: "内容" },
  { label: "营销日历", href: "/campaigns/calendar", icon: CalendarDays, group: "内容" },
  { label: "Prompt 实验室", href: "/prompts", icon: Beaker, group: "内容" },
  { label: "AI 成本看板", href: "/costs", icon: DollarSign, group: "内容" },

  // ── 系统 ──
  { label: "品牌视觉", href: "/brand-guide", icon: Palette, group: "系统" },
  { label: "系统设置", href: "/settings", icon: Settings, group: "系统" },
];

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  xiaohongshu: "小红书",
  amazon: "Amazon",
  shopify: "Shopify",
  independent: "独立站",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "草稿",
  pending: "待审核",
  published: "已发布",
  scheduled: "已排期",
  rejected: "已拒绝",
  active: "在售",
  inactive: "下架",
  out_of_stock: "缺货",
  pending_review: "审核中",
  queued: "排队中",
  failed: "发布失败",
  approved: "已批准",
  executed: "已执行",
};
