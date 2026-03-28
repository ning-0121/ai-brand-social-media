import {
  LayoutDashboard,
  Radar,
  FileText,
  Store,
  Share2,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "运营总览", href: "/dashboard", icon: LayoutDashboard },
  { label: "趋势雷达", href: "/trends", icon: Radar },
  { label: "内容工厂", href: "/content", icon: FileText },
  { label: "店铺优化", href: "/store", icon: Store },
  { label: "社媒规划", href: "/social", icon: Share2 },
  { label: "技能包", href: "/skills", icon: GraduationCap },
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
};
