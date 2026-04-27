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
  BarChart3,
  Truck,
  Users,
  Package,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  group?: string;
  /** 只有特定平台才显示（空 = 所有平台） */
  platforms?: string[];
  primary?: boolean;
  isNew?: boolean;
}

/**
 * 侧边栏导航结构 (v3 多店铺版)
 *
 * 设计原则：
 * 1. 每个店铺独立走一套完整流程：客户画像 → 竞品 → 流量 → 转化 → 店铺 → 广告 → 供应链
 * 2. 新增 3 大模块：PPC 广告 / 供应链采购 / 团队管理
 * 3. 全局模块（工作流 / 内容 / 系统）放在侧边栏下方，跨店铺共享
 * 4. 店铺切换通过 Sidebar 顶部的 Store Selector 控件完成
 */
export const NAV_ITEMS: NavItem[] = [
  // ── 当前店铺 ─────────────────────────────────────────────
  { label: "数据总览",   href: "/dashboard",     icon: LayoutDashboard, group: "当前店铺" },
  { label: "客户画像",   href: "/client-profile", icon: Brain,           group: "当前店铺", primary: true },
  { label: "竞品情报",   href: "/competitors",    icon: Swords,          group: "当前店铺", primary: true },
  { label: "流量指挥",   href: "/traffic",        icon: TrendingUp,      group: "当前店铺", primary: true },
  { label: "转化优化",   href: "/conversion",     icon: Target,          group: "当前店铺", primary: true },
  { label: "店铺优化",   href: "/store",          icon: Store,           group: "当前店铺" },
  { label: "PPC 广告",  href: "/ppc",            icon: BarChart3,       group: "当前店铺", isNew: true },
  { label: "社媒规划",   href: "/social",         icon: Share2,          group: "当前店铺" },
  { label: "供应链",     href: "/supply-chain",   icon: Truck,           group: "当前店铺", isNew: true },
  { label: "审批中心",   href: "/approvals",      icon: ClipboardCheck,  group: "当前店铺" },

  // ── 内容 ─────────────────────────────────────────────────
  { label: "内容工厂",   href: "/content",                icon: FileText,    group: "内容" },
  { label: "素材库",     href: "/media-library",          icon: ImagePlus,   group: "内容" },
  { label: "营销日历",   href: "/campaigns/calendar",     icon: CalendarDays,group: "内容" },

  // ── 团队 & 运营 ──────────────────────────────────────────
  { label: "团队管理",   href: "/team",           icon: Users,     group: "团队", isNew: true },
  { label: "工作流中心", href: "/workflows",      icon: Workflow,  group: "团队" },
  { label: "运行监控",   href: "/monitor",        icon: Activity,  group: "团队" },

  // ── 系统 ─────────────────────────────────────────────────
  { label: "品牌视觉",   href: "/brand-guide",    icon: Palette,   group: "系统" },
  { label: "Prompt 实验室", href: "/prompts",     icon: Beaker,    group: "系统" },
  { label: "AI 成本",    href: "/costs",          icon: DollarSign,group: "系统" },
  { label: "系统自检",   href: "/health",         icon: Shield,    group: "系统" },
  { label: "系统设置",   href: "/settings",       icon: Settings,  group: "系统" },
];

// 仅 Amazon 店铺展示的额外模块
export const AMAZON_ONLY_ITEMS: NavItem[] = [
  { label: "商品管理",   href: "/store/products", icon: Package, group: "当前店铺" },
];

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok:       "TikTok",
  tiktok_shop:  "TikTok Shop",
  instagram:    "Instagram",
  xiaohongshu:  "小红书",
  amazon:       "Amazon",
  shopify:      "Shopify",
  etsy:         "Etsy",
  walmart:      "Walmart",
  faire:        "Faire",
  independent:  "独立站",
};

export const STATUS_LABELS: Record<string, string> = {
  draft:         "草稿",
  pending:       "待审核",
  published:     "已发布",
  scheduled:     "已排期",
  rejected:      "已拒绝",
  active:        "在售",
  inactive:      "下架",
  out_of_stock:  "缺货",
  pending_review:"审核中",
  queued:        "排队中",
  failed:        "发布失败",
  approved:      "已批准",
  executed:      "已执行",
};
