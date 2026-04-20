import {
  FileText,
  Store,
  Share2,
  Settings,
  ClipboardCheck,
  Gauge,
  ImagePlus,
  LayoutDashboard,
  Beaker,
  DollarSign,
  Palette,
  Rocket,
  CalendarDays,
  Search,
  Activity,
  Shield,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // ── 总览 ──
  { label: "数据总览", href: "/dashboard", icon: LayoutDashboard, group: "总览" },
  { label: "运行监控", href: "/monitor", icon: Activity, group: "总览" },
  { label: "系统自检", href: "/health", icon: Shield, group: "总览" },

  // ── 运营中心（默认展开，全部真实功能）──
  { label: "运营驾驶舱", href: "/ops-cockpit", icon: Gauge, group: "运营中心" },
  { label: "店铺优化", href: "/store", icon: Store, group: "运营中心" },
  { label: "社媒规划", href: "/social", icon: Share2, group: "运营中心" },
  { label: "审批中心", href: "/approvals", icon: ClipboardCheck, group: "运营中心" },

  // ── 内容 ──
  { label: "内容工厂", href: "/content", icon: FileText, group: "内容" },
  { label: "素材库", href: "/media-library", icon: ImagePlus, group: "内容" },
  { label: "营销日历", href: "/campaigns/calendar", icon: CalendarDays, group: "内容" },
  { label: "Campaign Composer", href: "/campaigns/compose", icon: Rocket, group: "内容" },
  { label: "竞品拆解", href: "/references", icon: Search, group: "内容" },
  { label: "Prompt 实验室", href: "/prompts", icon: Beaker, group: "内容" },
  { label: "AI 成本看板", href: "/costs", icon: DollarSign, group: "内容" },

  // ── 系统 ──
  { label: "品牌指南", href: "/brand-guide", icon: Palette, group: "系统" },
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
