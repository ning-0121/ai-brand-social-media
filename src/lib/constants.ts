import {
  LayoutDashboard,
  Radar,
  FileText,
  Store,
  Share2,
  GraduationCap,
  Target,
  Video,
  Users,
  Megaphone,
  GitBranch,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "运营总览", href: "/dashboard", icon: LayoutDashboard, group: "核心" },
  { label: "趋势雷达", href: "/trends", icon: Radar, group: "核心" },
  { label: "内容工厂", href: "/content", icon: FileText, group: "核心" },
  { label: "店铺优化", href: "/store", icon: Store, group: "核心" },
  { label: "社媒规划", href: "/social", icon: Share2, group: "核心" },
  { label: "品牌策略", href: "/strategy", icon: Target, group: "增长" },
  { label: "直播中心", href: "/live", icon: Video, group: "增长" },
  { label: "达人中心", href: "/influencers", icon: Users, group: "增长" },
  { label: "广告投放", href: "/ads", icon: Megaphone, group: "增长" },
  { label: "渠道拓展", href: "/channels", icon: GitBranch, group: "增长" },
  { label: "技能包", href: "/skills", icon: GraduationCap, group: "学习" },
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
};
