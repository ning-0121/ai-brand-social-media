"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KPICard, KPICardGrid } from "@/components/shared/kpi-card";
import { PlatformIcon } from "@/components/shared/platform-icon";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, Handshake, Trash2 } from "lucide-react";
import { Platform, KPIData } from "@/lib/types";

/* ---------- KPI mock data ---------- */
const kpis: KPIData[] = [
  { label: "达人总数", value: 56, trend: "up", trendPercent: 12, icon: "Users", format: "number" },
  { label: "合作中", value: 12, trend: "up", trendPercent: 8, icon: "Handshake", format: "number" },
  { label: "待联系", value: 8, trend: "down", trendPercent: 5, icon: "PhoneCall", format: "number" },
  { label: "本月ROI", value: "4.2x", trend: "up", trendPercent: 15, icon: "TrendingUp" },
];

/* ---------- Influencer type ---------- */
type InfluencerStatus = "active" | "pending" | "inactive" | "rejected";

interface Influencer {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  platform: Platform;
  followers: string;
  category: string;
  engagementRate: string;
  priceRange: string;
  status: InfluencerStatus;
}

/* ---------- Status config for influencer-specific labels ---------- */
const INFLUENCER_STATUS_LABEL: Record<InfluencerStatus, string> = {
  active: "合作中",
  pending: "待联系",
  inactive: "已结束",
  rejected: "黑名单",
};

const INFLUENCER_STATUS_STYLE: Record<InfluencerStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  inactive: "bg-muted text-muted-foreground border-border",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

/* ---------- Avatar color palette ---------- */
const AVATAR_COLORS = [
  "bg-pink-500", "bg-blue-500", "bg-purple-500", "bg-orange-500",
  "bg-green-500", "bg-rose-500", "bg-amber-500", "bg-cyan-500",
  "bg-teal-500", "bg-fuchsia-500", "bg-indigo-500", "bg-red-500",
];

/* ---------- 10 mock influencers ---------- */
const MOCK_INFLUENCERS: Influencer[] = [
  {
    id: "1",
    name: "李美琪",
    initials: "李",
    avatarColor: "bg-pink-500",
    platform: "xiaohongshu",
    followers: "328k",
    category: "美妆",
    engagementRate: "6.8%",
    priceRange: "¥5,000 - ¥12,000",
    status: "active",
  },
  {
    id: "2",
    name: "王潮生",
    initials: "王",
    avatarColor: "bg-blue-500",
    platform: "tiktok",
    followers: "512k",
    category: "3C数码",
    engagementRate: "4.2%",
    priceRange: "¥8,000 - ¥20,000",
    status: "active",
  },
  {
    id: "3",
    name: "张小花",
    initials: "张",
    avatarColor: "bg-purple-500",
    platform: "instagram",
    followers: "89k",
    category: "服饰",
    engagementRate: "7.5%",
    priceRange: "¥2,000 - ¥6,000",
    status: "pending",
  },
  {
    id: "4",
    name: "陈大厨",
    initials: "陈",
    avatarColor: "bg-orange-500",
    platform: "tiktok",
    followers: "1.2k",
    category: "美食",
    engagementRate: "12.3%",
    priceRange: "¥500 - ¥1,500",
    status: "pending",
  },
  {
    id: "5",
    name: "刘健身",
    initials: "刘",
    avatarColor: "bg-green-500",
    platform: "xiaohongshu",
    followers: "156k",
    category: "健身",
    engagementRate: "5.1%",
    priceRange: "¥3,000 - ¥8,000",
    status: "active",
  },
  {
    id: "6",
    name: "赵时尚",
    initials: "赵",
    avatarColor: "bg-rose-500",
    platform: "instagram",
    followers: "245k",
    category: "服饰",
    engagementRate: "3.9%",
    priceRange: "¥6,000 - ¥15,000",
    status: "inactive",
  },
  {
    id: "7",
    name: "孙萌宠",
    initials: "孙",
    avatarColor: "bg-amber-500",
    platform: "tiktok",
    followers: "478k",
    category: "宠物",
    engagementRate: "9.7%",
    priceRange: "¥4,000 - ¥10,000",
    status: "active",
  },
  {
    id: "8",
    name: "周数码",
    initials: "周",
    avatarColor: "bg-cyan-500",
    platform: "xiaohongshu",
    followers: "67k",
    category: "3C数码",
    engagementRate: "4.8%",
    priceRange: "¥2,500 - ¥7,000",
    status: "pending",
  },
  {
    id: "9",
    name: "吴旅行",
    initials: "吴",
    avatarColor: "bg-teal-500",
    platform: "instagram",
    followers: "192k",
    category: "旅行",
    engagementRate: "5.6%",
    priceRange: "¥5,000 - ¥12,000",
    status: "rejected",
  },
  {
    id: "10",
    name: "郑美妆",
    initials: "郑",
    avatarColor: "bg-fuchsia-500",
    platform: "tiktok",
    followers: "305k",
    category: "美妆",
    engagementRate: "6.1%",
    priceRange: "¥7,000 - ¥18,000",
    status: "active",
  },
];

const INITIAL_FORM = {
  name: "",
  platform: "tiktok" as Platform,
  followers: "",
  category: "",
  engagementRate: "",
  priceRange: "",
};

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>(MOCK_INFLUENCERS);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  /* ---- Create ---- */
  const handleCreate = () => {
    if (!formData.name.trim()) return;
    const newInfluencer: Influencer = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      initials: formData.name.trim().charAt(0),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      platform: formData.platform,
      followers: formData.followers || "0",
      category: formData.category || "未分类",
      engagementRate: formData.engagementRate || "0%",
      priceRange: formData.priceRange || "待定",
      status: "pending",
    };
    setInfluencers((prev) => [newInfluencer, ...prev]);
    setShowCreateDialog(false);
    setFormData(INITIAL_FORM);
  };

  /* ---- Delete ---- */
  const handleDelete = (id: string) => {
    setInfluencers((prev) => prev.filter((i) => i.id !== id));
  };

  const filtered = influencers.filter((inf) => {
    const matchesName = inf.name.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform =
      platformFilter === "all" || inf.platform === platformFilter;
    return matchesName && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="达人中心"
        description="管理达人资源与合作关系"
        actions={
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            添加达人
          </Button>
        }
      />

      {/* KPI Cards */}
      <KPICardGrid>
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </KPICardGrid>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索达人名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={(v) => v && setPlatformFilter(v)}>
          <SelectTrigger>
            <SelectValue placeholder="全部平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="xiaohongshu">小红书</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Influencer Card Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((inf) => (
          <Card key={inf.id} className="transition-shadow hover:shadow-sm">
            <CardContent className="p-4 space-y-3">
              {/* Top: Avatar + Name + Platform */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm ${inf.avatarColor}`}
                >
                  {inf.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">
                      {inf.name}
                    </span>
                    <PlatformIcon platform={inf.platform} showLabel />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inf.followers} 粉丝
                  </p>
                </div>
              </div>

              {/* Category + Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{inf.category}</Badge>
                <Badge
                  variant="outline"
                  className={INFLUENCER_STATUS_STYLE[inf.status]}
                >
                  {INFLUENCER_STATUS_LABEL[inf.status]}
                </Badge>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  互动率{" "}
                  <span className="font-medium text-foreground">
                    {inf.engagementRate}
                  </span>
                </span>
                <span>
                  报价{" "}
                  <span className="font-medium text-foreground">
                    {inf.priceRange}
                  </span>
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  查看详情
                </Button>
                <Button size="sm" className="flex-1">
                  <Handshake className="mr-1.5 h-3.5 w-3.5" />
                  发起合作
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(inf.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            未找到匹配的达人，请调整搜索条件
          </p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加达人</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 达人名称 */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">达人名称</label>
              <Input
                placeholder="输入达人名称"
                value={formData.name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            {/* 平台 */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">平台</label>
              <Select
                value={formData.platform}
                onValueChange={(v) =>
                  v && setFormData((f) => ({ ...f, platform: v as Platform }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择平台" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="xiaohongshu">小红书</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 粉丝数 */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">粉丝数</label>
              <Input
                placeholder="例如: 128k"
                value={formData.followers}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, followers: e.target.value }))
                }
              />
            </div>

            {/* 品类 */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">品类</label>
              <Input
                placeholder="例如: 美妆、3C数码"
                value={formData.category}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>

            {/* 互动率 */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">互动率</label>
              <Input
                placeholder="例如: 6.8%"
                value={formData.engagementRate}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, engagementRate: e.target.value }))
                }
              />
            </div>

            {/* 报价范围 */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">报价范围</label>
              <Input
                placeholder="例如: ¥5,000 - ¥12,000"
                value={formData.priceRange}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, priceRange: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
